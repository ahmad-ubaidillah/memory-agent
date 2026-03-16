/**
 * Core Decay Logic for Memory-Agent MCP Server
 *
 * Implements intelligent memory decay algorithm that:
 * - Reduces importance scores over time
 * - Archives low-importance memories
 * - Deletes garbage memories
 * - Logs all decay operations
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";
import { DatabaseError, ValidationError } from "../errors/types";
import type { DecayConfig, MemoryFact, MemoryRow } from "../types/memory";

/**
 * Default decay configuration
 */
export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  decay_factor: 0.95,
  archive_threshold: 0.2,
  delete_threshold: 0.05,
  garbage_age_days: 30,
};

/**
 * Decay configuration schema for validation
 */
export const DecayConfigSchema = z.object({
  decay_factor: z.number().min(0).max(1).default(0.95),
  archive_threshold: z.number().min(0).max(1).default(0.2),
  delete_threshold: z.number().min(0).max(1).default(0.05),
  garbage_age_days: z.number().int().min(1).default(30),
});

/**
 * Result of a decay operation
 */
export interface DecayResult {
  /** Whether the decay operation succeeded */
  success: boolean;

  /** Total number of memories processed */
  total_processed: number;

  /** Number of memories archived */
  archived: number;

  /** Number of memories deleted */
  deleted: number;

  /** Number of memories kept active */
  kept: number;

  /** Duration of the decay run in milliseconds */
  duration_ms: number;

  /** Configuration used for this decay run */
  config_used: DecayConfig;
}

/**
 * Statistics about a decay run
 */
export interface DecayStats {
  /** Total memories processed */
  total_processed: number;

  /** Memories archived */
  archived: number;

  /** Memories deleted */
  deleted: number;

  /** Memories kept */
  kept: number;
}

/**
 * Decay log entry for tracking decay runs
 */
export interface DecayLogEntry {
  /** Unique ID of the log entry */
  id: number;

  /** When the decay run occurred */
  run_at: string;

  /** Number of memories archived */
  memories_archived: number;

  /** Number of memories deleted */
  memories_deleted: number;

  /** Number of memories kept */
  memories_kept: number;

  /** Duration in milliseconds */
  duration_ms: number;

  /** JSON string of config used */
  config_json: string;
}

/**
 * Check if a memory is garbage (should be deleted)
 *
 * A memory is considered garbage if:
 * - It has never been accessed (access_count = 0)
 * - It is older than garbage_age_days
 * - It has no important metadata (no decision_date, project, or critical flag)
 */
export function isGarbage(memory: MemoryFact, garbageAgeDays: number): boolean {
  const ageInDays = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60 * 24);

  const hasImportantMetadata =
    memory.metadata?.decision_date !== undefined ||
    memory.metadata?.project !== undefined ||
    memory.metadata?.critical === true;

  return memory.access_count === 0 && ageInDays > garbageAgeDays && !hasImportantMetadata;
}

/**
 * Calculate the final decayed score for a memory
 *
 * Algorithm:
 * 1. Apply decay factor to importance score
 * 2. Add access bonus (capped at 0.5)
 * 3. Return final score
 */
export function calculateDecayedScore(memory: MemoryFact, decayFactor: number): number {
  // Apply decay factor
  const decayedScore = memory.importance_score * decayFactor;

  // Calculate access bonus (min of access_count * 0.01 and 0.5)
  const accessBonus = Math.min(memory.access_count * 0.01, 0.5);

  // Final score
  const finalScore = decayedScore + accessBonus;

  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, finalScore));
}

/**
 * Run the decay algorithm on all active memories
 *
 * This is the main decay function that:
 * 1. Fetches all active memories
 * 2. Calculates new decayed scores
 * 3. Archives low-importance memories
 * 4. Deletes garbage memories
 * 5. Logs the decay run
 *
 * @param db - SQLite database instance
 * @param config - Decay configuration (uses defaults if not provided)
 * @returns Result with decay statistics or error
 */
export function runDecay(
  db: Database,
  config: Partial<DecayConfig> = {}
): Result<DecayResult, DatabaseError> {
  const startTime = Date.now();

  // Merge with defaults
  const fullConfig: DecayConfig = {
    ...DEFAULT_DECAY_CONFIG,
    ...config,
  };

  const stats: DecayStats = {
    total_processed: 0,
    archived: 0,
    deleted: 0,
    kept: 0,
  };

  try {
    // Get all active memories
    const getActiveMemories = db.prepare<MemoryRow, []>(`
      SELECT * FROM memory_facts WHERE status = 'active'
    `);

    const memories = getActiveMemories.all();
    stats.total_processed = memories.length;

    // Prepare statements
    const updateScore = db.prepare(`
      UPDATE memory_facts
      SET importance_score = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const archiveMemory = db.prepare(`
      UPDATE memory_facts
      SET status = 'archived',
          archived_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `);

    const deleteMemory = db.prepare(`
      DELETE FROM memory_facts WHERE id = ?
    `);

    // Process in transaction
    const processDecay = db.transaction(() => {
      for (const row of memories) {
        // Convert row to MemoryFact
        // Build object with required and optional properties
        const memory = Object.assign(
          {
            id: row.id,
            uri: row.uri,
            topic: row.topic,
            content_toon: row.content_toon,
            content_raw: row.content_raw,
            bin_id: row.bin_id,
            importance_score: row.importance_score,
            status: row.status as MemoryFact["status"],
            access_count: row.access_count,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
          },
          row.metadata ? { metadata: JSON.parse(row.metadata) } : {},
          row.archived_at ? { archived_at: new Date(row.archived_at) } : {}
        );

        // Calculate new score - use type assertion to satisfy exactOptionalPropertyTypes
        const newScore = calculateDecayedScore(memory as MemoryFact, fullConfig.decay_factor);

        // Update importance score
        updateScore.run(newScore, memory.id);

        // Check if should archive or delete
        if (newScore < fullConfig.archive_threshold) {
          // Check if garbage and should delete
          if (
            isGarbage(memory, fullConfig.garbage_age_days) &&
            newScore < fullConfig.delete_threshold
          ) {
            deleteMemory.run(memory.id);
            stats.deleted++;
          } else {
            archiveMemory.run(memory.id);
            stats.archived++;
          }
        } else {
          stats.kept++;
        }
      }
    });

    processDecay();

    const duration_ms = Date.now() - startTime;

    // Log the decay run
    const logDecayRun = db.prepare(`
      INSERT INTO decay_log (
        memories_archived,
        memories_deleted,
        memories_kept,
        duration_ms,
        config_json
      ) VALUES (?, ?, ?, ?, ?)
    `);

    logDecayRun.run(
      stats.archived,
      stats.deleted,
      stats.kept,
      duration_ms,
      JSON.stringify(fullConfig)
    );

    return ok({
      success: true,
      total_processed: stats.total_processed,
      archived: stats.archived,
      deleted: stats.deleted,
      kept: stats.kept,
      duration_ms,
      config_used: fullConfig,
    });
  } catch (error) {
    return err(
      new DatabaseError("Failed to run decay operation", {
        error: error instanceof Error ? error.message : String(error),
        config: fullConfig,
      })
    );
  }
}

/**
 * Get decay history from the decay_log table
 *
 * @param db - SQLite database instance
 * @param limit - Maximum number of entries to return (default: 10)
 * @returns Result with decay log entries or error
 */
export function getDecayHistory(db: Database, limit = 10): Result<DecayLogEntry[], DatabaseError> {
  try {
    const stmt = db.prepare<DecayLogEntry, [number]>(`
      SELECT * FROM decay_log
      ORDER BY run_at DESC
      LIMIT ?
    `);

    const entries = stmt.all(limit);
    return ok(entries);
  } catch (error) {
    return err(
      new DatabaseError("Failed to get decay history", {
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Validate decay configuration
 *
 * @param config - Partial decay configuration to validate
 * @returns Result with validated config or validation error
 */
export function validateDecayConfig(config: unknown): Result<DecayConfig, ValidationError> {
  const result = DecayConfigSchema.safeParse(config);

  if (!result.success) {
    return err(
      new ValidationError("Invalid decay configuration", {
        errors: result.error.errors,
      })
    );
  }

  return ok(result.data);
}

/**
 * Get current memory statistics for decay analysis
 *
 * @param db - SQLite database instance
 * @returns Result with memory statistics or error
 */
export function getMemoryStats(db: Database): Result<
  {
    total: number;
    active: number;
    archived: number;
    averageImportance: number;
    neverAccessed: number;
  },
  DatabaseError
> {
  try {
    // Get total count
    const totalStmt = db.prepare<{ count: number }, []>(`
      SELECT COUNT(*) as count FROM memory_facts
    `);
    const total = totalStmt.get()?.count ?? 0;

    // Get active count
    const activeStmt = db.prepare<{ count: number }, []>(`
      SELECT COUNT(*) as count FROM memory_facts WHERE status = 'active'
    `);
    const active = activeStmt.get()?.count ?? 0;

    // Get archived count
    const archivedStmt = db.prepare<{ count: number }, []>(`
      SELECT COUNT(*) as count FROM memory_facts WHERE status = 'archived'
    `);
    const archived = archivedStmt.get()?.count ?? 0;

    // Get average importance
    const avgStmt = db.prepare<{ avg: number }, []>(`
      SELECT AVG(importance_score) as avg FROM memory_facts WHERE status = 'active'
    `);
    const averageImportance = avgStmt.get()?.avg ?? 0;

    // Get never accessed count
    const neverAccessedStmt = db.prepare<{ count: number }, []>(`
      SELECT COUNT(*) as count FROM memory_facts
      WHERE status = 'active' AND access_count = 0
    `);
    const neverAccessed = neverAccessedStmt.get()?.count ?? 0;

    return ok({
      total,
      active,
      archived,
      averageImportance,
      neverAccessed,
    });
  } catch (error) {
    return err(
      new DatabaseError("Failed to get memory statistics", {
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Create decay_log table if it doesn't exist
 *
 * @param db - SQLite database instance
 */
export function ensureDecayLogTable(db: Database): void {
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
}

/**
 * Create index on decay_log for faster queries
 *
 * @param db - SQLite database instance
 */
export function createDecayLogIndexes(db: Database): void {
  db.run("CREATE INDEX IF NOT EXISTS idx_decay_log_run_at ON decay_log(run_at)");
}
