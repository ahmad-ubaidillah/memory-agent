/**
 * Database Core Benchmark Suite
 *
 * Benchmarks core database operations for Memory-Agent MCP.
 * Tests SQLite performance with various operations and data sizes.
 */

import { Database } from "bun:sqlite";
import type { BenchmarkSuite } from "../../types";
import { createTestDatabase, insertTestMemory, clearTestDatabase, closeTestDatabase } from "../../../tests/helpers/test-db";
import { createTestMemory, SAMPLE_MEMORIES } from "../../../tests/fixtures/memories";

/**
 * Database Benchmark Suite
 */
export const databaseBenchmarkSuite: BenchmarkSuite = {
  name: "Database Operations",
  description: "Benchmarks for core database CRUD operations and indexing performance",
  category: "core",

  /**
   * Setup - Create test database
   */
  async setup() {
    // Database will be created fresh for each benchmark
  },

  /**
   * Teardown - Cleanup
   */
  async teardown() {
    // Cleanup handled by individual benchmarks
  },

  benchmarks: [
    // ==================== INSERT OPERATIONS ====================
    {
      name: "Insert Single Memory",
      description: "Insert a single memory into the database",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory();

        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "Insert with Vector",
      description: "Insert a memory with embedding vector",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          vector: Array.from({ length: 384 }, () => Math.random()),
        });

        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "Insert with Metadata",
      description: "Insert a memory with complex metadata",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({
          metadata: {
            source: "benchmark",
            tags: ["performance", "test", "benchmark"],
            nested: {
              level1: {
                level2: "value",
              },
            },
            array: [1, 2, 3, 4, 5],
          },
        });

        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    // ==================== BATCH INSERT OPERATIONS ====================
    {
      name: "Batch Insert 10 Memories",
      description: "Insert 10 memories in a single transaction",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        const memories = Array.from({ length: 10 }, (_, i) =>
          createTestMemory({ id: `batch_10_${i}_${Date.now()}` })
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
      name: "Batch Insert 100 Memories",
      description: "Insert 100 memories in a single transaction",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        const memories = Array.from({ length: 100 }, (_, i) =>
          createTestMemory({ id: `batch_100_${i}_${Date.now()}` })
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

    // ==================== QUERY OPERATIONS ====================
    {
      name: "Query by ID",
      description: "Retrieve a single memory by ID",
      iterations: 200,
      warmupIterations: 20,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({ id: "query_test_id" });
        insertTestMemory(db, memory);

        const stmt = db.prepare("SELECT * FROM memory_facts WHERE id = ?");
        stmt.get("query_test_id");

        closeTestDatabase(db);
      },
    },

    {
      name: "Query by Topic",
      description: "Query memories by topic with index",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `topic_test_${i}`,
            topic: i % 2 === 0 ? "decision" : "bug",
          });
          insertTestMemory(db, memory);
        }

        // Query by topic
        const stmt = db.prepare("SELECT * FROM memory_facts WHERE topic = ?");
        stmt.all("decision");

        closeTestDatabase(db);
      },
    },

    {
      name: "Query with Limit",
      description: "Query with LIMIT clause",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({ id: `limit_test_${i}` });
          insertTestMemory(db, memory);
        }

        // Query with limit
        const stmt = db.prepare("SELECT * FROM memory_facts LIMIT 10");
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "Query with ORDER BY",
      description: "Query with ordering by importance",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories with varying importance
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `order_test_${i}`,
            importance_score: Math.random(),
          });
          insertTestMemory(db, memory);
        }

        // Query with order
        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "Query with Multiple Filters",
      description: "Query with multiple WHERE conditions",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `filter_test_${i}`,
            topic: i % 2 === 0 ? "decision" : "bug",
            importance_score: 0.5 + (i / 200),
            status: i % 3 === 0 ? "archived" : "active",
          });
          insertTestMemory(db, memory);
        }

        // Query with multiple filters
        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
            AND status = ?
            AND importance_score >= ?
          LIMIT 10
        `);
        stmt.all("decision", "active", 0.5);

        closeTestDatabase(db);
      },
    },

    // ==================== UPDATE OPERATIONS ====================
    {
      name: "Update Single Field",
      description: "Update a single field in a memory",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({ id: "update_test" });
        insertTestMemory(db, memory);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(0.9, new Date().toISOString(), "update_test");

        closeTestDatabase(db);
      },
    },

    {
      name: "Update Multiple Fields",
      description: "Update multiple fields in a memory",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({ id: "update_multi_test" });
        insertTestMemory(db, memory);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = ?,
              status = ?,
              access_count = ?,
              updated_at = ?
          WHERE id = ?
        `);
        stmt.run(0.9, "archived", 10, new Date().toISOString(), "update_multi_test");

        closeTestDatabase(db);
      },
    },

    {
      name: "Increment Counter",
      description: "Increment access counter (common operation)",
      iterations: 200,
      warmupIterations: 20,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({ id: "increment_test" });
        insertTestMemory(db, memory);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET access_count = access_count + 1,
              updated_at = ?
          WHERE id = ?
        `);
        stmt.run(new Date().toISOString(), "increment_test");

        closeTestDatabase(db);
      },
    },

    // ==================== DELETE OPERATIONS ====================
    {
      name: "Delete by ID",
      description: "Delete a single memory by ID",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({ id: `delete_test_${Date.now()}` });
        insertTestMemory(db, memory);

        const stmt = db.prepare("DELETE FROM memory_facts WHERE id = ?");
        stmt.run(memory.id);

        closeTestDatabase(db);
      },
    },

    {
      name: "Delete by Topic",
      description: "Delete all memories with a specific topic",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();

        // Insert memories
        for (let i = 0; i < 50; i++) {
          const memory = createTestMemory({
            id: `delete_topic_${i}_${Date.now()}`,
            topic: "to_delete",
          });
          insertTestMemory(db, memory);
        }

        // Delete by topic
        const stmt = db.prepare("DELETE FROM memory_facts WHERE topic = ?");
        stmt.run("to_delete");

        closeTestDatabase(db);
      },
    },

    {
      name: "Soft Delete (Update Status)",
      description: "Soft delete by updating status to archived",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        const memory = createTestMemory({ id: `soft_delete_${Date.now()}` });
        insertTestMemory(db, memory);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET status = 'archived',
              archived_at = ?,
              updated_at = ?
          WHERE id = ?
        `);
        stmt.run(
          new Date().toISOString(),
          new Date().toISOString(),
          memory.id
        );

        closeTestDatabase(db);
      },
    },

    // ==================== INDEX PERFORMANCE ====================
    {
      name: "Query Without Index",
      description: "Query on non-indexed field",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();

        // Drop the bin_id index if it exists
        try {
          db.run("DROP INDEX IF EXISTS idx_bin");
        } catch {
          // Ignore
        }

        // Insert 1000 memories
        for (let i = 0; i < 1000; i++) {
          const memory = createTestMemory({
            id: `no_index_${i}`,
            bin_id: i % 10,
          });
          insertTestMemory(db, memory);
        }

        // Query on non-indexed field
        const stmt = db.prepare("SELECT * FROM memory_facts WHERE bin_id = ?");
        stmt.all(5);

        closeTestDatabase(db);
      },
    },

    {
      name: "Query With Index",
      description: "Query on indexed field",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();

        // Ensure index exists
        db.run("CREATE INDEX IF NOT EXISTS idx_bin ON memory_facts(bin_id)");

        // Insert 1000 memories
        for (let i = 0; i < 1000; i++) {
          const memory = createTestMemory({
            id: `with_index_${i}`,
            bin_id: i % 10,
          });
          insertTestMemory(db, memory);
        }

        // Query on indexed field
        const stmt = db.prepare("SELECT * FROM memory_facts WHERE bin_id = ?");
        stmt.all(5);

        closeTestDatabase(db);
      },
    },

    // ==================== AGGREGATION OPERATIONS ====================
    {
      name: "Count Query",
      description: "Count total memories",
      iterations: 200,
      warmupIterations: 20,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({ id: `count_test_${i}` });
          insertTestMemory(db, memory);
        }

        // Count query
        const stmt = db.prepare("SELECT COUNT(*) as count FROM memory_facts");
        stmt.get();

        closeTestDatabase(db);
      },
    },

    {
      name: "Group By Query",
      description: "Group memories by topic and count",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories with different topics
        const topics = ["decision", "bug", "api", "general"];
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `group_test_${i}`,
            topic: topics[i % topics.length],
          });
          insertTestMemory(db, memory);
        }

        // Group by query
        const stmt = db.prepare(`
          SELECT topic, COUNT(*) as count
          FROM memory_facts
          GROUP BY topic
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "Average Query",
      description: "Calculate average importance score",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories with varying importance
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `avg_test_${i}`,
            importance_score: Math.random(),
          });
          insertTestMemory(db, memory);
        }

        // Average query
        const stmt = db.prepare(`
          SELECT AVG(importance_score) as avg_importance
          FROM memory_facts
        `);
        stmt.get();

        closeTestDatabase(db);
      },
    },

    // ==================== COMPLEX OPERATIONS ====================
    {
      name: "Full Text Search Simulation",
      description: "Simulate text search with LIKE operator",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();

        // Insert 100 memories with various content
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `search_test_${i}`,
            content_raw: `This is test memory ${i} with some content about ${i % 2 === 0 ? "decision" : "bug"}`,
          });
          insertTestMemory(db, memory);
        }

        // Full text search simulation
        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          LIMIT 10
        `);
        stmt.all("%decision%");

        closeTestDatabase(db);
      },
    },

    {
      name: "Join-like Query",
      description: "Query with correlated subquery",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();

        // Insert memories
        for (let i = 0; i < 100; i++) {
          const memory = createTestMemory({
            id: `join_test_${i}`,
            topic: i % 2 === 0 ? "decision" : "bug",
            importance_score: Math.random(),
          });
          insertTestMemory(db, memory);
        }

        // Query with subquery
        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score > (
            SELECT AVG(importance_score) FROM memory_facts
          )
          LIMIT 10
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },
  ],
};

export default databaseBenchmarkSuite;
