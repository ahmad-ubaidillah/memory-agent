/**
 * Unit Tests for Decay Functionality
 *
 * Comprehensive tests for the memory decay system including:
 * - Score calculation
 * - Garbage detection
 * - Archive/delete logic
 * - Decay logging
 * - Tool execution
 * - Performance benchmarks
 */

import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  DEFAULT_DECAY_CONFIG,
  type DecayResult,
  calculateDecayedScore,
  ensureDecayLogTable,
  getDecayHistory,
  getMemoryStats,
  isGarbage,
  runDecay,
  validateDecayConfig,
} from "../../../src/core/decay";
import {
  MemoryDecayInputSchema,
  type MemoryDecayOutput,
  executeMemoryDecay,
  executeMemoryDecayHistory,
} from "../../../src/tools/decay";
import type { MemoryFact } from "../../../src/types/memory";
import { SAMPLE_MEMORIES, createTestMemory } from "../../fixtures/memories";
import {
  clearTestDatabase,
  closeTestDatabase,
  createTestDatabase,
  getAllTestMemories,
  insertTestMemories,
  insertTestMemory,
} from "../../helpers/test-db";

describe("Decay Functionality", () => {
  describe("Score Calculation", () => {
    it("should apply decay factor to importance score", () => {
      const memory = createTestMemory({
        importance_score: 0.8,
        access_count: 0,
      });

      const score = calculateDecayedScore(memory, 0.95);
      expect(score).toBeCloseTo(0.76, 2); // 0.8 * 0.95
    });

    it("should add access bonus based on access count", () => {
      const memory = createTestMemory({
        importance_score: 0.5,
        access_count: 10,
      });

      const score = calculateDecayedScore(memory, 0.95);
      // Decayed: 0.5 * 0.95 = 0.475
      // Access bonus: min(10 * 0.01, 0.5) = 0.1
      // Total: 0.475 + 0.1 = 0.575
      expect(score).toBeCloseTo(0.575, 2);
    });

    it("should cap access bonus at 0.5", () => {
      const memory = createTestMemory({
        importance_score: 0.5,
        access_count: 100, // Would be 1.0 without cap
      });

      const score = calculateDecayedScore(memory, 0.95);
      // Decayed: 0.5 * 0.95 = 0.475
      // Access bonus: min(100 * 0.01, 0.5) = 0.5 (capped)
      // Total: 0.475 + 0.5 = 0.975
      expect(score).toBeCloseTo(0.975, 2);
    });

    it("should ensure score stays between 0 and 1", () => {
      const memory1 = createTestMemory({
        importance_score: 0,
        access_count: 0,
      });
      const score1 = calculateDecayedScore(memory1, 0.95);
      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(1);

      const memory2 = createTestMemory({
        importance_score: 1,
        access_count: 1000,
      });
      const score2 = calculateDecayedScore(memory2, 0.95);
      expect(score2).toBeGreaterThanOrEqual(0);
      expect(score2).toBeLessThanOrEqual(1);
    });

    it("should handle extreme decay factors", () => {
      const memory = createTestMemory({
        importance_score: 0.8,
        access_count: 0,
      });

      // Decay factor of 1.0 (no decay)
      const score1 = calculateDecayedScore(memory, 1.0);
      expect(score1).toBeCloseTo(0.8, 2);

      // Decay factor of 0.0 (complete decay)
      const score2 = calculateDecayedScore(memory, 0.0);
      expect(score2).toBeCloseTo(0, 2);
    });

    it("should calculate access bonus correctly for various access counts", () => {
      const testCases = [
        { access_count: 0, expected_bonus: 0 },
        { access_count: 5, expected_bonus: 0.05 },
        { access_count: 10, expected_bonus: 0.1 },
        { access_count: 25, expected_bonus: 0.25 },
        { access_count: 50, expected_bonus: 0.5 },
        { access_count: 75, expected_bonus: 0.5 }, // Capped
        { access_count: 100, expected_bonus: 0.5 }, // Capped
      ];

      for (const { access_count, expected_bonus } of testCases) {
        const memory = createTestMemory({
          importance_score: 0.5,
          access_count,
        });
        const score = calculateDecayedScore(memory, 1.0); // No decay
        expect(score).toBeCloseTo(0.5 + expected_bonus, 3);
      }
    });
  });

  describe("Garbage Detection", () => {
    it("should identify garbage memory (never accessed, old, no important metadata)", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days old
        metadata: {},
      });

      expect(isGarbage(memory, 30)).toBe(true);
    });

    it("should NOT identify as garbage if accessed", () => {
      const memory = createTestMemory({
        access_count: 1,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: {},
      });

      expect(isGarbage(memory, 30)).toBe(false);
    });

    it("should NOT identify as garbage if not old enough", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 days old
        metadata: {},
      });

      expect(isGarbage(memory, 30)).toBe(false);
    });

    it("should NOT identify as garbage if has decision_date", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: { decision_date: "2025-01-01" },
      });

      expect(isGarbage(memory, 30)).toBe(false);
    });

    it("should NOT identify as garbage if has project", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: { project: "important-project" },
      });

      expect(isGarbage(memory, 30)).toBe(false);
    });

    it("should NOT identify as garbage if marked as critical", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: { critical: true },
      });

      expect(isGarbage(memory, 30)).toBe(false);
    });

    it("should handle memory with no metadata", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      });
      memory.metadata = undefined;

      expect(isGarbage(memory, 30)).toBe(true);
    });

    it("should handle various garbage_age_days values", () => {
      const memory = createTestMemory({
        access_count: 0,
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days old
        metadata: {},
      });

      expect(isGarbage(memory, 10)).toBe(true); // 15 > 10
      expect(isGarbage(memory, 20)).toBe(false); // 15 < 20
      expect(isGarbage(memory, 15)).toBe(false); // 15 not > 15
    });
  });

  describe("Decay Operation", () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDatabase();
    });

    afterEach(() => {
      closeTestDatabase(db);
    });

    it("should run decay on empty database", () => {
      const result = runDecay(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.archived).toBe(0);
        expect(result.value.deleted).toBe(0);
        expect(result.value.kept).toBe(0);
        expect(result.value.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("should keep high-importance memories", () => {
      const memory = createTestMemory({
        id: "mem_keep",
        importance_score: 0.9,
        access_count: 10,
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        decay_factor: 0.95,
        archive_threshold: 0.2,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kept).toBe(1);
        expect(result.value.archived).toBe(0);
        expect(result.value.deleted).toBe(0);
      }

      const memories = getAllTestMemories(db);
      expect(memories.length).toBe(1);
      expect(memories[0]?.status).toBe("active");
    });

    it("should archive low-importance non-garbage memories", () => {
      const memory = createTestMemory({
        id: "mem_archive",
        importance_score: 0.15,
        access_count: 1, // Accessed, so not garbage
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        decay_factor: 0.95,
        archive_threshold: 0.2,
        delete_threshold: 0.05,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.archived).toBe(1);
        expect(result.value.deleted).toBe(0);
        expect(result.value.kept).toBe(0);
      }

      const memories = getAllTestMemories(db);
      expect(memories.length).toBe(1);
      expect(memories[0]?.status).toBe("archived");
      expect(memories[0]?.archived_at).not.toBeNull();
    });

    it("should delete garbage memories with very low score", () => {
      const memory = createTestMemory({
        id: "mem_delete",
        importance_score: 0.03,
        access_count: 0, // Never accessed
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // Old
        metadata: {}, // No important metadata
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        decay_factor: 0.95,
        archive_threshold: 0.2,
        delete_threshold: 0.05,
        garbage_age_days: 30,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.deleted).toBe(1);
        expect(result.value.archived).toBe(0);
        expect(result.value.kept).toBe(0);
      }

      const memories = getAllTestMemories(db);
      expect(memories.length).toBe(0); // Deleted
    });

    it("should NOT delete garbage if score is above delete threshold", () => {
      const memory = createTestMemory({
        id: "mem_no_delete",
        importance_score: 0.08, // Above delete threshold (0.05)
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: {},
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        decay_factor: 0.95,
        archive_threshold: 0.2,
        delete_threshold: 0.05,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.archived).toBe(1);
        expect(result.value.deleted).toBe(0);
      }

      const memories = getAllTestMemories(db);
      expect(memories.length).toBe(1);
      expect(memories[0]?.status).toBe("archived");
    });

    it("should process multiple memories correctly", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_keep_1",
          importance_score: 0.9,
          access_count: 10,
        }),
        createTestMemory({
          id: "mem_keep_2",
          importance_score: 0.7,
          access_count: 20,
        }),
        createTestMemory({
          id: "mem_archive_1",
          importance_score: 0.15,
          access_count: 1,
          created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        }),
        createTestMemory({
          id: "mem_delete_1",
          importance_score: 0.03,
          access_count: 0,
          created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
          metadata: {},
        }),
      ];

      insertTestMemories(db, memories);

      const result = runDecay(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kept).toBe(2);
        expect(result.value.archived).toBe(1);
        expect(result.value.deleted).toBe(1);
      }

      const remaining = getAllTestMemories(db);
      expect(remaining.length).toBe(3); // 2 kept + 1 archived
      expect(remaining.filter((m) => m.status === "active").length).toBe(2);
      expect(remaining.filter((m) => m.status === "archived").length).toBe(1);
    });

    it("should only process active memories", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_active",
          importance_score: 0.9,
          status: "active",
        }),
        createTestMemory({
          id: "mem_archived",
          importance_score: 0.1,
          status: "archived",
        }),
        createTestMemory({
          id: "mem_pending",
          importance_score: 0.1,
          status: "pending",
        }),
      ];

      insertTestMemories(db, memories);

      const result = runDecay(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.total_processed).toBe(1); // Only active
        expect(result.value.kept).toBe(1);
      }
    });

    it("should update importance scores after decay", () => {
      const memory = createTestMemory({
        id: "mem_update",
        importance_score: 0.8,
        access_count: 0,
      });
      insertTestMemory(db, memory);

      runDecay(db, { decay_factor: 0.9 });

      const memories = getAllTestMemories(db);
      expect(memories[0]?.importance_score).toBeCloseTo(0.72, 2); // 0.8 * 0.9
    });

    it("should log decay run to decay_log table", () => {
      const memory = createTestMemory({
        importance_score: 0.9,
        access_count: 10,
      });
      insertTestMemory(db, memory);

      const result = runDecay(db);

      expect(result.isOk()).toBe(true);

      const logStmt = db.prepare<{ count: number }, []>(`
        SELECT COUNT(*) as count FROM decay_log
      `);
      const logCount = logStmt.get()?.count ?? 0;
      expect(logCount).toBe(1);
    });

    it("should store config in decay log", () => {
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      const customConfig = {
        decay_factor: 0.85,
        archive_threshold: 0.15,
        delete_threshold: 0.03,
        garbage_age_days: 45,
      };

      runDecay(db, customConfig);

      const logStmt = db.prepare<{ config_json: string }, []>(`
        SELECT config_json FROM decay_log ORDER BY id DESC LIMIT 1
      `);
      const logEntry = logStmt.get();
      expect(logEntry).toBeDefined();

      if (logEntry?.config_json) {
        const loggedConfig = JSON.parse(logEntry.config_json);
        expect(loggedConfig.decay_factor).toBe(0.85);
        expect(loggedConfig.archive_threshold).toBe(0.15);
      }
    });

    it("should use default config when not provided", () => {
      const result = runDecay(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.config_used.decay_factor).toBe(
          DEFAULT_DECAY_CONFIG.decay_factor,
        );
        expect(result.value.config_used.archive_threshold).toBe(
          DEFAULT_DECAY_CONFIG.archive_threshold,
        );
      }
    });

    it("should handle database errors gracefully", () => {
      // Close the database to force an error
      closeTestDatabase(db);

      const result = runDecay(db);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Decay History", () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDatabase();
      ensureDecayLogTable(db);
    });

    afterEach(() => {
      closeTestDatabase(db);
    });

    it("should return empty history when no decay runs", () => {
      const result = getDecayHistory(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    it("should return decay history entries", () => {
      // Run decay a few times
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      runDecay(db);
      runDecay(db);
      runDecay(db);

      const result = getDecayHistory(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(3);
      }
    });

    it("should limit history results", () => {
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      // Run decay 5 times
      for (let i = 0; i < 5; i++) {
        runDecay(db);
      }

      const result = getDecayHistory(db, 3);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(3);
      }
    });

    it("should return history in reverse chronological order", () => {
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      runDecay(db, { decay_factor: 0.9 });
      runDecay(db, { decay_factor: 0.91 });
      runDecay(db, { decay_factor: 0.92 });

      const result = getDecayHistory(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const entries = result.value;
        expect(entries.length).toBe(3);

        // Most recent should have highest decay_factor
        if (entries[0]?.config_json) {
          const firstConfig = JSON.parse(entries[0].config_json);
          expect(firstConfig.decay_factor).toBe(0.92);
        }
      }
    });
  });

  describe("Configuration Validation", () => {
    it("should validate valid configuration", () => {
      const config = {
        decay_factor: 0.95,
        archive_threshold: 0.2,
        delete_threshold: 0.05,
        garbage_age_days: 30,
      };

      const result = validateDecayConfig(config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.decay_factor).toBe(0.95);
      }
    });

    it("should apply defaults for missing values", () => {
      const config = {};

      const result = validateDecayConfig(config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.decay_factor).toBe(0.95);
        expect(result.value.archive_threshold).toBe(0.2);
      }
    });

    it("should reject invalid decay_factor", () => {
      const config = { decay_factor: 1.5 };

      const result = validateDecayConfig(config);

      expect(result.isErr()).toBe(true);
    });

    it("should reject negative decay_factor", () => {
      const config = { decay_factor: -0.1 };

      const result = validateDecayConfig(config);

      expect(result.isErr()).toBe(true);
    });

    it("should reject invalid garbage_age_days", () => {
      const config = { garbage_age_days: 0 };

      const result = validateDecayConfig(config);

      expect(result.isErr()).toBe(true);
    });

    it("should reject non-integer garbage_age_days", () => {
      const config = { garbage_age_days: 30.5 };

      const result = validateDecayConfig(config);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Memory Statistics", () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDatabase();
    });

    afterEach(() => {
      closeTestDatabase(db);
    });

    it("should return correct statistics for empty database", () => {
      const result = getMemoryStats(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.total).toBe(0);
        expect(result.value.active).toBe(0);
        expect(result.value.archived).toBe(0);
        expect(result.value.neverAccessed).toBe(0);
      }
    });

    it("should return correct statistics", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_1",
          status: "active",
          access_count: 0,
          importance_score: 0.8,
        }),
        createTestMemory({
          id: "mem_2",
          status: "active",
          access_count: 5,
          importance_score: 0.6,
        }),
        createTestMemory({
          id: "mem_3",
          status: "active",
          access_count: 0,
          importance_score: 0.7,
        }),
        createTestMemory({
          id: "mem_4",
          status: "archived",
          access_count: 0,
          importance_score: 0.3,
        }),
      ];
      insertTestMemories(db, memories);

      const result = getMemoryStats(db);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.total).toBe(4);
        expect(result.value.active).toBe(3);
        expect(result.value.archived).toBe(1);
        expect(result.value.neverAccessed).toBe(2); // mem_1 and mem_3 (active, access_count=0)
        expect(result.value.averageImportance).toBeCloseTo(0.7, 1); // (0.8 + 0.6 + 0.7) / 3
      }
    });
  });

  describe("Tool Execution", () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDatabase();
    });

    afterEach(() => {
      closeTestDatabase(db);
    });

    it("should execute memory_decay tool with valid input", () => {
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      const result = executeMemoryDecay(db, {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value).toHaveProperty("archived");
        expect(result.value).toHaveProperty("deleted");
        expect(result.value).toHaveProperty("kept");
        expect(result.value).toHaveProperty("duration_ms");
        expect(result.value).toHaveProperty("config_used");
      }
    });

    it("should reject invalid input", () => {
      const result = executeMemoryDecay(db, { decay_factor: 2.0 });

      expect(result.isErr()).toBe(true);
    });

    it("should support custom configuration", () => {
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      const result = executeMemoryDecay(db, {
        decay_factor: 0.85,
        archive_threshold: 0.15,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.config_used.decay_factor).toBe(0.85);
        expect(result.value.config_used.archive_threshold).toBe(0.15);
      }
    });

    it("should execute dry run mode", () => {
      const memories = Array.from({ length: 100 }, (_, i) =>
        createTestMemory({
          id: `mem_${i}`,
          importance_score: 0.5,
          access_count: i % 2 === 0 ? 0 : 10,
        }),
      );
      insertTestMemories(db, memories);

      const result = executeMemoryDecay(db, { dry_run: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dry_run).toBe(true);
        expect(result.value.message).toContain("DRY RUN");

        // Verify no actual changes
        const dbMemories = getAllTestMemories(db);
        expect(dbMemories.length).toBe(100);
        expect(dbMemories.every((m) => m.status === "active")).toBe(true);
      }
    });

    it("should generate human-readable message", () => {
      const memories: MemoryFact[] = [
        createTestMemory({
          id: "mem_1",
          importance_score: 0.9,
          access_count: 10,
        }),
        createTestMemory({
          id: "mem_2",
          importance_score: 0.15,
          access_count: 1,
          created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        }),
      ];
      insertTestMemories(db, memories);

      const result = executeMemoryDecay(db, {});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.message).toBeDefined();
        expect(result.value.message).toContain("archived");
      }
    });

    it("should execute memory_decay_history tool", () => {
      const memory = createTestMemory({ importance_score: 0.9 });
      insertTestMemory(db, memory);

      runDecay(db);
      runDecay(db);

      const result = executeMemoryDecayHistory(db, { limit: 10 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entries.length).toBe(2);
        expect(result.value.entries[0]).toHaveProperty("run_at");
        expect(result.value.entries[0]).toHaveProperty("memories_archived");
        expect(result.value.entries[0]).toHaveProperty("config_used");
      }
    });

    it("should validate history input", () => {
      const result = executeMemoryDecayHistory(db, { limit: 0 });

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Boundary Conditions", () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDatabase();
    });

    afterEach(() => {
      closeTestDatabase(db);
    });

    it("should handle memory exactly at archive threshold", () => {
      const memory = createTestMemory({
        importance_score: 0.2, // Exactly at threshold
        access_count: 0,
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        archive_threshold: 0.2,
        decay_factor: 1.0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Score after decay: 0.2 * 1.0 = 0.2
        // 0.2 is NOT < 0.2, so should be kept
        expect(result.value.kept).toBe(1);
      }
    });

    it("should handle memory just below archive threshold", () => {
      const memory = createTestMemory({
        importance_score: 0.19,
        access_count: 0, // Not garbage (age check will fail)
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        archive_threshold: 0.2,
        decay_factor: 1.0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Score after decay: 0.19 * 1.0 + 0 (no access bonus) = 0.19
        // 0.19 < 0.2, so should be archived
        expect(result.value.archived).toBe(1);
      }
    });

    it("should handle memory exactly at delete threshold", () => {
      const memory = createTestMemory({
        importance_score: 0.05,
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: {},
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        archive_threshold: 0.2,
        delete_threshold: 0.05,
        decay_factor: 1.0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Score: 0.05, is garbage
        // 0.05 is NOT < 0.05, so should be archived, not deleted
        expect(result.value.archived).toBe(1);
        expect(result.value.deleted).toBe(0);
      }
    });

    it("should handle memory just below delete threshold", () => {
      const memory = createTestMemory({
        importance_score: 0.04,
        access_count: 0,
        created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        metadata: {},
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, {
        archive_threshold: 0.2,
        delete_threshold: 0.05,
        decay_factor: 1.0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Score: 0.04, is garbage
        // 0.04 < 0.05, so should be deleted
        expect(result.value.deleted).toBe(1);
      }
    });

    it("should handle memory just under garbage age threshold", () => {
      // Use 29 days instead of exactly 30 to avoid timing issues
      // where test execution time pushes the age slightly over 30
      const memory = createTestMemory({
        importance_score: 0.03,
        access_count: 0,
        created_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 days
        metadata: {},
      });
      insertTestMemory(db, memory);

      const result = runDecay(db, { garbage_age_days: 30, decay_factor: 1.0 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Age is ~29 days, which is < 30, so not garbage
        // Score is 0.03 < 0.2 (archive_threshold), so should be archived
        expect(result.value.archived).toBe(1);
        expect(result.value.deleted).toBe(0);
      }
    });
  });

  describe("Performance", () => {
    let db: Database;

    beforeEach(() => {
      db = createTestDatabase();
    });

    afterEach(() => {
      closeTestDatabase(db);
    });

    it("should process 1,000 memories in <1s", () => {
      const memories = Array.from({ length: 1000 }, (_, i) =>
        createTestMemory({
          id: `mem_${i}`,
          importance_score: Math.random(),
          access_count: Math.floor(Math.random() * 20),
        }),
      );

      insertTestMemories(db, memories);

      const startTime = Date.now();
      const result = runDecay(db);
      const duration = Date.now() - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(1000); // <1s

      if (result.isOk()) {
        console.log(`Processed 1,000 memories in ${duration}ms`);
      }
    });

    it("should process 10,000 memories in <5s", () => {
      const memories = Array.from({ length: 10000 }, (_, i) =>
        createTestMemory({
          id: `mem_${i}`,
          importance_score: Math.random(),
          access_count: Math.floor(Math.random() * 20),
        }),
      );

      insertTestMemories(db, memories);

      const startTime = Date.now();
      const result = runDecay(db);
      const duration = Date.now() - startTime;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(5000); // <5s

      if (result.isOk()) {
        console.log(`Processed 10,000 memories in ${duration}ms`);
        console.log(
          `Results: kept=${result.value.kept}, archived=${result.value.archived}, deleted=${result.value.deleted}`,
        );
      }
    });
  });

  describe("Input Schema Validation", () => {
    it("should validate correct input", () => {
      const input = {
        decay_factor: 0.95,
        archive_threshold: 0.2,
        delete_threshold: 0.05,
        garbage_age_days: 30,
        dry_run: true,
      };

      const result = MemoryDecayInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should allow partial input", () => {
      const input = {
        decay_factor: 0.9,
      };

      const result = MemoryDecayInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject empty object", () => {
      const input = {};

      // Empty object should be valid (all fields optional)
      const result = MemoryDecayInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject invalid decay_factor", () => {
      const input = {
        decay_factor: 1.5,
      };

      const result = MemoryDecayInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject negative garbage_age_days", () => {
      const input = {
        garbage_age_days: -1,
      };

      const result = MemoryDecayInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});
