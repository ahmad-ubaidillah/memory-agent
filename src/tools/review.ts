/**
 * Memory Review Tool for Memory-Agent MCP Server
 *
 * MCP tool that provides human oversight for the automatic memory system.
 * Allows users to manually curate, edit, approve, and manage memories.
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";
import { DatabaseError, ToolError, ValidationError } from "../errors/types";
import type { MemoryFact, MemoryStatus } from "../types/memory";

/**
 * Input schema for memory_review tool
 */
export const MemoryReviewInputSchema = z.object({
  action: z.enum(["list_unreviewed", "approve", "edit", "delete", "promote", "demote"]),
  memory_id: z.string().optional(),
  filters: z
    .object({
      topic: z.string().optional(),
      min_importance: z.number().min(0).max(1).optional(),
      max_importance: z.number().min(0).max(1).optional(),
      status: z.enum(["active", "archived", "pending"]).optional(),
      older_than_days: z.number().int().min(1).optional(),
    })
    .optional(),
  edits: z
    .object({
      content: z.string().min(1).optional(),
      topic: z.string().min(1).optional(),
      importance: z.number().min(0).max(1).optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
});

/**
 * Type for memory_review tool input
 */
export type MemoryReviewInput = z.infer<typeof MemoryReviewInputSchema>;

/**
 * Memory summary for list responses
 */
export interface MemorySummary {
  id: string;
  topic: string;
  content_toon: string;
  importance_score: number;
  status: MemoryStatus;
  access_count: number;
  created_at: string;
  reviewed_at?: string;
}

/**
 * Output schema for memory_review tool
 */
export interface MemoryReviewOutput {
  success: boolean;
  action: string;
  affected_count?: number;
  memory?: MemorySummary;
  memories?: MemorySummary[];
  message?: string;
}

/**
 * MCP Tool definition for memory_review
 */
export const memoryReviewToolDefinition = {
  name: "memory_review",
  description: `Manually review and manage stored memories for quality control.

This tool provides human oversight for the automatic memory system:
- List memories that need attention (low importance, never accessed)
- Approve memories to boost their importance
- Edit memory content, topic, importance, or metadata
- Delete memories permanently
- Promote memories to critical (importance = 1.0)
- Demote memories (reduce importance by 50%)

Use this to ensure only accurate and relevant information is retained.

Performance: <100ms for all operations`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["list_unreviewed", "approve", "edit", "delete", "promote", "demote"],
        description: "The review action to perform",
      },
      memory_id: {
        type: "string",
        description: "Memory ID (required for approve, edit, delete, promote, demote)",
      },
      filters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Filter by topic" },
          min_importance: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Minimum importance score",
          },
          max_importance: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Maximum importance score",
          },
          status: {
            type: "string",
            enum: ["active", "archived", "pending"],
            description: "Filter by status",
          },
          older_than_days: {
            type: "integer",
            minimum: 1,
            description: "Filter memories older than N days",
          },
        },
      },
      edits: {
        type: "object",
        properties: {
          content: { type: "string", description: "New content" },
          topic: { type: "string", description: "New topic" },
          importance: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "New importance score",
          },
          metadata: {
            type: "object",
            description: "New or updated metadata",
          },
        },
      },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

/**
 * Execute memory_review tool
 *
 * @param db - SQLite database instance
 * @param input - Tool input parameters
 * @returns Result with review output or error
 */
export function executeMemoryReview(
  db: Database,
  input: unknown
): Result<MemoryReviewOutput, ToolError> {
  // Validate input
  const inputResult = MemoryReviewInputSchema.safeParse(input);

  if (!inputResult.success) {
    return err(
      new ToolError("Invalid input for memory_review tool", {
        errors: inputResult.error.errors,
      })
    );
  }

  const validatedInput = inputResult.data;

  // Route to appropriate action handler
  try {
    switch (validatedInput.action) {
      case "list_unreviewed":
        return handleListUnreviewed(db, validatedInput.filters);

      case "approve":
        if (!validatedInput.memory_id) {
          return err(
            new ToolError("memory_id is required for approve action", {
              action: validatedInput.action,
            })
          );
        }
        return handleApprove(db, validatedInput.memory_id);

      case "edit":
        if (!validatedInput.memory_id) {
          return err(
            new ToolError("memory_id is required for edit action", {
              action: validatedInput.action,
            })
          );
        }
        if (!validatedInput.edits) {
          return err(
            new ToolError("edits are required for edit action", {
              action: validatedInput.action,
            })
          );
        }
        return handleEdit(db, validatedInput.memory_id, validatedInput.edits);

      case "delete":
        if (!validatedInput.memory_id) {
          return err(
            new ToolError("memory_id is required for delete action", {
              action: validatedInput.action,
            })
          );
        }
        return handleDelete(db, validatedInput.memory_id);

      case "promote":
        if (!validatedInput.memory_id) {
          return err(
            new ToolError("memory_id is required for promote action", {
              action: validatedInput.action,
            })
          );
        }
        return handlePromote(db, validatedInput.memory_id);

      case "demote":
        if (!validatedInput.memory_id) {
          return err(
            new ToolError("memory_id is required for demote action", {
              action: validatedInput.action,
            })
          );
        }
        return handleDemote(db, validatedInput.memory_id);

      default:
        return err(
          new ToolError(`Unknown action: ${validatedInput.action}`, {
            action: validatedInput.action,
          })
        );
    }
  } catch (error) {
    return err(
      new ToolError("Failed to execute review action", {
        action: validatedInput.action,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Handle list_unreviewed action
 * Returns memories that need attention (low importance, never accessed)
 */
function handleListUnreviewed(
  db: Database,
  filters?: MemoryReviewInput["filters"]
): Result<MemoryReviewOutput, ToolError> {
  try {
    // Build query with filters
    let sql = `
      SELECT
        id, topic, content_toon, importance_score, status,
        access_count, created_at, updated_at, archived_at, reviewed_at, metadata
      FROM memory_facts
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    // Add filters
    if (filters?.topic) {
      sql += " AND topic = ?";
      params.push(filters.topic);
    }

    if (filters?.min_importance !== undefined) {
      sql += " AND importance_score >= ?";
      params.push(filters.min_importance);
    }

    if (filters?.max_importance !== undefined) {
      sql += " AND importance_score <= ?";
      params.push(filters.max_importance);
    }

    if (filters?.status) {
      sql += " AND status = ?";
      params.push(filters.status);
    } else {
      // Default to active if no status filter provided
      sql += " AND status = 'active'";
    }

    if (filters?.older_than_days) {
      sql += ` AND datetime(created_at) < datetime('now', '-' || ? || ' days')`;
      params.push(filters.older_than_days);
    }

    // Prioritize unreviewed and low importance
    sql += `
      ORDER BY
        CASE WHEN reviewed_at IS NULL THEN 0 ELSE 1 END,
        importance_score ASC,
        access_count ASC
      LIMIT 50
    `;

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      id: string;
      topic: string;
      content_toon: string;
      importance_score: number;
      status: string;
      access_count: number;
      created_at: string;
      updated_at: string;
      archived_at?: string;
      reviewed_at?: string;
      metadata?: string;
    }>;

    const memories: MemorySummary[] = rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      content_toon: row.content_toon,
      importance_score: row.importance_score,
      status: row.status as MemoryStatus,
      access_count: row.access_count,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
    }));

    return ok({
      success: true,
      action: "list_unreviewed",
      memories,
      affected_count: memories.length,
      message: `Found ${memories.length} memories needing review`,
    });
  } catch (error) {
    return err(
      new ToolError("Failed to list unreviewed memories", {
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Handle approve action
 * Mark memory as reviewed and boost importance score
 */
function handleApprove(db: Database, memoryId: string): Result<MemoryReviewOutput, ToolError> {
  try {
    const stmt = db.prepare(`
      UPDATE memory_facts
      SET
        importance_score = MIN(1.0, importance_score + 0.2),
        access_count = access_count + 1,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = stmt.run(memoryId);

    if (result.changes === 0) {
      return err(
        new ToolError("Memory not found", {
          memory_id: memoryId,
        })
      );
    }

    // Fetch updated memory
    const fetchStmt = db.prepare(`
      SELECT id, topic, content_toon, importance_score, status, access_count, created_at, reviewed_at
      FROM memory_facts
      WHERE id = ?
    `);

    const row = fetchStmt.get(memoryId) as {
      id: string;
      topic: string;
      content_toon: string;
      importance_score: number;
      status: string;
      access_count: number;
      created_at: string;
      reviewed_at?: string;
    };

    return ok({
      success: true,
      action: "approve",
      affected_count: 1,
      memory: {
        id: row.id,
        topic: row.topic,
        content_toon: row.content_toon,
        importance_score: row.importance_score,
        status: row.status as MemoryStatus,
        access_count: row.access_count,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
      },
      message: "Memory approved and importance boosted",
    });
  } catch (error) {
    return err(
      new ToolError("Failed to approve memory", {
        memory_id: memoryId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Handle edit action
 * Modify memory content, topic, importance, or metadata
 */
function handleEdit(
  db: Database,
  memoryId: string,
  edits: NonNullable<MemoryReviewInput["edits"]>
): Result<MemoryReviewOutput, ToolError> {
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (edits.content !== undefined) {
      updates.push("content_raw = ?");
      params.push(edits.content);
    }

    if (edits.topic !== undefined) {
      updates.push("topic = ?");
      params.push(edits.topic);
    }

    if (edits.importance !== undefined) {
      updates.push("importance_score = ?");
      params.push(edits.importance);
    }

    if (edits.metadata !== undefined) {
      updates.push("metadata = ?");
      params.push(JSON.stringify(edits.metadata));
    }

    if (updates.length === 0) {
      return err(
        new ToolError("No edits provided", {
          memory_id: memoryId,
        })
      );
    }

    // Always update reviewed_at and updated_at
    updates.push("reviewed_at = datetime('now')");
    updates.push("updated_at = datetime('now')");

    params.push(memoryId);

    const sql = `
      UPDATE memory_facts
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    const stmt = db.prepare(sql);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return err(
        new ToolError("Memory not found", {
          memory_id: memoryId,
        })
      );
    }

    // Fetch updated memory
    const fetchStmt = db.prepare(`
      SELECT id, topic, content_toon, importance_score, status, access_count, created_at, reviewed_at
      FROM memory_facts
      WHERE id = ?
    `);

    const row = fetchStmt.get(memoryId) as {
      id: string;
      topic: string;
      content_toon: string;
      importance_score: number;
      status: string;
      access_count: number;
      created_at: string;
      reviewed_at?: string;
    };

    return ok({
      success: true,
      action: "edit",
      affected_count: 1,
      memory: {
        id: row.id,
        topic: row.topic,
        content_toon: row.content_toon,
        importance_score: row.importance_score,
        status: row.status as MemoryStatus,
        access_count: row.access_count,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
      },
      message: "Memory updated successfully",
    });
  } catch (error) {
    return err(
      new ToolError("Failed to edit memory", {
        memory_id: memoryId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Handle delete action
 * Permanently remove a memory
 */
function handleDelete(db: Database, memoryId: string): Result<MemoryReviewOutput, ToolError> {
  try {
    // First, fetch the memory to return it in the response
    const fetchStmt = db.prepare(`
      SELECT id, topic, content_toon, importance_score, status, access_count, created_at, reviewed_at
      FROM memory_facts
      WHERE id = ?
    `);

    const row = fetchStmt.get(memoryId) as
      | {
          id: string;
          topic: string;
          content_toon: string;
          importance_score: number;
          status: string;
          access_count: number;
          created_at: string;
          reviewed_at?: string;
        }
      | undefined;

    if (!row) {
      return err(
        new ToolError("Memory not found", {
          memory_id: memoryId,
        })
      );
    }

    // Delete the memory
    const deleteStmt = db.prepare("DELETE FROM memory_facts WHERE id = ?");
    deleteStmt.run(memoryId);

    return ok({
      success: true,
      action: "delete",
      affected_count: 1,
      memory: {
        id: row.id,
        topic: row.topic,
        content_toon: row.content_toon,
        importance_score: row.importance_score,
        status: row.status as MemoryStatus,
        access_count: row.access_count,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
      },
      message: "Memory deleted permanently",
    });
  } catch (error) {
    return err(
      new ToolError("Failed to delete memory", {
        memory_id: memoryId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Handle promote action
 * Mark memory as critical (importance = 1.0)
 */
function handlePromote(db: Database, memoryId: string): Result<MemoryReviewOutput, ToolError> {
  try {
    const stmt = db.prepare(`
      UPDATE memory_facts
      SET
        importance_score = 1.0,
        access_count = access_count + 1,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = stmt.run(memoryId);

    if (result.changes === 0) {
      return err(
        new ToolError("Memory not found", {
          memory_id: memoryId,
        })
      );
    }

    // Fetch updated memory
    const fetchStmt = db.prepare(`
      SELECT id, topic, content_toon, importance_score, status, access_count, created_at, reviewed_at
      FROM memory_facts
      WHERE id = ?
    `);

    const row = fetchStmt.get(memoryId) as {
      id: string;
      topic: string;
      content_toon: string;
      importance_score: number;
      status: string;
      access_count: number;
      created_at: string;
      reviewed_at?: string;
    };

    return ok({
      success: true,
      action: "promote",
      affected_count: 1,
      memory: {
        id: row.id,
        topic: row.topic,
        content_toon: row.content_toon,
        importance_score: row.importance_score,
        status: row.status as MemoryStatus,
        access_count: row.access_count,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
      },
      message: "Memory promoted to critical (importance = 1.0)",
    });
  } catch (error) {
    return err(
      new ToolError("Failed to promote memory", {
        memory_id: memoryId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Handle demote action
 * Reduce importance score (multiply by 0.5)
 */
function handleDemote(db: Database, memoryId: string): Result<MemoryReviewOutput, ToolError> {
  try {
    const stmt = db.prepare(`
      UPDATE memory_facts
      SET
        importance_score = MAX(0, importance_score * 0.5),
        access_count = access_count + 1,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    const result = stmt.run(memoryId);

    if (result.changes === 0) {
      return err(
        new ToolError("Memory not found", {
          memory_id: memoryId,
        })
      );
    }

    // Fetch updated memory
    const fetchStmt = db.prepare(`
      SELECT id, topic, content_toon, importance_score, status, access_count, created_at, reviewed_at
      FROM memory_facts
      WHERE id = ?
    `);

    const row = fetchStmt.get(memoryId) as {
      id: string;
      topic: string;
      content_toon: string;
      importance_score: number;
      status: string;
      access_count: number;
      created_at: string;
      reviewed_at?: string;
    };

    return ok({
      success: true,
      action: "demote",
      affected_count: 1,
      memory: {
        id: row.id,
        topic: row.topic,
        content_toon: row.content_toon,
        importance_score: row.importance_score,
        status: row.status as MemoryStatus,
        access_count: row.access_count,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at,
      },
      message: "Memory demoted (importance reduced by 50%)",
    });
  } catch (error) {
    return err(
      new ToolError("Failed to demote memory", {
        memory_id: memoryId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Batch approve multiple memories
 *
 * @param db - SQLite database instance
 * @param memoryIds - Array of memory IDs to approve
 * @returns Result with batch operation result
 */
export function batchApprove(
  db: Database,
  memoryIds: string[]
): Result<MemoryReviewOutput, ToolError> {
  try {
    const stmt = db.prepare(`
      UPDATE memory_facts
      SET
        importance_score = MIN(1.0, importance_score + 0.2),
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);

    const transaction = db.transaction(() => {
      let count = 0;
      for (const id of memoryIds) {
        const result = stmt.run(id);
        count += result.changes;
      }
      return count;
    });

    const affectedCount = transaction();

    return ok({
      success: true,
      action: "approve",
      affected_count: affectedCount,
      message: `Approved ${affectedCount} of ${memoryIds.length} memories`,
    });
  } catch (error) {
    return err(
      new ToolError("Failed to batch approve memories", {
        count: memoryIds.length,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

/**
 * Export the review tool
 */
export const reviewTool = {
  definition: memoryReviewToolDefinition,
  executor: executeMemoryReview,
};
