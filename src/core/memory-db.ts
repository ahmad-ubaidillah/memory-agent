/**
 * Memory Database Module
 *
 * Provides CRUD operations for memory storage and retrieval using SQLite.
 * Supports both Full AI Mode (with embeddings) and Lite Mode (keyword search).
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { DatabaseError, ValidationError } from "../errors/types";
import type {
  MemoryFact,
  MemoryMetadata,
  MemoryQueryResult,
  MemoryRow,
  MemoryStatus,
} from "../types/memory";

/**
 * Input for storing a new memory
 */
export interface StoreMemoryInput {
  content: string;
  topic?: string;
  importance?: number;
  metadata?: MemoryMetadata;
  vector?: number[];
}

/**
 * Input for querying memories
 */
export interface QueryMemoriesInput {
  query: string;
  limit?: number;
  topic?: string;
  minImportance?: number;
  maxImportance?: number;
  status?: MemoryStatus;
  useVectorSearch?: boolean;
  vector?: number[];
}

/**
 * Input for updating a memory
 */
export interface UpdateMemoryInput {
  memoryId: string;
  content?: string;
  topic?: string;
  importance?: number;
  status?: MemoryStatus;
  metadata?: MemoryMetadata;
  vector?: number[];
}

/**
 * Ensure the memory_facts table exists
 */
export function ensureMemoryTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_facts (
      id TEXT PRIMARY KEY,
      uri TEXT UNIQUE NOT NULL,
      topic TEXT NOT NULL,
      content_toon TEXT NOT NULL,
      content_raw TEXT NOT NULL,
      vector BLOB,
      bin_id INTEGER NOT NULL DEFAULT 0,
      importance_score REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'active',
      access_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      metadata TEXT
    )
  `);

  // Create indexes for common queries
  db.run("CREATE INDEX IF NOT EXISTS idx_memory_topic ON memory_facts(topic)");
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_memory_status ON memory_facts(status)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_facts(importance_score)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_memory_created ON memory_facts(created_at)",
  );
}

/**
 * Generate a unique memory ID
 */
export function generateMemoryId(): string {
  return `mem_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;
}

/**
 * Generate URI for a memory
 */
export function generateMemoryUri(id: string, topic: string): string {
  return `memory://project/fact/${id}`;
}

/**
 * Calculate bin ID for vector partitioning (simplified)
 */
export function calculateBinId(vector?: number[]): number {
  if (!vector || vector.length === 0) {
    return 0;
  }
  // Simple hash-based bin assignment
  let sum = 0;
  for (let i = 0; i < Math.min(vector.length, 10); i++) {
    sum += Math.abs(vector[i] || 0);
  }
  return Math.floor(sum * 10) % 100;
}

/**
 * Convert MemoryRow to MemoryFact
 */
export function rowToMemory(row: MemoryRow): MemoryFact {
  return {
    id: row.id,
    uri: row.uri,
    topic: row.topic,
    content_toon: row.content_toon,
    content_raw: row.content_raw,
    vector: row.vector ? Array.from(new Float32Array(row.vector)) : undefined,
    bin_id: row.bin_id,
    importance_score: row.importance_score,
    status: row.status as MemoryStatus,
    access_count: row.access_count,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    archived_at: row.archived_at ? new Date(row.archived_at) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

/**
 * Store a new memory
 */
export function storeMemory(
  db: Database,
  input: StoreMemoryInput,
): Result<MemoryFact, DatabaseError | ValidationError> {
  // Validate input
  if (!input.content || input.content.trim().length === 0) {
    return err(new ValidationError("Memory content cannot be empty"));
  }

  try {
    const id = generateMemoryId();
    const topic = input.topic || "general";
    const uri = generateMemoryUri(id, topic);
    const contentToon = input.content.substring(0, 200); // Simple TOON: first 200 chars
    const importance = input.importance ?? 0.5;
    const binId = calculateBinId(input.vector);
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
    const vectorBuffer = input.vector
      ? Buffer.from(new Float32Array(input.vector).buffer)
      : null;

    const stmt = db.prepare(`
      INSERT INTO memory_facts (
        id, uri, topic, content_toon, content_raw, vector, bin_id,
        importance_score, status, access_count, metadata
      ) VALUES (
        $id, $uri, $topic, $contentToon, $contentRaw, $vector, $binId,
        $importance, 'active', 0, $metadata
      )
    `);

    stmt.run({
      id,
      uri,
      topic,
      contentToon,
      contentRaw: input.content,
      vector: vectorBuffer,
      binId,
      importance,
      metadata: metadataJson,
    } as any);

    // Fetch the created memory
    const memory = getMemoryById(db, id);
    if (memory.isErr()) {
      return err(memory.error);
    }

    return ok(memory.value!);
  } catch (error) {
    return err(
      new DatabaseError("Failed to store memory", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Get memory by ID
 */
export function getMemoryById(
  db: Database,
  id: string,
): Result<MemoryFact | null, DatabaseError> {
  try {
    const stmt = db.prepare<MemoryRow, [string]>(`
      SELECT * FROM memory_facts WHERE id = ?
    `);

    const row = stmt.get(id);

    if (!row) {
      return ok(null);
    }

    // Increment access count
    db.run(
      "UPDATE memory_facts SET access_count = access_count + 1 WHERE id = ?",
      [id],
    );

    return ok(rowToMemory(row));
  } catch (error) {
    return err(
      new DatabaseError("Failed to get memory", {
        error: error instanceof Error ? error.message : String(error),
        id,
      }),
    );
  }
}

/**
 * Query memories using keyword search (Lite Mode) or vector search (Full AI Mode)
 */
export function queryMemories(
  db: Database,
  input: QueryMemoriesInput,
): Result<MemoryQueryResult[], DatabaseError> {
  try {
    const limit = input.limit ?? 10;
    const results: MemoryQueryResult[] = [];

    // Build query based on mode
    if (input.useVectorSearch && input.vector) {
      // Full AI Mode: Vector similarity search
      // For now, we'll do a simplified version - in production, this would use proper vector indexing
      const vectorBuffer = Buffer.from(new Float32Array(input.vector).buffer);

      let sql = `
        SELECT *, (
          SELECT COUNT(*) FROM memory_facts m2
          WHERE m2.topic LIKE $topicPattern
        ) as relevance
        FROM memory_facts
        WHERE status = 'active'
      `;
      const params: Record<string, unknown> = {
        topicPattern: input.topic ? `${input.topic}%` : "%",
      };

      if (input.topic) {
        sql += " AND topic = $topic";
        params.topic = input.topic;
      }

      if (input.minImportance !== undefined) {
        sql += " AND importance_score >= $minImportance";
        params.minImportance = input.minImportance;
      }

      sql += " ORDER BY importance_score DESC, access_count DESC LIMIT $limit";
      params.limit = limit;

      const stmt = db.prepare(sql);
      const rows = stmt.all(params as any);

      for (const row of rows as MemoryRow[]) {
        // Calculate simple similarity score (placeholder for actual vector similarity)
        const score =
          0.5 + row.importance_score * 0.3 + (row.access_count > 0 ? 0.2 : 0);

        results.push({
          id: row.id,
          content: row.content_raw,
          topic: row.topic,
          score: Math.min(score, 1.0),
          importance: row.importance_score,
          created_at: row.created_at,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        });
      }
    } else {
      // Lite Mode: Keyword search
      const searchTerms = input.query
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 2);

      if (searchTerms.length === 0) {
        return ok([]);
      }

      // Build LIKE clauses for each search term
      const likeClauses = searchTerms
        .map((_, i) => `(content_raw LIKE $term${i} OR topic LIKE $term${i})`)
        .join(" OR ");
      const params: Record<string, unknown> = {};

      searchTerms.forEach((term, i) => {
        params[`term${i}`] = `%${term}%`;
      });

      if (input.topic) {
        params.topic = input.topic;
      }

      if (input.minImportance !== undefined) {
        params.minImportance = input.minImportance;
      }

      params.limit = limit;

      let sql = `
        SELECT * FROM memory_facts
        WHERE status = 'active'
          AND (${likeClauses})
      `;

      if (input.topic) {
        sql += " AND topic = $topic";
      }

      if (input.minImportance !== undefined) {
        sql += " AND importance_score >= $minImportance";
      }

      sql += " ORDER BY importance_score DESC, access_count DESC LIMIT $limit";

      const stmt = db.prepare(sql);
      const rows = stmt.all(params as any);

      for (const row of rows as MemoryRow[]) {
        // Calculate relevance score based on keyword matches
        const content = row.content_raw.toLowerCase();
        const matchCount = searchTerms.filter((term) =>
          content.includes(term),
        ).length;
        const score =
          (matchCount / searchTerms.length) * 0.6 + row.importance_score * 0.4;

        results.push({
          id: row.id,
          content: row.content_raw,
          topic: row.topic,
          score: Math.min(score, 1.0),
          importance: row.importance_score,
          created_at: row.created_at,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return ok(results.slice(0, limit));
  } catch (error) {
    return err(
      new DatabaseError("Failed to query memories", {
        error: error instanceof Error ? error.message : String(error),
        query: input.query,
      }),
    );
  }
}

/**
 * Update a memory
 */
export function updateMemory(
  db: Database,
  input: UpdateMemoryInput,
): Result<MemoryFact, DatabaseError | ValidationError> {
  try {
    // Check if memory exists
    const existing = getMemoryById(db, input.memoryId);
    if (existing.isErr()) {
      return err(existing.error);
    }

    if (!existing.value) {
      return err(new ValidationError(`Memory not found: ${input.memoryId}`));
    }

    // Build update query dynamically
    const updates: string[] = ["updated_at = datetime('now')"];
    const params: Record<string, unknown> = { id: input.memoryId };

    if (input.content !== undefined) {
      updates.push("content_raw = $content");
      updates.push("content_toon = $contentToon");
      params.content = input.content;
      params.contentToon = input.content.substring(0, 200);
    }

    if (input.topic !== undefined) {
      updates.push("topic = $topic");
      params.topic = input.topic;
    }

    if (input.importance !== undefined) {
      updates.push("importance_score = $importance");
      params.importance = input.importance;
    }

    if (input.status !== undefined) {
      updates.push("status = $status");
      params.status = input.status;

      if (input.status === "archived") {
        updates.push("archived_at = datetime('now')");
      }
    }

    if (input.metadata !== undefined) {
      updates.push("metadata = $metadata");
      params.metadata = JSON.stringify(input.metadata);
    }

    if (input.vector !== undefined) {
      updates.push("vector = $vector");
      updates.push("bin_id = $binId");
      params.vector = input.vector
        ? Buffer.from(new Float32Array(input.vector).buffer)
        : null;
      params.binId = calculateBinId(input.vector);
    }

    const sql = `UPDATE memory_facts SET ${updates.join(", ")} WHERE id = $id`;
    const stmt = db.prepare(sql);
    stmt.run(params as any);

    // Fetch updated memory
    const updated = getMemoryById(db, input.memoryId);
    if (updated.isErr()) {
      return err(updated.error);
    }

    return ok(updated.value!);
  } catch (error) {
    return err(
      new DatabaseError("Failed to update memory", {
        error: error instanceof Error ? error.message : String(error),
        memoryId: input.memoryId,
      }),
    );
  }
}

/**
 * Delete a memory
 */
export function deleteMemory(
  db: Database,
  id: string,
): Result<boolean, DatabaseError> {
  try {
    const stmt = db.prepare("DELETE FROM memory_facts WHERE id = ?");
    const result = stmt.run(id);

    return ok(result.changes > 0);
  } catch (error) {
    return err(
      new DatabaseError("Failed to delete memory", {
        error: error instanceof Error ? error.message : String(error),
        id,
      }),
    );
  }
}

/**
 * List memories with filters
 */
export function listMemories(
  db: Database,
  filters?: {
    topic?: string;
    status?: MemoryStatus;
    minImportance?: number;
    maxImportance?: number;
    limit?: number;
    offset?: number;
  },
): Result<MemoryFact[], DatabaseError> {
  try {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;

    if (filters?.topic) {
      conditions.push("topic = $topic");
      params.topic = filters.topic;
    }

    if (filters?.status) {
      conditions.push("status = $status");
      params.status = filters.status;
    }

    if (filters?.minImportance !== undefined) {
      conditions.push("importance_score >= $minImportance");
      params.minImportance = filters.minImportance;
    }

    if (filters?.maxImportance !== undefined) {
      conditions.push("importance_score <= $maxImportance");
      params.maxImportance = filters.maxImportance;
    }

    params.limit = limit;
    params.offset = offset;

    let sql = "SELECT * FROM memory_facts";
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC LIMIT $limit OFFSET $offset";

    const stmt = db.prepare(sql);
    const rows = stmt.all(params as any);

    return ok((rows as MemoryRow[]).map(rowToMemory));
  } catch (error) {
    return err(
      new DatabaseError("Failed to list memories", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Get memory statistics
 */
export function getMemoryStats(db: Database): Result<
  {
    total: number;
    active: number;
    archived: number;
    pending: number;
    byTopic: Record<string, number>;
    averageImportance: number;
  },
  DatabaseError
> {
  try {
    // Get counts by status
    const countStmt = db.prepare<{ status: string; count: number }, []>(
      `SELECT status, COUNT(*) as count FROM memory_facts GROUP BY status`,
    );

    const counts = countStmt.all();

    let total = 0;
    let active = 0;
    let archived = 0;
    let pending = 0;

    for (const row of counts) {
      total += row.count;
      if (row.status === "active") active = row.count;
      else if (row.status === "archived") archived = row.count;
      else if (row.status === "pending") pending = row.count;
    }

    // Get counts by topic
    const topicStmt = db.prepare<{ topic: string; count: number }, []>(
      "SELECT topic, COUNT(*) as count FROM memory_facts WHERE status = 'active' GROUP BY topic",
    );

    const topicCounts = topicStmt.all();
    const byTopic: Record<string, number> = {};
    for (const row of topicCounts) {
      byTopic[row.topic] = row.count;
    }

    // Get average importance
    const avgStmt = db.prepare<{ avg: number }, []>(
      "SELECT AVG(importance_score) as avg FROM memory_facts WHERE status = 'active'",
    );

    const avgResult = avgStmt.get();
    const averageImportance = avgResult?.avg ?? 0;

    return ok({
      total,
      active,
      archived,
      pending,
      byTopic,
      averageImportance,
    });
  } catch (error) {
    return err(
      new DatabaseError("Failed to get memory stats", {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
