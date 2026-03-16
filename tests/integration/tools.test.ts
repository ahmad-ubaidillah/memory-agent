/**
 * Integration Tests: Tool Wrappers
 *
 * Comprehensive end-to-end tests for the memory_enhance_prompt and
 * memory_auto_learn tool wrappers. Tests the full integration from
 * tool input to database storage/retrieval.
 *
 * Coverage Target: 85%+
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { handleMemoryEnhancePrompt } from "../../../src/tools/enhance-prompt";
import { handleMemoryAutoLearn } from "../../../src/tools/auto-learn";
import { createTestDatabase, insertTestMemory } from "../../helpers/test-db";
import type { MemoryFact } from "../../../src/types/memory";

describe("Tool Wrapper Integration Tests", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe("memory_enhance_prompt Tool", () => {
    describe("Basic Functionality", () => {
      test("should enhance prompt with relevant context", async () => {
        // Seed test memory
        const memory: MemoryFact = {
          id: "mem_integration_001",
          uri: "memory://project/fact/mem_integration_001",
          topic: "api",
          content_toon: "REST API authentication",
          content_raw:
            "The REST API requires Bearer token authentication for all endpoints.",
          importance_score: 0.9,
          status: "active",
          access_count: 5,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message: "How do I authenticate with the API?",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.enhanced_prompt).toBeDefined();
        expect(response.context_found).toBe(true);
        expect(response.memories_used).toContain("mem_integration_001");
        expect(response.enhanced_prompt).toContain("[MEMORY_CONTEXT]");
        expect(response.enhanced_prompt).toContain(
          "How do I authenticate with the API?"
        );
      });

      test("should return unchanged prompt when no context found", async () => {
        const input = {
          user_message: "What is the weather like today?",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.context_found).toBe(false);
        expect(response.memories_used.length).toBe(0);
        expect(response.enhanced_prompt).toBe(
          "What is the weather like today?"
        );
      });

      test("should handle multiple relevant memories", async () => {
        // Seed multiple memories
        const memories: MemoryFact[] = [
          {
            id: "mem_multi_001",
            uri: "memory://project/fact/mem_multi_001",
            topic: "database",
            content_toon: "PostgreSQL configuration",
            content_raw:
              "PostgreSQL is configured with connection pooling enabled.",
            importance_score: 0.85,
            status: "active",
            access_count: 10,
            created_at: new Date(),
            updated_at: new Date(),
            bin_id: 0,
          },
          {
            id: "mem_multi_002",
            uri: "memory://project/fact/mem_multi_002",
            topic: "database",
            content_toon: "Database indexing strategy",
            content_raw:
              "Database indexes are created on frequently queried columns.",
            importance_score: 0.9,
            status: "active",
            access_count: 15,
            created_at: new Date(),
            updated_at: new Date(),
            bin_id: 0,
          },
        ];

        memories.forEach((m) => insertTestMemory(db, m));

        const input = {
          user_message: "How do I optimize database performance?",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.context_found).toBe(true);
        expect(response.memories_used.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("Input Validation", () => {
      test("should reject missing user_message", async () => {
        const input = {};

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBe(true);

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.error).toBe(true);
        expect(response.message).toContain("Invalid input");
      });

      test("should reject empty user_message", async () => {
        const input = {
          user_message: "",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBe(true);

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.error).toBe(true);
      });

      test("should reject non-string user_message", async () => {
        const input = {
          user_message: 123,
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBe(true);
      });

      test("should accept optional max_context parameter", async () => {
        const memory: MemoryFact = {
          id: "mem_optional_001",
          uri: "memory://project/fact/mem_optional_001",
          topic: "test",
          content_toon: "Test memory",
          content_raw: "Test memory content for optional parameters.",
          importance_score: 0.8,
          status: "active",
          access_count: 1,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message: "test memory",
          max_context: 1,
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();
      });

      test("should accept optional min_relevance parameter", async () => {
        const input = {
          user_message: "test query",
          min_relevance: 0.5,
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();
      });

      test("should reject invalid max_context value", async () => {
        const input = {
          user_message: "test query",
          max_context: 15, // exceeds max of 10
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBe(true);
      });

      test("should reject invalid min_relevance value", async () => {
        const input = {
          user_message: "test query",
          min_relevance: 1.5, // exceeds max of 1
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBe(true);
      });
    });

    describe("Configuration Options", () => {
      test("should respect max_context limit", async () => {
        // Insert 5 memories
        for (let i = 0; i < 5; i++) {
          const memory: MemoryFact = {
            id: `mem_limit_${i.toString().padStart(3, "0")}`,
            uri: `memory://project/fact/mem_limit_${i.toString().padStart(3, "0")}`,
            topic: "testing",
            content_toon: `Test memory ${i}`,
            content_raw: `Test memory number ${i} for limit testing.`,
            importance_score: 0.7,
            status: "active",
            access_count: 1,
            created_at: new Date(),
            updated_at: new Date(),
            bin_id: 0,
          };
          insertTestMemory(db, memory);
        }

        const input = {
          user_message: "test memory",
          max_context: 2,
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.memories_used.length).toBeLessThanOrEqual(2);
      });

      test("should filter by min_relevance score", async () => {
        const lowRelevanceMemory: MemoryFact = {
          id: "mem_low_rel",
          uri: "memory://project/fact/mem_low_rel",
          topic: "misc",
          content_toon: "Low relevance",
          content_raw: "This memory has low relevance score.",
          importance_score: 0.2,
          status: "active",
          access_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, lowRelevanceMemory);

        const input = {
          user_message: "relevance test",
          min_relevance: 0.8,
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        // Should not include low relevance memory
        expect(response.memories_used).not.toContain("mem_low_rel");
      });
    });

    describe("Context Block Format", () => {
      test("should include MEMORY_CONTEXT delimiters", async () => {
        const memory: MemoryFact = {
          id: "mem_format_001",
          uri: "memory://project/fact/mem_format_001",
          topic: "formatting",
          content_toon: "Context format test",
          content_raw: "Testing the context block format.",
          importance_score: 0.8,
          status: "active",
          access_count: 1,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message: "format test",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.enhanced_prompt).toContain("[MEMORY_CONTEXT]");
        expect(response.enhanced_prompt).toContain("[/MEMORY_CONTEXT]");
      });

      test("should extract and return context_block separately", async () => {
        const memory: MemoryFact = {
          id: "mem_block_001",
          uri: "memory://project/fact/mem_block_001",
          topic: "block",
          content_toon: "Block extraction test",
          content_raw: "Testing context block extraction.",
          importance_score: 0.85,
          status: "active",
          access_count: 2,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message: "block test",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        if (response.context_found) {
          expect(response.context_block).toBeDefined();
          expect(response.context_block).toContain("[MEMORY_CONTEXT]");
        }
      });

      test("should preserve original user message", async () => {
        const memory: MemoryFact = {
          id: "mem_preserve_001",
          uri: "memory://project/fact/mem_preserve_001",
          topic: "preservation",
          content_toon: "Message preservation",
          content_raw: "Testing message preservation in enhanced prompt.",
          importance_score: 0.75,
          status: "active",
          access_count: 1,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const userMessage = "This is my specific question about preservation?";
        const input = {
          user_message: userMessage,
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.enhanced_prompt).toContain(userMessage);
      });
    });

    describe("Error Handling", () => {
      test("should handle database not initialized", async () => {
        // Close the database to simulate uninitialized state
        db.close();

        const input = {
          user_message: "test query",
        };

        // Should handle gracefully even with closed DB
        const result = await handleMemoryEnhancePrompt(db, input);

        // Tool should handle the error
        expect(result.content).toBeDefined();
      });

      test("should handle invalid input types", async () => {
        const input = "not an object";

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBe(true);
      });

      test("should handle null input", async () => {
        const result = await handleMemoryEnhancePrompt(db, null);

        expect(result.isError).toBe(true);
      });

      test("should handle undefined input", async () => {
        const result = await handleMemoryEnhancePrompt(db, undefined);

        expect(result.isError).toBe(true);
      });
    });

    describe("Real-World Scenarios", () => {
      test("should handle development context", async () => {
        const memory: MemoryFact = {
          id: "mem_dev_context",
          uri: "memory://project/fact/mem_dev_context",
          topic: "development",
          content_toon: "TypeScript configuration",
          content_raw:
            "We use TypeScript with strict mode enabled for all new projects.",
          importance_score: 0.88,
          status: "active",
          access_count: 20,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message:
            "Should I enable strict mode for the new TypeScript project?",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.context_found).toBe(true);
        expect(response.memories_used).toContain("mem_dev_context");
      });

      test("should handle debugging context", async () => {
        const memory: MemoryFact = {
          id: "mem_debug_context",
          uri: "memory://project/fact/mem_debug_context",
          topic: "bug",
          content_toon: "Memory leak in useEffect",
          content_raw:
            "The memory leak was caused by missing cleanup function in useEffect hook.",
          importance_score: 0.92,
          status: "active",
          access_count: 25,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message: "There's a memory leak in my React component",
        };

        const result = await handleMemoryEnhancePrompt(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.context_found).toBe(true);
      });
    });

    describe("Performance", () => {
      test("should respond within performance target", async () => {
        const memory: MemoryFact = {
          id: "mem_perf_001",
          uri: "memory://project/fact/mem_perf_001",
          topic: "performance",
          content_toon: "Performance test",
          content_raw: "Performance test memory for benchmarking.",
          importance_score: 0.7,
          status: "active",
          access_count: 1,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);

        const input = {
          user_message: "performance test",
        };

        const start = performance.now();
        const result = await handleMemoryEnhancePrompt(db, input);
        const duration = performance.now() - start;

        expect(result.isError).toBeUndefined();
        expect(duration).toBeLessThan(100); // <100ms target
      });

      test("should handle large database efficiently", async () => {
        // Insert 100 memories
        for (let i = 0; i < 100; i++) {
          const memory: MemoryFact = {
            id: `mem_large_${i.toString().padStart(3, "0")}`,
            uri: `memory://project/fact/mem_large_${i.toString().padStart(3, "0")}`,
            topic: `topic-${i % 10}`,
            content_toon: `Memory ${i}`,
            content_raw: `This is memory number ${i} with test content.`,
            importance_score: Math.random(),
            status: "active",
            access_count: Math.floor(Math.random() * 10),
            created_at: new Date(),
            updated_at: new Date(),
            bin_id: 0,
          };
          insertTestMemory(db, memory);
        }

        const input = {
          user_message: "test content",
        };

        const start = performance.now();
        const result = await handleMemoryEnhancePrompt(db, input);
        const duration = performance.now() - start;

        expect(result.isError).toBeUndefined();
        expect(duration).toBeLessThan(200); // Still should be fast
      });
    });
  });

  describe("memory_auto_learn Tool", () => {
    describe("Basic Functionality", () => {
      test("should store memory from decision pattern", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Should we use TypeScript?" },
            {
              role: "assistant",
              content: "I decided to use TypeScript for better type safety.",
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.stored).toBe(true);
        expect(response.memory_id).toBeDefined();
        expect(response.content).toContain("decided");
        expect(response.pattern_type).toBeDefined();
        expect(response.confidence).toBeGreaterThan(0);
      });

      test("should store memory from bug pattern", async () => {
        const input = {
          conversation: [
            { role: "user", content: "What caused the error?" },
            {
              role: "assistant",
              content:
                "The bug was caused by a null pointer exception in the handler.",
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.stored).toBe(true);
        expect(response.content).toContain("bug");
      });

      test("should not store casual conversation", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Hello!" },
            { role: "assistant", content: "Hi there! How can I help you?" },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.stored).toBe(false);
        expect(response.reason).toBeDefined();
      });

      test("should process last AI message in conversation", async () => {
        const input = {
          conversation: [
            { role: "user", content: "First question" },
            { role: "assistant", content: "I suggest using option A." },
            { role: "user", content: "Second question" },
            {
              role: "assistant",
              content: "I decided to use option B instead.",
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        if (response.stored) {
          expect(response.content).toContain("option B");
          expect(response.content).not.toContain("option A");
        }
      });
    });

    describe("Input Validation", () => {
      test("should reject missing conversation", async () => {
        const input = {};

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBe(true);

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.error).toBe(true);
      });

      test("should reject empty conversation array", async () => {
        const input = {
          conversation: [],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBe(true);
      });

      test("should reject invalid conversation format", async () => {
        const input = {
          conversation: "not an array",
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBe(true);
      });

      test("should reject conversation with invalid role", async () => {
        const input = {
          conversation: [
            { role: "invalid", content: "test" },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBe(true);
      });

      test("should accept optional auto_detect_importance parameter", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Test" },
            { role: "assistant", content: "I decided to implement testing." },
          ],
          auto_detect_importance: true,
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();
      });

      test("should accept optional min_confidence parameter", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Test" },
            { role: "assistant", content: "I decided to test confidence." },
          ],
          min_confidence: 0.8,
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();
      });

      test("should accept optional max_memories parameter", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Test" },
            { role: "assistant", content: "I decided to test max memories." },
          ],
          max_memories: 3,
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();
      });
    });

    describe("Memory Storage", () => {
      test("should store memory with correct metadata", async () => {
        const input = {
          conversation: [
            { role: "user", content: "What did you decide?" },
            {
              role: "assistant",
              content: "I decided to use PostgreSQL for the database.",
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        if (response.stored && response.memory_id) {
          // Verify memory was stored in database
          const stmt = db.prepare<{
            id: string;
            content_raw: string;
            metadata: string;
          }>(`
            SELECT id, content_raw, metadata FROM memory_facts WHERE id = ?
          `);
          const memory = stmt.get(response.memory_id);

          expect(memory).toBeDefined();
          expect(memory?.content_raw).toContain("PostgreSQL");

          const metadata = JSON.parse(memory?.metadata || "{}");
          expect(metadata.pattern_type).toBe("decision");
          expect(metadata.auto_learned).toBe(true);
          expect(metadata.source).toBe("ai");
          expect(metadata.confidence).toBeGreaterThan(0);
        }
      });

      test("should store memory with appropriate importance", async () => {
        const input = {
          conversation: [
            { role: "user", content: "What's the issue?" },
            {
              role: "assistant",
              content:
                "Critical: Security vulnerability discovered in authentication!",
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        if (response.stored && response.memory_id) {
          const stmt = db.prepare<{
            importance_score: number;
          }>(`
            SELECT importance_score FROM memory_facts WHERE id = ?
          `);
          const memory = stmt.get(response.memory_id);

          expect(memory?.importance_score).toBeGreaterThan(0.9);
        }
      });
    });

    describe("Configuration Options", () => {
      test("should respect auto_detect_importance setting", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Test" },
            { role: "assistant", content: "I decided to test importance." },
          ],
          auto_detect_importance: false,
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        if (response.stored && response.memory_id) {
          const stmt = db.prepare<{
            importance_score: number;
          }>(`
            SELECT importance_score FROM memory_facts WHERE id = ?
          `);
          const memory = stmt.get(response.memory_id);

          // Should use default importance (0.5)
          expect(memory?.importance_score).toBe(0.5);
        }
      });

      test("should respect min_confidence threshold", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Any thoughts?" },
            {
              role: "assistant",
              content: "I guess maybe we could consider this option.",
            },
          ],
          min_confidence: 0.9,
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        // Should not store low confidence pattern
        expect(response.stored).toBe(false);
      });
    });

    describe("Error Handling", () => {
      test("should handle database not initialized", async () => {
        db.close();

        const input = {
          conversation: [
            { role: "user", content: "Test" },
            { role: "assistant", content: "I decided to test error handling." },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        // Tool should handle the error gracefully
        expect(result.content).toBeDefined();
      });

      test("should handle invalid input types", async () => {
        const result = await handleMemoryAutoLearn(db, "not an object");

        expect(result.isError).toBe(true);
      });

      test("should handle null input", async () => {
        const result = await handleMemoryAutoLearn(db, null);

        expect(result.isError).toBe(true);
      });
    });

    describe("Real-World Scenarios", () => {
      test("should handle code review conversation", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Can you review this PR?" },
            {
              role: "assistant",
              content: `
                I reviewed the PR and I decided to approve it with suggestions.
                Note that the error handling could be improved.
                We should add more unit tests for edge cases.
              `,
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.stored).toBe(true);
      });

      test("should handle debugging session", async () => {
        const input = {
          conversation: [
            { role: "user", content: "The app is crashing" },
            {
              role: "assistant",
              content: `
                The bug was caused by a race condition in the async handler.
                I fixed it by adding proper mutex locks.
                Warning: This affects all concurrent requests.
              `,
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.stored).toBe(true);
      });

      test("should handle architecture discussion", async () => {
        const input = {
          conversation: [
            { role: "user", content: "How should we design the system?" },
            {
              role: "assistant",
              content: `
                I recommend using microservices architecture for scalability.
                We decided to use event-driven communication between services.
                Important: Each service should own its database.
              `,
            },
          ],
        };

        const result = await handleMemoryAutoLearn(db, input);

        expect(result.isError).toBeUndefined();

        const response = JSON.parse(result.content[0]?.text || "{}");
        expect(response.stored).toBe(true);
      });
    });

    describe("Performance", () => {
      test("should respond within performance target", async () => {
        const input = {
          conversation: [
            { role: "user", content: "Test" },
            { role: "assistant", content: "I decided to test performance." },
          ],
        };

        const start = performance.now();
        const result = await handleMemoryAutoLearn(db, input);
        const duration = performance.now() - start;

        expect(result.isError).toBeUndefined();
        expect(duration).toBeLessThan(100); // <100ms target
      });

      test("should handle long conversation efficiently", async () => {
        const conversation = [];

        // Add 50 message pairs
        for (let i = 0; i < 50; i++) {
          conversation.push({ role: "user", content: `Question ${i}` });
          conversation.push({
            role: "assistant",
            content: `I decided to answer question ${i}.`,
          });
        }

        const input = { conversation };

        const start = performance.now();
        const result = await handleMemoryAutoLearn(db, input);
        const duration = performance.now() - start;

        expect(result.isError).toBeUndefined();
        expect(duration).toBeLessThan(200);
      });
    });
  });

  describe("End-to-End Integration", () => {
    test("should work together: auto-learn then enhance", async () => {
      // First, auto-learn a memory
      const learnInput = {
        conversation: [
          { role: "user", content: "What database should we use?" },
          {
            role: "assistant",
            content:
              "I decided to use PostgreSQL for the primary database because of its JSON support.",
          },
        ],
      };

      const learnResult = await handleMemoryAutoLearn(db, learnInput);
      expect(learnResult.isError).toBeUndefined();

      const learnResponse = JSON.parse(learnResult.content[0]?.text || "{}");
      expect(learnResponse.stored).toBe(true);

      // Then, enhance a prompt that should find that memory
      const enhanceInput = {
        user_message: "How do I configure the database connection?",
      };

      const enhanceResult = await handleMemoryEnhancePrompt(db, enhanceInput);
      expect(enhanceResult.isError).toBeUndefined();

      const enhanceResponse = JSON.parse(
        enhanceResult.content[0]?.text || "{}"
      );
      expect(enhanceResponse.context_found).toBe(true);
      expect(enhanceResponse.enhanced_prompt).toContain("PostgreSQL");
    });

    test("should handle full workflow with multiple patterns", async () => {
      // Learn multiple patterns
      const conversations = [
        [
          { role: "user", content: "Testing?" },
          {
            role: "assistant",
            content: "I decided to use Jest for unit testing.",
          },
        ],
        [
          { role: "user", content: "Error?" },
          {
            role: "assistant",
            content: "The bug was caused by improper error handling.",
          },
        ],
        [
          { role: "user", content: "Architecture?" },
          {
            role: "assistant",
            content:
              "I recommend implementing a layered architecture for better separation of concerns.",
          },
        ],
      ];

      for (const conversation of conversations) {
        const result = await handleMemoryAutoLearn(db, { conversation });
        expect(result.isError).toBeUndefined();
      }

      // Now enhance a prompt that should find relevant context
      const enhanceInput = {
        user_message: "How should I structure the testing for this project?",
      };

      const enhanceResult = await handleMemoryEnhancePrompt(db, enhanceInput);
      expect(enhanceResult.isError).toBeUndefined();

      const enhanceResponse = JSON.parse(
        enhanceResult.content[0]?.text || "{}"
      );
      expect(enhanceResponse.context_found).toBe(true);
    });
  });
});
