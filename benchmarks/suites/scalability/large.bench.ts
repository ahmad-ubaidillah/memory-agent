/**
 * Scalability Benchmark Suite - Large Dataset (10,000 memories)
 *
 * Tests system performance with a large dataset to validate scalability.
 * Target: All operations should meet PRD targets with 10K memories.
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
function seedLargeDatabase(
  db: Database,
  count: number,
  options?: {
    topicPattern?: boolean;
    varyImportance?: boolean;
    includeVectors?: boolean;
    includeMetadata?: boolean;
  },
): void {
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

  const memories = Array.from({ length: count }, (_, i) => {
    const memory = createTestMemory({
      id: `large_scale_${i}`,
      content_raw: `Large scale test memory ${i} with content about ${topics[i % topics.length]}, database operations, API endpoints, and performance testing scenarios`,
      topic: options?.topicPattern ? topics[i % topics.length] : "general",
      importance_score: options?.varyImportance ? Math.random() : 0.5,
      access_count: Math.floor(Math.random() * 50),
    });

    if (options?.includeVectors) {
      memory.vector = Array.from({ length: 384 }, () => Math.random());
    }

    if (options?.includeMetadata) {
      memory.metadata = {
        index: i,
        batch: Math.floor(i / 1000),
        tags: [`tag_${i % 10}`, `batch_${Math.floor(i / 1000)}`],
      };
    }

    return memory;
  });

  // Use transaction for bulk insert
  const transaction = db.transaction(() => {
    for (const memory of memories) {
      insertTestMemory(db, memory);
    }
  });

  transaction();
}

/**
 * Large Scalability Benchmark Suite
 */
export const largeScalabilitySuite: BenchmarkSuite = {
  name: "Scalability - Large (10K memories)",
  description:
    "Performance benchmarks with large dataset (10,000 memories)",
  category: "scalability",

  async setup() {
    console.log("   Setting up large scalability suite (10K memories)...");
  },

  async teardown() {
    console.log("   Tearing down large scalability suite...");
  },

  benchmarks: [
    // ==================== INITIALIZATION ====================
    {
      name: "scale_10k_init",
      description: "Initialize database with 10K memories",
      iterations: 5,
      warmupIterations: 1,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, {
          topicPattern: true,
          varyImportance: true,
        });
        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_init_with_vectors",
      description: "Initialize database with 10K memories including vectors",
      iterations: 3,
      warmupIterations: 1,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, {
          topicPattern: true,
          varyImportance: true,
          includeVectors: true,
        });
        closeTestDatabase(db);
      },
    },

    // ==================== QUERY OPERATIONS ====================
    {
      name: "scale_10k_query_all",
      description: "Query all 10K memories",
      iterations: 20,
      warmupIterations: 3,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_query_10k"),
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare("SELECT * FROM memory_facts");
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_query_topic",
      description: "Query by topic (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic = ?
          ORDER BY importance_score DESC
          LIMIT 50
        `);
        stmt.all("decision");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_query_importance",
      description: "Query by importance threshold (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score >= ?
          ORDER BY importance_score DESC
          LIMIT 50
        `);
        stmt.all(0.7);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_query_complex",
      description: "Complex query with multiple filters (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, {
          topicPattern: true,
          varyImportance: true,
        });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic IN (?, ?, ?)
            AND importance_score >= ?
            AND status = ?
            AND access_count > ?
          ORDER BY importance_score DESC, created_at DESC
          LIMIT 25
        `);
        stmt.all("decision", "api", "architecture", 0.5, "active", 5);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_query_text_search",
      description: "Text search query (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 20
        `);
        stmt.all("%performance%");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_query_pagination",
      description: "Paginated query (10K memories)",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const offset = Math.floor(Math.random() * 10) * 50;
        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY created_at DESC
          LIMIT 50 OFFSET ?
        `);
        stmt.all(offset);

        closeTestDatabase(db);
      },
    },

    // ==================== STORE OPERATIONS ====================
    {
      name: "scale_10k_store_single",
      description: "Store single memory (10K in db)",
      iterations: 50,
      warmupIterations: 5,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_store"),
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const memory = createTestMemory({
          id: `new_mem_${Date.now()}`,
          content_raw: "New memory added to large database",
          topic: "testing",
          importance_score: 0.8,
        });
        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_store_batch_100",
      description: "Store batch of 100 memories (10K in db)",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const memories = Array.from({ length: 100 }, (_, i) =>
          createTestMemory({
            id: `batch_100_${i}_${Date.now()}`,
            content_raw: `Batch memory ${i}`,
            topic: "batch",
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

    // ==================== UPDATE OPERATIONS ====================
    {
      name: "scale_10k_update_single",
      description: "Update single memory (10K in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(0.95, new Date().toISOString(), "large_scale_5000");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_update_batch",
      description: "Batch update 100 memories (10K in db)",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { topicPattern: true });

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = importance_score * 1.1,
              updated_at = ?
          WHERE topic = ?
        `);
        stmt.run(new Date().toISOString(), "decision");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_increment_access",
      description: "Increment access counter (10K in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET access_count = access_count + 1,
              updated_at = ?
          WHERE id = ?
        `);
        stmt.run(new Date().toISOString(), "large_scale_5000");

        closeTestDatabase(db);
      },
    },

    // ==================== DELETE OPERATIONS ====================
    {
      name: "scale_10k_delete_single",
      description: "Delete single memory (10K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare("DELETE FROM memory_facts WHERE id = ?");
        stmt.run("large_scale_5000");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_soft_delete",
      description: "Soft delete by status update (10K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

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
          "large_scale_5000",
        );

        closeTestDatabase(db);
      },
    },

    // ==================== AGGREGATION OPERATIONS ====================
    {
      name: "scale_10k_count_all",
      description: "Count all memories (10K)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare("SELECT COUNT(*) as count FROM memory_facts");
        stmt.get();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_count_by_topic",
      description: "Count memories by topic (10K)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { topicPattern: true });

        const stmt = db.prepare(`
          SELECT topic, COUNT(*) as count
          FROM memory_facts
          GROUP BY topic
          ORDER BY count DESC
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_avg_importance",
      description: "Calculate average importance (10K)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT
            AVG(importance_score) as avg_importance,
            MIN(importance_score) as min_importance,
            MAX(importance_score) as max_importance
          FROM memory_facts
        `);
        stmt.get();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_top_memories",
      description: "Get top 100 memories by importance (10K)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { varyImportance: true });

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY importance_score DESC
          LIMIT 100
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    // ==================== DECAY SIMULATION ====================
    {
      name: "scale_10k_decay_simulation",
      description: "Simulate decay operation on 10K memories",
      iterations: 10,
      warmupIterations: 2,
      target: PERFORMANCE_TARGETS.find((t) => t.operation === "memory_decay_10k"),
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { varyImportance: true });

        // Simulate decay: update all importance scores
        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = importance_score * 0.95,
              updated_at = ?
          WHERE status = 'active'
        `);
        stmt.run(new Date().toISOString());

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_archive_low_importance",
      description: "Archive low importance memories (10K)",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { varyImportance: true });

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET status = 'archived',
              archived_at = ?,
              updated_at = ?
          WHERE importance_score < 0.2
            AND status = 'active'
        `);
        stmt.run(
          new Date().toISOString(),
          new Date().toISOString(),
        );

        closeTestDatabase(db);
      },
    },

    // ==================== MIXED WORKLOADS ====================
    {
      name: "scale_10k_read_heavy",
      description: "Read-heavy workload: 90% reads, 10% writes",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { topicPattern: true });

        // 9 reads
        for (let i = 0; i < 9; i++) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts
            WHERE topic = ?
            LIMIT 10
          `);
          stmt.all(["decision", "api", "bug", "architecture"][i % 4]);
        }

        // 1 write
        const memory = createTestMemory({
          id: `read_heavy_${Date.now()}`,
          content_raw: "Read heavy workload memory",
        });
        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_write_heavy",
      description: "Write-heavy workload: 30% reads, 70% writes",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        // 3 reads
        for (let i = 0; i < 3; i++) {
          const stmt = db.prepare("SELECT * FROM memory_facts LIMIT 10");
          stmt.all();
        }

        // 7 writes
        for (let i = 0; i < 7; i++) {
          const memory = createTestMemory({
            id: `write_heavy_${i}_${Date.now()}`,
            content_raw: `Write heavy workload memory ${i}`,
          });
          insertTestMemory(db, memory);
        }

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_balanced",
      description: "Balanced workload: 50% reads, 50% writes",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { varyImportance: true });

        // 5 reads
        for (let i = 0; i < 5; i++) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts
            WHERE importance_score > ?
            LIMIT 10
          `);
          stmt.all(Math.random());
        }

        // 5 writes
        for (let i = 0; i < 5; i++) {
          const memory = createTestMemory({
            id: `balanced_${i}_${Date.now()}`,
            content_raw: `Balanced workload memory ${i}`,
            importance_score: Math.random(),
          });
          insertTestMemory(db, memory);
        }

        closeTestDatabase(db);
      },
    },

    // ==================== STRESS TESTS ====================
    {
      name: "scale_10k_concurrent_reads_sim",
      description: "Simulate 20 concurrent reads (10K in db)",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000, { topicPattern: true });

        const topics = ["decision", "bug", "api", "architecture", "general"];

        // Simulate concurrent reads (sequential in nature but testing throughput)
        for (const topic of topics) {
          for (let j = 0; j < 4; j++) {
            const stmt = db.prepare(`
              SELECT * FROM memory_facts
              WHERE topic = ?
              ORDER BY importance_score DESC
              LIMIT 20
            `);
            stmt.all(topic);
          }
        }

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_10k_large_result_set",
      description: "Query returning 500 results (10K in db)",
      iterations: 15,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedLargeDatabase(db, 10000);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          ORDER BY created_at DESC
          LIMIT 500
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },
  ],
};

export default largeScalabilitySuite;
