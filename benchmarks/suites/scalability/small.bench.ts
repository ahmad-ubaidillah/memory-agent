/**
 * Scalability Benchmark Suite - Small Dataset (100 memories)
 *
 * Tests system performance with a small dataset to establish baseline metrics.
 * Target: All operations should be very fast with 100 memories.
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
 * Seed database with 100 memories
 */
function seedSmallDatabase(
  db: Database,
  options?: {
    topicPattern?: boolean;
    varyImportance?: boolean;
    includeVectors?: boolean;
  },
): void {
  const topics = ["decision", "bug", "api", "general"];

  const memories = Array.from({ length: 100 }, (_, i) => {
    const memory = createTestMemory({
      id: `small_scale_${i}`,
      content_raw: `Small dataset memory ${i} with keywords like database, API, performance, and testing for benchmark purposes`,
      topic: options?.topicPattern ? topics[i % topics.length] : "general",
      importance_score: options?.varyImportance ? Math.random() : 0.5,
      access_count: Math.floor(Math.random() * 20),
    });

    if (options?.includeVectors) {
      memory.vector = Array.from({ length: 384 }, () => Math.random());
    }

    return memory;
  });

  insertTestMemories(db, memories);
}

/**
 * Small Scalability Benchmark Suite
 */
export const smallScalabilitySuite: BenchmarkSuite = {
  name: "Scalability - Small (100 memories)",
  description: "Performance benchmarks with small dataset (100 memories)",
  category: "scalability",

  async setup() {
    console.log("   Setting up small scalability suite (100 memories)...");
  },

  async teardown() {
    console.log("   Tearing down small scalability suite...");
  },

  benchmarks: [
    // ==================== INITIALIZATION ====================
    {
      name: "scale_100_init",
      description: "Initialize database with 100 memories",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);
        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_init_with_vectors",
      description: "Initialize database with 100 memories including vectors",
      iterations: 5,
      warmupIterations: 1,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { includeVectors: true });
        closeTestDatabase(db);
      },
    },

    // ==================== QUERY OPERATIONS ====================
    {
      name: "scale_100_query_all",
      description: "Query all 100 memories",
      iterations: 50,
      warmupIterations: 5,
      target: PERFORMANCE_TARGETS.find(
        (t) => t.operation === "memory_query_100",
      ),
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const stmt = db.prepare("SELECT * FROM memory_facts");
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_query_topic",
      description: "Query by topic (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
          ORDER BY importance_score DESC
          LIMIT 20
        `);
        stmt.all("decision");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_query_importance",
      description: "Query by importance threshold (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score >= ?
          ORDER BY importance_score DESC
          LIMIT 10
        `);
        stmt.all(0.5);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_query_complex",
      description: "Complex query with multiple filters (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { topicPattern: true, varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
            AND importance_score >= ?
            AND status = ?
          ORDER BY importance_score DESC
          LIMIT 15
        `);
        stmt.all("decision", 0.3, "active");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_query_text_search",
      description: "Text search query (100 memories)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

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

    // ==================== STORE OPERATIONS ====================
    {
      name: "scale_100_store_single",
      description: "Store single memory (100 in db)",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const memory = createTestMemory({
          id: `new_mem_${Date.now()}_${Math.random()}`,
          content_raw: "New memory added during benchmark",
          topic: "benchmark",
          importance_score: 0.75,
        });
        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_store_batch_10",
      description: "Store batch of 10 memories (100 in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const memories = Array.from({ length: 10 }, (_, i) =>
          createTestMemory({
            id: `batch_10_${Date.now()}_${i}_${Math.random()}`,
            content_raw: `Batch memory ${i}`,
            topic: "batch",
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
      name: "scale_100_store_batch_25",
      description: "Store batch of 25 memories (100 in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const memories = Array.from({ length: 25 }, (_, i) =>
          createTestMemory({
            id: `batch_25_${Date.now()}_${i}_${Math.random()}`,
            content_raw: `Batch memory ${i}`,
            topic: "batch",
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

    // ==================== UPDATE OPERATIONS ====================
    {
      name: "scale_100_update_single",
      description: "Update single memory (100 in db)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(0.95, new Date().toISOString(), "small_scale_0");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_update_batch",
      description: "Batch update memories (100 in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { topicPattern: true });

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET access_count = access_count + 1, updated_at = ?
          WHERE topic = ?
        `);
        stmt.run(new Date().toISOString(), "decision");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_increment_access",
      description: "Increment access counter (100 in db)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET access_count = access_count + 1, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(new Date().toISOString(), "small_scale_50");

        closeTestDatabase(db);
      },
    },

    // ==================== DELETE OPERATIONS ====================
    {
      name: "scale_100_delete_single",
      description: "Delete single memory (100 in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        // Add a memory to delete
        const memory = createTestMemory({
          id: `to_delete_${Date.now()}`,
          content_raw: "Memory to delete",
        });
        insertTestMemory(db, memory);

        const stmt = db.prepare("DELETE FROM memory_facts WHERE id = ?");
        stmt.run(memory.id);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_soft_delete",
      description: "Soft delete by status update (100 in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET status = 'archived', archived_at = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(
          new Date().toISOString(),
          new Date().toISOString(),
          "small_scale_0",
        );

        closeTestDatabase(db);
      },
    },

    // ==================== AGGREGATION OPERATIONS ====================
    {
      name: "scale_100_count_all",
      description: "Count all memories (100)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const stmt = db.prepare("SELECT COUNT(*) as count FROM memory_facts");
        stmt.get();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_group_by_topic",
      description: "Group by topic with count (100)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { topicPattern: true });

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
      name: "scale_100_stats_calculation",
      description: "Calculate comprehensive statistics (100)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { varyImportance: true });

        // Simulate memory_stats operation
        const stmt = db.prepare(`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
            AVG(importance_score) as avg_importance,
            SUM(access_count) as total_accesses
          FROM memory_facts
        `);
        stmt.get();

        closeTestDatabase(db);
      },
    },

    // ==================== CONCURRENT OPERATIONS ====================
    {
      name: "scale_100_concurrent_reads",
      description: "10 sequential reads (100 in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { topicPattern: true });

        const topics = ["decision", "bug", "api", "general"];
        for (const topic of topics) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts WHERE topic = ? LIMIT 10
          `);
          stmt.all(topic);
        }

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_mixed_workload",
      description: "Mixed workload: 5 reads, 3 writes, 2 updates",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { topicPattern: true });

        // 5 reads
        for (let i = 0; i < 5; i++) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts WHERE topic = ? LIMIT 10
          `);
          stmt.all(["decision", "api", "bug", "general", "decision"][i]);
        }

        // 3 writes
        for (let i = 0; i < 3; i++) {
          const memory = createTestMemory({
            id: `mixed_write_${Date.now()}_${i}`,
            content_raw: `Mixed workload write ${i}`,
          });
          insertTestMemory(db, memory);
        }

        // 2 updates
        for (let i = 0; i < 2; i++) {
          const stmt = db.prepare(`
            UPDATE memory_facts
            SET access_count = access_count + 1
            WHERE id = ?
          `);
          stmt.run(`small_scale_${i * 10}`);
        }

        closeTestDatabase(db);
      },
    },

    // ==================== EXPORT/IMPORT SIMULATION ====================
    {
      name: "scale_100_export_all",
      description: "Export all 100 memories to JSON",
      iterations: 20,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const stmt = db.prepare("SELECT * FROM memory_facts");
        const memories = stmt.all();

        // Simulate JSON serialization
        const json = JSON.stringify(memories);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_import_10",
      description: "Import 10 new memories (100 in db)",
      iterations: 20,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db);

        const memories = Array.from({ length: 10 }, (_, i) =>
          createTestMemory({
            id: `import_${Date.now()}_${i}_${Math.random()}`,
            content_raw: `Imported memory ${i}`,
            topic: "imported",
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

    // ==================== VECTOR OPERATIONS ====================
    {
      name: "scale_100_vector_store",
      description: "Store memory with vector (100 in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { includeVectors: true });

        const memory = createTestMemory({
          id: `vector_store_${Date.now()}`,
          content_raw: "Memory with vector",
          vector: Array.from({ length: 384 }, () => Math.random()),
        });
        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_100_vector_retrieve",
      description: "Retrieve memories with vectors (100)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { includeVectors: true });

        const stmt = db.prepare(`
          SELECT id, content_raw, vector FROM memory_facts
          WHERE vector IS NOT NULL
          LIMIT 20
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    // ==================== DECAY SIMULATION ====================
    {
      name: "scale_100_decay_simulation",
      description: "Simulate decay operation on 100 memories",
      iterations: 20,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedSmallDatabase(db, { varyImportance: true });

        // Simulate decay: update all importance scores
        db.run(
          `
          UPDATE memory_facts
          SET importance_score = importance_score * 0.95,
              updated_at = ?
        `,
          [new Date().toISOString()],
        );

        // Archive low importance
        db.run(
          `
          UPDATE memory_facts
          SET status = 'archived', archived_at = ?
          WHERE importance_score < 0.2 AND status = 'active'
        `,
          [new Date().toISOString()],
        );

        closeTestDatabase(db);
      },
    },
  ],
};

export default smallScalabilitySuite;
