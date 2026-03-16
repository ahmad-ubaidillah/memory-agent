/**
 * Memory Store Benchmark Suite
 *
 * Benchmarks the memory_store operation with various content sizes and configurations.
 * Uses actual database operations to measure real performance.
 * Target: P99 < 10ms
 */

import type { BenchmarkSuite } from "../../types";
import { PERFORMANCE_TARGETS } from "../../types";
import {
  createTestDatabase,
  insertTestMemory,
  closeTestDatabase,
  type TestDatabase,
} from "../../../tests/helpers/test-db";
import { createTestMemory } from "../../../tests/fixtures/memories";
import { Database } from "bun:sqlite";

/**
 * Generate test content of various sizes
 */
function generateTestContent(
  size: "small" | "medium" | "large" | "xlarge",
): string {
  const sizes = {
    small: 50, // 50 characters
    medium: 500, // 500 characters
    large: 5000, // 5000 characters
    xlarge: 50000, // 50000 characters (near max limit)
  };

  const length = sizes[size];
  const words = [
    "decision",
    "implemented",
    "feature",
    "architecture",
    "database",
    "API",
    "endpoint",
    "performance",
    "optimization",
    "testing",
    "memory",
    "storage",
    "retrieval",
    "semantic",
    "vector",
    "embedding",
    "model",
    "context",
    "prompt",
    "response",
  ];

  let content = "";
  while (content.length < length) {
    content += words[Math.floor(Math.random() * words.length)] + " ";
  }

  return content.trim().substring(0, length);
}

/**
 * Store Benchmark Suite
 */
export const storeBenchmarkSuite: BenchmarkSuite = {
  name: "memory_store",
  description:
    "Benchmarks for the memory_store operation with actual database operations",
  category: "tools",

  async setup() {
    console.log("   Setting up store benchmark suite...");
  },

  async teardown() {
    console.log("   Tearing down store benchmark suite...");
  },

  benchmarks: [
    // ==================== BASIC STORE OPERATIONS ====================
    {
      name: "store_small_content",
      description: "Store small content (50 chars)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("small"),
          topic: "test",
          importance_score: 0.5,
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_medium_content",
      description: "Store medium content (500 chars)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          topic: "test",
          importance_score: 0.7,
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_large_content",
      description: "Store large content (5000 chars)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("large"),
          topic: "test",
          importance_score: 0.9,
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_xlarge_content",
      description: "Store extra large content (50000 chars)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("xlarge"),
          topic: "test",
          importance_score: 0.5,
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    // ==================== METADATA VARIATIONS ====================
    {
      name: "store_with_simple_metadata",
      description: "Store with simple metadata",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          topic: "decision",
          importance_score: 0.85,
          metadata: {
            decision_date: new Date().toISOString().split("T")[0],
            decided_by: "benchmark",
          },
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_with_complex_metadata",
      description: "Store with complex nested metadata",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          topic: "decision",
          importance_score: 0.85,
          metadata: {
            decision_date: new Date().toISOString().split("T")[0],
            decided_by: "benchmark",
            tags: ["performance", "test", "benchmark", "store", "memory"],
            version: 1,
            critical: true,
            context: {
              project: "memory-agent-mcp",
              environment: "testing",
              details: {
                reason: "Performance validation",
                impact: "high",
                stakeholders: ["dev", "qa", "pm"],
              },
            },
            array_data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          },
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    // ==================== TOPIC VARIATIONS ====================
    {
      name: "store_various_topics",
      description: "Store with different topics",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const topics = [
          "decision",
          "bug",
          "api",
          "architecture",
          "general",
          "testing",
          "performance",
          "security",
        ];
        const topic = topics[Math.floor(Math.random() * topics.length)];

        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          topic,
          importance_score: Math.random() * 0.5 + 0.5,
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    // ==================== IMPORTANCE VARIATIONS ====================
    {
      name: "store_high_importance",
      description: "Store with high importance score (1.0)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          topic: "critical",
          importance_score: 1.0,
          metadata: {
            critical: true,
            verified: true,
          },
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_low_importance",
      description: "Store with low importance score (0.1)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("small"),
          topic: "general",
          importance_score: 0.1,
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    // ==================== MINIMAL OPERATIONS ====================
    {
      name: "store_minimal",
      description: "Store with minimal parameters (defaults)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("small"),
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    // ==================== VECTOR OPERATIONS ====================
    {
      name: "store_with_small_vector",
      description: "Store with small embedding vector (128 dims)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          vector: Array.from({ length: 128 }, () => Math.random()),
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_with_medium_vector",
      description: "Store with medium embedding vector (384 dims)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          vector: Array.from({ length: 384 }, () => Math.random()),
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_with_large_vector",
      description: "Store with large embedding vector (768 dims)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          vector: Array.from({ length: 768 }, () => Math.random()),
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_with_xlarge_vector",
      description: "Store with extra large embedding vector (1536 dims)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw: generateTestContent("medium"),
          vector: Array.from({ length: 1536 }, () => Math.random()),
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    // ==================== BURST OPERATIONS ====================
    {
      name: "store_burst_10",
      description: "Burst: 10 rapid sequential stores",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();

        for (let i = 0; i < 10; i++) {
          const memory = createTestMemory({
            id: `burst_10_${i}_${Date.now()}_${Math.random()}`,
            content_raw: generateTestContent("small"),
            topic: "burst",
            importance_score: 0.5,
          });
          insertTestMemory(db, memory);
        }

        closeTestDatabase(db);
      },
    },

    {
      name: "store_burst_10_transaction",
      description: "Burst: 10 stores in single transaction",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        const memories = Array.from({ length: 10 }, (_, i) =>
          createTestMemory({
            id: `burst_txn_10_${i}_${Date.now()}_${Math.random()}`,
            content_raw: generateTestContent("small"),
            topic: "burst",
            importance_score: 0.5,
          }),
        );

        const transaction = db.transaction(() => {
          for (const memory of memories) {
            insertTestMemory(db, memory);
          }
        });

        transaction();
        closeTestDatabase(db);
      },
    },

    {
      name: "store_burst_50_transaction",
      description: "Burst: 50 stores in single transaction",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        const memories = Array.from({ length: 50 }, (_, i) =>
          createTestMemory({
            id: `burst_txn_50_${i}_${Date.now()}_${Math.random()}`,
            content_raw: generateTestContent("small"),
            topic: "burst",
            importance_score: 0.5,
          }),
        );

        const transaction = db.transaction(() => {
          for (const memory of memories) {
            insertTestMemory(db, memory);
          }
        });

        transaction();
        closeTestDatabase(db);
      },
    },

    {
      name: "store_burst_100_transaction",
      description: "Burst: 100 stores in single transaction",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        const memories = Array.from({ length: 100 }, (_, i) =>
          createTestMemory({
            id: `burst_txn_100_${i}_${Date.now()}_${Math.random()}`,
            content_raw: generateTestContent("small"),
            topic: "burst",
            importance_score: 0.5,
          }),
        );

        const transaction = db.transaction(() => {
          for (const memory of memories) {
            insertTestMemory(db, memory);
          }
        });

        transaction();
        closeTestDatabase(db);
      },
    },

    // ==================== REALISTIC WORKLOADS ====================
    {
      name: "store_realistic_decision",
      description: "Store realistic decision memory",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw:
            "Decided to use PostgreSQL for the database layer instead of MongoDB. " +
            "This decision was made because PostgreSQL offers better JSON support with JSONB, " +
            "has better transaction support, and the team has more experience with SQL databases. " +
            "The migration plan includes: 1) Create schema, 2) Migrate existing data, 3) Update queries.",
          topic: "decision",
          importance_score: 0.9,
          metadata: {
            decision_date: new Date().toISOString().split("T")[0],
            decided_by: "team-lead",
            project: "memory-agent-mcp",
            alternatives_considered: ["MongoDB", "SQLite", "DynamoDB"],
            impact: "high",
          },
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_realistic_bug",
      description: "Store realistic bug report memory",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw:
            "Bug found in memory decay function: memories with access_count = 0 were being " +
            "incorrectly deleted even when they had important metadata. Root cause: the isGarbage() " +
            "function was checking metadata before checking access_count. Fix: reordered the conditions " +
            "to check access_count first for early return.",
          topic: "bug",
          importance_score: 0.85,
          metadata: {
            bug_id: "BUG-2024-001",
            severity: "high",
            status: "fixed",
            fixed_date: new Date().toISOString().split("T")[0],
            affected_components: ["decay", "garbage-detection"],
          },
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },

    {
      name: "store_realistic_api",
      description: "Store realistic API documentation memory",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          content_raw:
            "API Endpoint: POST /api/memories/store - Stores a new memory in the database. " +
            "Request body: { content: string, topic?: string, importance?: number, metadata?: object }. " +
            "Response: { success: boolean, memory_id: string, timestamp: string }. " +
            "Authentication: Bearer token required. Rate limit: 100 requests/minute.",
          topic: "api",
          importance_score: 0.7,
          metadata: {
            endpoint: "/api/memories/store",
            method: "POST",
            auth_required: true,
            rate_limit: "100/min",
          },
        });

        insertTestMemory(db, memory);
        closeTestDatabase(db);
      },
    },
  ],
};

export default storeBenchmarkSuite;
