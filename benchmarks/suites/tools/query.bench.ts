/**
 * Query Benchmark Suite
 *
 * Benchmarks memory_query operation performance with actual database operations.
 * Tests various query scenarios and dataset sizes.
 * Target: P99 < 50ms (100 memories), P99 < 200ms (10K memories)
 */

import type { BenchmarkSuite } from "../../types";
import { PERFORMANCE_TARGETS } from "../../types";
import {
  createTestDatabase,
  insertTestMemory,
  insertTestMemories,
  closeTestDatabase,
} from "../../../tests/helpers/test-db";
import { createTestMemory } from "../../../tests/fixtures/memories";
import { Database } from "bun:sqlite";

/**
 * Seed database with specified number of memories
 */
function seedDatabase(
  db: Database,
  count: number,
  options?: { topicPattern?: boolean; varyImportance?: boolean },
): void {
  const topics = [
    "decision",
    "bug",
    "api",
    "architecture",
    "general",
    "testing",
  ];

  const memories = Array.from({ length: count }, (_, i) =>
    createTestMemory({
      id: `query_seed_${i}`,
      content_raw: `Test memory content ${i} with various keywords like database, API, performance, and testing`,
      topic: options?.topicPattern ? topics[i % topics.length] : "general",
      importance_score: options?.varyImportance ? Math.random() : 0.5,
      access_count: Math.floor(Math.random() * 20),
    }),
  );

  insertTestMemories(db, memories);
}

/**
 * Query Benchmark Suite
 */
export const queryBenchmarkSuite: BenchmarkSuite = {
  name: "memory_query",
  description:
    "Benchmark memory query operations with actual database operations",
  category: "tools",

  async setup() {
    console.log("   Setting up query benchmark suite...");
  },

  async teardown() {
    console.log("   Tearing down query benchmark suite...");
  },

  benchmarks: [
    // ==================== SMALL DATASET (100 memories) ====================
    {
      name: "query_simple_100",
      description: "Simple text query with 100 memories",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find(
        (t) => t.operation === "memory_query_100",
      ),
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 100);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all("%database%");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_topic_filter_100",
      description: "Query with topic filter (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 100, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
          ORDER BY created_at DESC
          LIMIT 20
        `);
        stmt.all("decision");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_importance_filter_100",
      description: "Query with importance threshold (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 100, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score >= ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all(0.7);

        closeTestDatabase(db);
      },
    },

    {
      name: "query_complex_filter_100",
      description: "Query with multiple filters (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 100, { topicPattern: true, varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
            AND importance_score >= ?
            AND status = ?
          ORDER BY importance_score DESC, created_at DESC
          LIMIT 15
        `);
        stmt.all("decision", 0.5, "active");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_pagination_100",
      description: "Query with pagination (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 100);

        const offset = Math.floor(Math.random() * 5) * 10;
        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY created_at DESC
          LIMIT 10 OFFSET ?
        `);
        stmt.all(offset);

        closeTestDatabase(db);
      },
    },

    // ==================== MEDIUM DATASET (1K memories) ====================
    {
      name: "query_simple_1k",
      description: "Simple text query with 1K memories",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all("%performance%");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_topic_filter_1k",
      description: "Query with topic filter (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
          ORDER BY created_at DESC
          LIMIT 20
        `);
        stmt.all("api");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_importance_filter_1k",
      description: "Query with importance threshold (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score >= ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all(0.8);

        closeTestDatabase(db);
      },
    },

    {
      name: "query_complex_filter_1k",
      description: "Query with multiple filters (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { topicPattern: true, varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic IN (?, ?, ?)
            AND importance_score >= ?
            AND status = ?
          ORDER BY importance_score DESC
          LIMIT 20
        `);
        stmt.all("decision", "api", "architecture", 0.6, "active");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_full_scan_1k",
      description: "Full table scan (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare("SELECT * FROM memory_facts");
        stmt.all();

        closeTestDatabase(db);
      },
    },

    // ==================== LARGE DATASET (10K memories) ====================
    {
      name: "query_simple_10k",
      description: "Simple text query with 10K memories",
      iterations: 20,
      warmupIterations: 3,
      target: PERFORMANCE_TARGETS.find(
        (t) => t.operation === "memory_query_10k",
      ),
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 10000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all("%testing%");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_topic_filter_10k",
      description: "Query with topic filter (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 10000, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
          ORDER BY importance_score DESC
          LIMIT 20
        `);
        stmt.all("bug");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_importance_filter_10k",
      description: "Query with importance threshold (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 10000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score >= ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all(0.9);

        closeTestDatabase(db);
      },
    },

    {
      name: "query_complex_filter_10k",
      description: "Query with multiple filters (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 10000, { topicPattern: true, varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
            AND importance_score >= ?
            AND status = ?
          ORDER BY importance_score DESC, created_at DESC
          LIMIT 15
        `);
        stmt.all("architecture", 0.7, "active");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_count_10k",
      description: "Count query (10K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 10000, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT COUNT(*) as count FROM memory_facts
          WHERE topic = ?
        `);
        stmt.all("decision");

        closeTestDatabase(db);
      },
    },

    // ==================== AGGREGATION QUERIES ====================
    {
      name: "query_aggregate_avg_importance",
      description: "Calculate average importance score",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT AVG(importance_score) as avg_importance
          FROM memory_facts
        `);
        stmt.get();

        closeTestDatabase(db);
      },
    },

    {
      name: "query_aggregate_group_by_topic",
      description: "Group by topic with count",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT topic, COUNT(*) as count, AVG(importance_score) as avg_importance
          FROM memory_facts
          GROUP BY topic
          ORDER BY count DESC
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "query_aggregate_top_memories",
      description: "Get top 10 memories by importance",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    // ==================== DATE-BASED QUERIES ====================
    {
      name: "query_recent_memories",
      description: "Query memories from last 7 days",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE created_at >= ?
          ORDER BY created_at DESC
          LIMIT 20
        `);
        stmt.all(sevenDaysAgo);

        closeTestDatabase(db);
      },
    },

    {
      name: "query_date_range",
      description: "Query memories within date range",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE created_at BETWEEN ? AND ?
          ORDER BY created_at DESC
          LIMIT 50
        `);
        stmt.all(thirtyDaysAgo, sevenDaysAgo);

        closeTestDatabase(db);
      },
    },

    // ==================== ACCESS PATTERN QUERIES ====================
    {
      name: "query_most_accessed",
      description: "Query most accessed memories",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE access_count > 0
          ORDER BY access_count DESC
          LIMIT 10
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "query_never_accessed",
      description: "Query never accessed memories",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE access_count = 0
          ORDER BY created_at DESC
          LIMIT 20
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    // ==================== TEXT SEARCH VARIATIONS ====================
    {
      name: "query_text_search_single_term",
      description: "Text search with single term",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all("%API%");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_text_search_multiple_terms",
      description: "Text search with multiple OR terms",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ? OR content_raw LIKE ? OR content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all("%database%", "%API%", "%performance%");

        closeTestDatabase(db);
      },
    },

    {
      name: "query_text_search_exact_match",
      description: "Text search with exact phrase",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all("%Test memory content%");

        closeTestDatabase(db);
      },
    },

    // ==================== CONCURRENT QUERY SIMULATION ====================
    {
      name: "query_sequential_10",
      description: "10 sequential queries",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000, { topicPattern: true });

        const topics = ["decision", "bug", "api", "architecture", "general"];

        for (const topic of topics) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts
            WHERE topic = ?
            LIMIT 10
          `);
          stmt.all(topic);
        }

        closeTestDatabase(db);
      },
    },

    // ==================== STATUS-BASED QUERIES ====================
    {
      name: "query_active_memories",
      description: "Query only active memories",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE status = 'active'
          ORDER BY importance_score DESC
          LIMIT 20
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "query_archived_memories",
      description: "Query archived memories",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE status = 'archived'
          ORDER BY archived_at DESC
          LIMIT 20
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    // ==================== RESULT SIZE VARIATIONS ====================
    {
      name: "query_small_result_set",
      description: "Query returning 5 results",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY importance_score DESC
          LIMIT 5
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "query_medium_result_set",
      description: "Query returning 50 results",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY importance_score DESC
          LIMIT 50
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "query_large_result_set",
      description: "Query returning 100 results",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedDatabase(db, 1000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY importance_score DESC
          LIMIT 100
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },
  ],
};

export default queryBenchmarkSuite;
