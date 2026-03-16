/**
 * Unit Tests for Memory Review Tool
 *
 * Comprehensive tests for the memory review system including:
 * - Input validation
 * - List unreviewed memories
 * - Approve memories
 * - Edit memories
 * - Delete memories
 * - Promote memories
 * - Demote memories
 * - Error handling
 */

import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { err, ok } from "neverthrow";
import {
  type MemoryReviewInput,
  type MemoryReviewOutput,
  executeMemoryReview,
  memoryReviewToolDefinition,
} from "../../../src/tools/review";
import type { MemoryFact } from "../../../src/types/memory";
import { createTestMemory } from "../../fixtures/memories";
import {
  clearTestDatabase,
  closeTestDatabase,
  createTestDatabase,
  getAllTestMemories,
  insertTestMemories,
  insertTestMemory,
} from "../../helpers/test-db";

describe("Memory Review Tool", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    closeTestDatabase(db);
  });

  describe("Tool Definition", () => {
    it("should have correct tool name", () => {
      expect(memoryReviewToolDefinition.name).toBe("memory_review");
    });

    it("should have a description", () => {
      expect(memoryReviewToolDefinition.description).toBeDefined();
      expect(memoryReviewToolDefinition.description.length).toBeGreaterThan(0);
    });

    it("should have inputSchema defined", () => {
      expect(memoryReviewToolDefinition.inputSchema).toBeDefined();
      expect(memoryReviewToolDefinition.inputSchema.type).toBe("object");
    });

    it("should define all required actions in enum", () => {
      const actionProperty =
        memoryReviewToolDefinition.inputSchema.properties?.action;
      expect(actionProperty?.enum).toContain("list_unreviewed");
      expect(actionProperty?.enum).toContain("approve");
      expect(actionProperty?.enum).toContain("edit");
      expect(actionProperty?.enum).toContain("delete");
      expect(actionProperty?.enum).toContain("promote");
      expect(actionProperty?.enum).toContain("demote");
    });
  });

  describe("Input Validation", () => {
    it("should reject invalid action", () => {
      const result = executeMemoryReview(db, {
        action: "invalid_action",
      });

      expect(result.isErr()).toBe(true);
    });

    it("should reject missing action", () => {
      const result = executeMemoryReview(db, {});

      expect(result.isErr()).toBe(true);
    });

    it("should reject invalid importance values in filters", () => {
      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          min_importance: 1.5, // Invalid: > 1
        },
      });

      expect(result.isErr()).toBe(true);
    });

    it("should reject negative importance values in filters", () => {
      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          min_importance: -0.1, // Invalid: < 0
        },
      });

      expect(result.isErr()).toBe(true);
    });

    it("should reject invalid status in filters", () => {
      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          status: "invalid_status" as "active",
        },
      });

      expect(result.isErr()).toBe(true);
    });

    it("should reject invalid importance in edits", () => {
      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: {
          importance: 2.0, // Invalid: > 1
        },
      });

      expect(result.isErr()).toBe(true);
    });
  });

  describe("list_unreviewed action", () => {
    it("should return empty array when no memories exist", () => {
      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.action).toBe("list_unreviewed");
        expect(result.value.memories).toEqual([]);
        expect(result.value.affected_count).toBe(0);
      }
    });

    it("should list all active memories when no filters applied", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_001",
          status: "active",
          importance_score: 0.5,
        }),
        createTestMemory({
          id: "mem_002",
          status: "active",
          importance_score: 0.3,
        }),
        createTestMemory({
          id: "mem_003",
          status: "archived",
          importance_score: 0.7,
        }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.memories).toBeDefined();
        expect(result.value.memories?.length).toBe(2); // Only active memories
        expect(result.value.affected_count).toBe(2);
      }
    });

    it("should filter by topic", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_001",
          topic: "decision",
          importance_score: 0.5,
        }),
        createTestMemory({
          id: "mem_002",
          topic: "api",
          importance_score: 0.3,
        }),
        createTestMemory({
          id: "mem_003",
          topic: "decision",
          importance_score: 0.7,
        }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          topic: "decision",
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories?.length).toBe(2);
        expect(
          result.value.memories?.every((m) => m.topic === "decision"),
        ).toBe(true);
      }
    });

    it("should filter by minimum importance", () => {
      const memories: MemoryFact[] = [
        createTestMemory({ id: "mem_001", importance_score: 0.3 }),
        createTestMemory({ id: "mem_002", importance_score: 0.6 }),
        createTestMemory({ id: "mem_003", importance_score: 0.8 }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          min_importance: 0.5,
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories?.length).toBe(2);
        expect(
          result.value.memories?.every((m) => m.importance_score >= 0.5),
        ).toBe(true);
      }
    });

    it("should filter by maximum importance", () => {
      const memories: MemoryFact[] = [
        createTestMemory({ id: "mem_001", importance_score: 0.3 }),
        createTestMemory({ id: "mem_002", importance_score: 0.6 }),
        createTestMemory({ id: "mem_003", importance_score: 0.8 }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          max_importance: 0.5,
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories?.length).toBe(1);
        expect(
          result.value.memories?.every((m) => m.importance_score <= 0.5),
        ).toBe(true);
      }
    });

    it("should filter by status", () => {
      const memories: MemoryFact[] = [
        createTestMemory({ id: "mem_001", status: "active" }),
        createTestMemory({ id: "mem_002", status: "archived" }),
        createTestMemory({ id: "mem_003", status: "pending" }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          status: "archived",
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories?.length).toBe(1);
        const memories = result.value.memories;
        if (memories && memories.length > 0) {
          expect(memories[0].id).toBe("mem_002");
        }
      }
    });

    it("should combine multiple filters", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_001",
          topic: "decision",
          importance_score: 0.3,
          status: "active",
        }),
        createTestMemory({
          id: "mem_002",
          topic: "decision",
          importance_score: 0.7,
          status: "active",
        }),
        createTestMemory({
          id: "mem_003",
          topic: "api",
          importance_score: 0.7,
          status: "active",
        }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          topic: "decision",
          min_importance: 0.5,
          status: "active",
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories?.length).toBe(1);
        const memories = result.value.memories;
        if (memories && memories.length > 0) {
          expect(memories[0].id).toBe("mem_002");
        }
      }
    });

    it("should return memory summary with correct fields", () => {
      const memory = createTestMemory({
        id: "mem_001",
        topic: "test",
        content_toon: "key:value",
        importance_score: 0.8,
        status: "active",
        access_count: 5,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const summary = result.value.memories?.[0];
        expect(summary).toBeDefined();
        expect(summary?.id).toBe("mem_001");
        expect(summary?.topic).toBe("test");
        expect(summary?.content_toon).toBe("key:value");
        expect(summary?.importance_score).toBe(0.8);
        expect(summary?.status).toBe("active");
        expect(summary?.access_count).toBe(5);
        expect(summary?.created_at).toBeDefined();
      }
    });
  });

  describe("approve action", () => {
    it("should require memory_id", () => {
      const result = executeMemoryReview(db, {
        action: "approve",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("memory_id is required");
      }
    });

    it("should approve existing memory", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.5,
        access_count: 0,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "approve",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.action).toBe("approve");
        expect(result.value.affected_count).toBe(1);
        expect(result.value.memory).toBeDefined();
        expect(result.value.memory?.id).toBe("mem_001");
      }
    });

    it("should boost importance when approving", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.5,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "approve",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.importance_score).toBeGreaterThan(0.5);
      }
    });

    it("should increment access_count when approving", () => {
      const memory = createTestMemory({
        id: "mem_001",
        access_count: 5,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "approve",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.access_count).toBe(6);
      }
    });

    it("should return error for non-existent memory", () => {
      const result = executeMemoryReview(db, {
        action: "approve",
        memory_id: "mem_nonexistent",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("not found");
      }
    });

    it("should set reviewed_at timestamp", () => {
      const memory = createTestMemory({ id: "mem_001" });
      insertTestMemory(db, memory);

      const beforeTime = new Date();
      // SQLite stores timestamps as TEXT in ISO format, truncating milliseconds
      const beforeTimeRounded = Math.floor(beforeTime.getTime() / 1000) * 1000;
      const result = executeMemoryReview(db, {
        action: "approve",
        memory_id: "mem_001",
      });
      const afterTime = new Date();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.reviewed_at).toBeDefined();
        const reviewedAt = new Date(result.value.memory?.reviewed_at || "");
        expect(reviewedAt.getTime()).toBeGreaterThanOrEqual(beforeTimeRounded);
        expect(reviewedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }
    });
  });

  describe("edit action", () => {
    it("should require memory_id", () => {
      const result = executeMemoryReview(db, {
        action: "edit",
        edits: { content: "New content" },
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("memory_id is required");
      }
    });

    it("should require edits", () => {
      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("edits are required");
      }
    });

    it("should edit content", () => {
      const memory = createTestMemory({
        id: "mem_001",
        content_raw: "Old content",
        content_toon: "old:data",
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: { content: "New content" },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.memory).toBeDefined();
      }
    });

    it("should edit topic", () => {
      const memory = createTestMemory({
        id: "mem_001",
        topic: "old-topic",
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: { topic: "new-topic" },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.topic).toBe("new-topic");
      }
    });

    it("should edit importance", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.5,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: { importance: 0.9 },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.importance_score).toBe(0.9);
      }
    });

    it("should edit metadata", () => {
      const memory = createTestMemory({
        id: "mem_001",
        metadata: { old: "data" },
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: { metadata: { new: "metadata" } },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.memory).toBeDefined();
      }
    });

    it("should edit multiple fields at once", () => {
      const memory = createTestMemory({
        id: "mem_001",
        topic: "old-topic",
        importance_score: 0.5,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: {
          topic: "new-topic",
          importance: 0.8,
        },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.topic).toBe("new-topic");
        expect(result.value.memory?.importance_score).toBe(0.8);
      }
    });

    it("should return error for non-existent memory", () => {
      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_nonexistent",
        edits: { content: "New content" },
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("not found");
      }
    });

    it("should update updated_at timestamp", () => {
      const memory = createTestMemory({
        id: "mem_001",
        created_at: new Date("2025-01-01T00:00:00Z"),
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: { topic: "updated" },
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory).toBeDefined();
      }
    });

    it("should return error when no edits provided", () => {
      const memory = createTestMemory({ id: "mem_001" });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "edit",
        memory_id: "mem_001",
        edits: {},
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("No edits provided");
      }
    });
  });

  describe("delete action", () => {
    it("should require memory_id", () => {
      const result = executeMemoryReview(db, {
        action: "delete",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("memory_id is required");
      }
    });

    it("should delete existing memory", () => {
      const memory = createTestMemory({ id: "mem_001" });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "delete",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.action).toBe("delete");
        expect(result.value.affected_count).toBe(1);
        expect(result.value.memory).toBeDefined();
      }
    });

    it("should actually remove memory from database", () => {
      const memory = createTestMemory({ id: "mem_001" });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "delete",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);

      // Verify memory is actually deleted
      const remainingMemories = getAllTestMemories(db);
      expect(remainingMemories.length).toBe(0);
    });

    it("should return error for non-existent memory", () => {
      const result = executeMemoryReview(db, {
        action: "delete",
        memory_id: "mem_nonexistent",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("not found");
      }
    });

    it("should return deleted memory in response", () => {
      const memory = createTestMemory({
        id: "mem_001",
        topic: "test",
        importance_score: 0.7,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "delete",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.id).toBe("mem_001");
        expect(result.value.memory?.topic).toBe("test");
        expect(result.value.memory?.importance_score).toBe(0.7);
      }
    });
  });

  describe("promote action", () => {
    it("should require memory_id", () => {
      const result = executeMemoryReview(db, {
        action: "promote",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("memory_id is required");
      }
    });

    it("should promote memory to importance 1.0", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.5,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "promote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.action).toBe("promote");
        expect(result.value.memory?.importance_score).toBe(1.0);
      }
    });

    it("should not exceed 1.0 if already at 1.0", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 1.0,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "promote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.importance_score).toBe(1.0);
      }
    });

    it("should increment access_count", () => {
      const memory = createTestMemory({
        id: "mem_001",
        access_count: 3,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "promote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.access_count).toBe(4);
      }
    });

    it("should return error for non-existent memory", () => {
      const result = executeMemoryReview(db, {
        action: "promote",
        memory_id: "mem_nonexistent",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("not found");
      }
    });

    it("should set reviewed_at timestamp", () => {
      const memory = createTestMemory({ id: "mem_001" });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "promote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.reviewed_at).toBeDefined();
      }
    });
  });

  describe("demote action", () => {
    it("should require memory_id", () => {
      const result = executeMemoryReview(db, {
        action: "demote",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("memory_id is required");
      }
    });

    it("should demote memory by reducing importance by 50%", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.8,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "demote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.action).toBe("demote");
        expect(result.value.memory?.importance_score).toBe(0.4);
      }
    });

    it("should not go below 0", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.1,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "demote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.importance_score).toBe(0.05);
      }
    });

    it("should handle demoting already low importance", () => {
      const memory = createTestMemory({
        id: "mem_001",
        importance_score: 0.01,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "demote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.importance_score).toBeGreaterThanOrEqual(0);
        expect(result.value.memory?.importance_score).toBeLessThanOrEqual(0.01);
      }
    });

    it("should increment access_count", () => {
      const memory = createTestMemory({
        id: "mem_001",
        access_count: 2,
      });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "demote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.access_count).toBe(3);
      }
    });

    it("should return error for non-existent memory", () => {
      const result = executeMemoryReview(db, {
        action: "demote",
        memory_id: "mem_nonexistent",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("not found");
      }
    });

    it("should set reviewed_at timestamp", () => {
      const memory = createTestMemory({ id: "mem_001" });
      insertTestMemory(db, memory);

      const result = executeMemoryReview(db, {
        action: "demote",
        memory_id: "mem_001",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memory?.reviewed_at).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", () => {
      // Close the database to force an error
      closeTestDatabase(db);

      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
      });

      expect(result.isErr()).toBe(true);
    });

    it("should return ToolError on failure", () => {
      const result = executeMemoryReview(db, {
        action: "invalid_action" as "list_unreviewed",
      });

      expect(result.isErr()).toBe(true);
    });

    it("should include context in error messages", () => {
      const result = executeMemoryReview(db, {
        action: "approve",
        memory_id: "nonexistent",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details).toBeDefined();
      }
    });
  });

  describe("Performance", () => {
    it("should handle listing large number of memories efficiently", () => {
      // Insert 100 memories
      const memories = Array.from({ length: 100 }, (_, i) =>
        createTestMemory({
          id: `mem_${i}`,
          importance_score: Math.random(),
        }),
      );
      insertTestMemories(db, memories);

      const startTime = performance.now();
      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
      });
      const duration = performance.now() - startTime;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Default limit is 50 in the review tool
        expect(result.value.memories?.length).toBe(50);
      }
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it("should handle filtering large dataset efficiently", () => {
      // Insert 100 memories with different topics
      const memories = Array.from({ length: 100 }, (_, i) =>
        createTestMemory({
          id: `mem_${i}`,
          topic: i % 2 === 0 ? "decision" : "api",
          importance_score: Math.random(),
        }),
      );
      insertTestMemories(db, memories);

      const startTime = performance.now();
      const result = executeMemoryReview(db, {
        action: "list_unreviewed",
        filters: {
          topic: "decision",
        },
      });
      const duration = performance.now() - startTime;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories?.length).toBe(50);
      }
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });
  });
});
