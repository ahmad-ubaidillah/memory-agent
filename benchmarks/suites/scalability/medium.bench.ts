/**
 * Scalability Benchmark Suite - Medium Dataset (1,000 memories)
 *
 * Tests system performance with a medium dataset to validate scaling.
 * Target: All operations should complete efficiently with 1K memories.
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
function seedMediumDatabase(
  db: Database,
  options?: {
    includeVectors?: boolean;
    varyMetadata?: boolean;
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

  const memories = Array.from({ length: 1000 }, (_, i) => {
    const memory = createTestMemory({
      id: `medium_scale_${i}`,
      content_raw: `Medium dataset memory ${i}. Contains various keywords like database, API, performance, testing, architecture, security, and implementation details for benchmark testing purposes.`,
      topic: topics[i % topics.length],
      importance_score: 0.1 + (Math.random() * 0.9),
      access_count: Math.floor(Math.random() * 50),
    });

    if (options?.includeVectors) {
      memory.vector = Array.from({ length: 384 }, () => Math.random());
    }

    if (options?.varyMetadata && i % 5 === 0) {
      memory.metadata = {
        source: "benchmark",
        tags: ["medium", "scalability", `batch-${Math.floor(i / 100)}`],
        created_by: "qa-agent",
        iteration: i,
      };
    }

    return memory;
  });

  insertTestMemories(db, memories);
}

/**
 * Medium Scalability Benchmark Suite
 */
export const mediumScalabilitySuite: BenchmarkSuite = {
  name: "Scalability - Medium (1K memories)",
  description: "Performance benchmarks with medium dataset (1,000 memories)",
  category: "scalability",

  async setup() {
    console.log("   Setting up medium scalability suite (1K memories)...");
  },

  async teardown() {
    console.log("   Tearing down medium scalability suite...");
  },

  benchmarks: [
    // ==================== INITIALIZATION ====================
    {
      name: "scale_1k_init",
      description: "Initialize database with 1K memories",
      iterations: 5,
      warmupIterations: 1,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);
        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_init_with_vectors",
      description: "Initialize database with 1K memories including vectors",
      iterations: 3,
      warmupIterations: 1,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db, { includeVectors: true });
        closeTestDatabase(db);
      },
    },

    // ==================== QUERY OPERATIONS ====================
    {
      name: "scale_1k_query_all",
      description: "Query all 1K memories",
      iterations: 20,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare("SELECT * FROM memory_facts");
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_query_topic",
      description: "Query by topic (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

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
      name: "scale_1k_query_importance",
      description: "Query by importance threshold (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE importance_score >= ?
          ORDER BY importance_score DESC
          LIMIT 20
        `);
        stmt.all(0.7);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_query_complex",
      description: "Complex query with multiple filters (1K memories)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE topic IN (?, ?, ?)
            AND importance_score >= ?
            AND access_count > ?
          ORDER BY importance_score DESC, created_at DESC
          LIMIT 25
        `);
        stmt.all("decision", "api", "architecture", 0.5, 5);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_query_text_search",
      description: "Text search with LIKE (1K memories)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare(`
          SELECT * FROM memory_facts
          WHERE content_raw LIKE ?
          ORDER BY importance_score DESC
          LIMIT 15
        `);
        stmt.all("%performance%");

        closeTestDatabase(db);
      },
    },

    // ==================== STORE OPERATIONS ====================
    {
      name: "scale_1k_store_single",
      description: "Store single memory (1K in db)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const memory = createTestMemory({
          id: `new_memory_${Date.now()}_${Math.random()}`,
          content_raw: "New memory added during benchmark",
          topic: "benchmark",
          importance_score: 0.75,
        });
        insertTestMemory(db, memory);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_store_batch_10",
      description: "Store batch of 10 memories (1K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const memories = Array.from({ length: 10 }, (_, i) =>
          createTestMemory({
            id: `batch_10_${Date.now()}_${i}_${Math.random()}`,
            content_raw: `Batch memory ${i}`,
            topic: "benchmark",
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
      name: "scale_1k_store_batch_50",
      description: "Store batch of 50 memories (1K in db)",
      iterations: 20,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const memories = Array.from({ length: 50 }, (_, i) =>
          createTestMemory({
            id: `batch_50_${Date.now()}_${i}_${Math.random()}`,
            content_raw: `Batch memory ${i}`,
            topic: "benchmark",
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
      name: "scale_1k_update_single",
      description: "Update single memory (1K in db)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare(`
          UPDATE memory_facts
          SET importance_score = ?, updated_at = ?
          WHERE id = ?
        `);
        stmt.run(0.95, new Date().toISOString(), "medium_scale_0");

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_update_batch",
      description: "Update batch of memories (1K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const transaction = db.transaction(() => {
          const stmt = db.prepare(`
            UPDATE memory_facts
            SET access_count = access_count + 1, updated_at = ?
            WHERE topic = ?
          `);
          stmt.run(new Date().toISOString(), "decision");
        });
        transaction();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_archive_batch",
      description: "Archive batch of memories (1K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const transaction = db.transaction(() => {
          const stmt = db.prepare(`
            UPDATE memory_facts
            SET status = 'archived', archived_at = ?, updated_at = ?
            WHERE importance_score < ? AND status = 'active'
          `);
          stmt.run(
            new Date().toISOString(),
            new Date().toISOString(),
            0.3,
          );
        });
        transaction();

        closeTestDatabase(db);
      },
    },

    // ==================== DELETE OPERATIONS ====================
    {
      name: "scale_1k_delete_single",
      description: "Delete single memory (1K in db)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

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
      name: "scale_1k_delete_batch",
      description: "Delete batch by condition (1K in db)",
      iterations: 20,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare(`
          DELETE FROM memory_facts
          WHERE importance_score < ? AND access_count = 0
        `);
        stmt.run(0.2);

        closeTestDatabase(db);
      },
    },

    // ==================== AGGREGATION OPERATIONS ====================
    {
      name: "scale_1k_count_all",
      description: "Count all memories (1K)",
      iterations: 100,
      warmupIterations: 10,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare("SELECT COUNT(*) as count FROM memory_facts");
        stmt.get();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_group_by_topic",
      description: "Group by topic with aggregates (1K)",
      iterations: 50,
      warmupIterations: 5,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare(`
          SELECT
            topic,
            COUNT(*) as count,
            AVG(importance_score) as avg_importance,
            MAX(importance_score) as max_importance,
            MIN(importance_score) as min_importance
          FROM memory_facts
          GROUP BY topic
          ORDER BY count DESC
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_stats_calculation",
      description: "Calculate comprehensive statistics (1K)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

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

    // ==================== DECAY SIMULATION ====================
    {
      name: "scale_1k_decay_simulation",
      description: "Simulate decay operation on 1K memories",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        // Simulate decay: update all importance scores
        const transaction = db.transaction(() => {
          db.run(`
            UPDATE memory_facts
            SET importance_score = importance_score * 0.95,
                updated_at = ?
          `, [new Date().toISOString()]);

          // Archive low importance
          db.run(`
            UPDATE memory_facts
            SET status = 'archived', archived_at = ?
            WHERE importance_score < 0.2 AND status = 'active'
          `, [new Date().toISOString()]);
        });
        transaction();

        closeTestDatabase(db);
      },
    },

    // ==================== CONCURRENT OPERATIONS ====================
    {
      name: "scale_1k_sequential_reads_10",
      description: "10 sequential read operations (1K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const topics = ["decision", "bug", "api", "architecture", "general"];
        for (const topic of topics) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts WHERE topic = ? LIMIT 20
          `);
          stmt.all(topic);
        }

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_mixed_workload",
      description: "Mixed workload: reads, writes, updates (1K)",
      iterations: 20,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        // 5 reads
        for (let i = 0; i < 5; i++) {
          const stmt = db.prepare(`
            SELECT * FROM memory_facts WHERE topic = ? LIMIT 10
          `);
          stmt.all(["decision", "api", "bug", "architecture", "general"][i]);
        }

        // 3 writes
        const transaction = db.transaction(() => {
          for (let i = 0; i < 3; i++) {
            insertTestMemory(db, createTestMemory({
              id: `mixed_write_${Date.now()}_${i}`,
              content_raw: `Mixed workload write ${i}`,
            }));
          }
        });
        transaction();

        // 2 updates
        db.run(`
          UPDATE memory_facts
          SET access_count = access_count + 1
          WHERE id IN (SELECT id FROM memory_facts LIMIT 2)
        `);

        closeTestDatabase(db);
      },
    },

    // ==================== EXPORT/IMPORT SIMULATION ====================
    {
      name: "scale_1k_export_all",
      description: "Export all 1K memories to JSON",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const stmt = db.prepare("SELECT * FROM memory_facts");
        const memories = stmt.all();

        // Simulate JSON serialization
        const json = JSON.stringify(memories);

        closeTestDatabase(db);
      },
    },

    {
      name: "scale_1k_import_100",
      description: "Import 100 new memories (1K in db)",
      iterations: 10,
      warmupIterations: 2,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db);

        const memories = Array.from({ length: 100 }, (_, i) =>
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
      name: "scale_1k_vector_store",
      description: "Store memories with vectors (1K in db)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db, { includeVectors: true });

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
      name: "scale_1k_vector_retrieve",
      description: "Retrieve memories with vectors (1K)",
      iterations: 30,
      warmupIterations: 3,
      run: () => {
        const db = createTestDatabase();
        seedMediumDatabase(db, { includeVectors: true });

        const stmt = db.prepare(`
          SELECT id, content_raw, vector FROM memory_facts
          WHERE vector IS NOT NULL
          LIMIT 50
        `);
        stmt.all();

        closeTestDatabase(db);
      },
    },
  ],
};

export default mediumScalabilitySuite;
