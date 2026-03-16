/**
 * Test Database Utilities
 *
 * Provides utilities for setting up and managing test databases.
 * Uses in-memory SQLite for fast, isolated testing.
 */

import { Database } from "bun:sqlite";
import type { MemoryFact, MemoryRow } from "../../src/types/memory";

/**
 * Create an in-memory test database with schema
 */
export function createTestDatabase(): Database {
  const db = new Database(":memory:");

  // Create memory_facts table
  db.run(`
    CREATE TABLE IF NOT EXISTS memory_facts (
      id TEXT PRIMARY KEY,
      uri TEXT UNIQUE NOT NULL,
      topic TEXT NOT NULL,
      content_toon TEXT NOT NULL,
      content_raw TEXT NOT NULL,
      vector BLOB,
      bin_id INTEGER DEFAULT 0,
      importance_score REAL DEFAULT 0.5,
      status TEXT DEFAULT 'active',
      access_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      archived_at TEXT,
      reviewed_at TEXT,
      metadata TEXT
    )
  `);

  // Create indexes for better query performance
  db.run("CREATE INDEX IF NOT EXISTS idx_topic ON memory_facts(topic)");
  db.run("CREATE INDEX IF NOT EXISTS idx_status ON memory_facts(status)");
  db.run("CREATE INDEX IF NOT EXISTS idx_importance ON memory_facts(importance_score)");
  db.run("CREATE INDEX IF NOT EXISTS idx_bin ON memory_facts(bin_id)");

  // Create decay_log table for tracking decay operations
  db.run(`
    CREATE TABLE IF NOT EXISTS decay_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at TEXT NOT NULL DEFAULT (datetime('now')),
      memories_archived INTEGER DEFAULT 0,
      memories_deleted INTEGER DEFAULT 0,
      memories_kept INTEGER DEFAULT 0,
      duration_ms INTEGER,
      config_json TEXT
    )
  `);

  // Create index on decay_log for faster queries
  db.run("CREATE INDEX IF NOT EXISTS idx_decay_log_run_at ON decay_log(run_at)");

  return db;
}

/**
 * Insert a memory into the test database
 */
export function insertTestMemory(db: Database, memory: MemoryFact): void {
  const stmt = db.prepare(`
    INSERT INTO memory_facts (
      id, uri, topic, content_toon, content_raw, vector, bin_id,
      importance_score, status, access_count, created_at, updated_at,
      archived_at, metadata
    ) VALUES (
      $id, $uri, $topic, $content_toon, $content_raw, $vector, $bin_id,
      $importance_score, $status, $access_count, $created_at, $updated_at,
      $archived_at, $metadata
    )
  `);

  stmt.run({
    $id: memory.id,
    $uri: memory.uri,
    $topic: memory.topic,
    $content_toon: memory.content_toon,
    $content_raw: memory.content_raw,
    $vector: memory.vector ? Buffer.from(new Float32Array(memory.vector).buffer) : null,
    $bin_id: memory.bin_id,
    $importance_score: memory.importance_score,
    $status: memory.status,
    $access_count: memory.access_count,
    $created_at: memory.created_at.toISOString(),
    $updated_at: memory.updated_at.toISOString(),
    $archived_at: memory.archived_at?.toISOString() || null,
    $metadata: memory.metadata ? JSON.stringify(memory.metadata) : null,
  });
}

/**
 * Insert multiple memories into the test database
 */
export function insertTestMemories(db: Database, memories: MemoryFact[]): void {
  const transaction = db.transaction(() => {
    for (const memory of memories) {
      insertTestMemory(db, memory);
    }
  });

  transaction();
}

/**
 * Get all memories from the test database
 */
export function getAllTestMemories(db: Database): MemoryRow[] {
  const stmt = db.prepare<MemoryRow, []>(`
    SELECT * FROM memory_facts ORDER BY created_at DESC
  `);

  return stmt.all() as MemoryRow[];
}

/**
 * Get memory by ID from the test database
 */
export function getTestMemoryById(db: Database, id: string): MemoryRow | null {
  const stmt = db.prepare<MemoryRow, [string]>(`
    SELECT * FROM memory_facts WHERE id = ?
  `);

  return stmt.get(id);
}

/**
 * Clear all memories from the test database
 */
export function clearTestDatabase(db: Database): void {
  db.run("DELETE FROM memory_facts");
}

/**
 * Close the test database
 */
export function closeTestDatabase(db: Database): void {
  db.close();
}

/**
 * Create a test database with sample data
 */
export function createTestDatabaseWithSampleData(sampleData: MemoryFact[] = []): Database {
  const db = createTestDatabase();

  if (sampleData.length > 0) {
    insertTestMemories(db, sampleData);
  }

  return db;
}

/**
 * Test database fixture with lifecycle management
 */
export class TestDatabaseFixture {
  private db: Database | null = null;

  /**
   * Setup test database before tests
   */
  setup(sampleData: MemoryFact[] = []): Database {
    this.db = createTestDatabaseWithSampleData(sampleData);
    return this.db;
  }

  /**
   * Get the database instance
   */
  getDatabase(): Database {
    if (!this.db) {
      throw new Error("Database not initialized. Call setup() first.");
    }
    return this.db;
  }

  /**
   * Clear all data between tests
   */
  clear(): void {
    if (this.db) {
      clearTestDatabase(this.db);
    }
  }

  /**
   * Cleanup after tests
   */
  teardown(): void {
    if (this.db) {
      closeTestDatabase(this.db);
      this.db = null;
    }
  }

  /**
   * Insert test data
   */
  insertData(memories: MemoryFact[]): void {
    if (!this.db) {
      throw new Error("Database not initialized. Call setup() first.");
    }
    insertTestMemories(this.db, memories);
  }

  /**
   * Get all data for assertions
   */
  getAllData(): MemoryRow[] {
    if (!this.db) {
      throw new Error("Database not initialized. Call setup() first.");
    }
    return getAllTestMemories(this.db);
  }
}

/**
 * Helper to convert MemoryRow to MemoryFact
 */
export function rowToMemory(row: MemoryRow): MemoryFact {
  let metadata = undefined;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = undefined;
    }
  }

  let vector = undefined;
  if (row.vector) {
    try {
      const buffer = row.vector as Buffer;
      const float32Array = new Float32Array(buffer.buffer);
      vector = Array.from(float32Array);
    } catch {
      vector = undefined;
    }
  }

  return {
    id: row.id,
    uri: row.uri,
    topic: row.topic,
    content_toon: row.content_toon,
    content_raw: row.content_raw,
    vector,
    bin_id: row.bin_id,
    importance_score: row.importance_score,
    status: row.status as MemoryFact["status"],
    access_count: row.access_count,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    archived_at: row.archived_at ? new Date(row.archived_at) : undefined,
    metadata,
  };
}

/**
 * Helper to assert database state
 */
export function assertDatabaseCount(db: Database, expected: number): void {
  const stmt = db.prepare<{ count: number }, []>(`
    SELECT COUNT(*) as count FROM memory_facts
  `);

  const result = stmt.get();
  const actual = result?.count ?? 0;

  if (actual !== expected) {
    throw new Error(`Expected ${expected} memories in database, but found ${actual}`);
  }
}

/**
 * Helper to assert memory exists in database
 */
export function assertMemoryExists(db: Database, id: string): MemoryRow {
  const memory = getTestMemoryById(db, id);

  if (!memory) {
    throw new Error(`Memory with id ${id} not found in database`);
  }

  return memory;
}

/**
 * Helper to assert memory does not exist in database
 */
export function assertMemoryNotExists(db: Database, id: string): void {
  const memory = getTestMemoryById(db, id);

  if (memory) {
    throw new Error(`Memory with id ${id} should not exist in database`);
  }
}
