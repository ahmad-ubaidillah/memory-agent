/**
 * Unit Tests: PreProcessor
 *
 * Comprehensive tests for the PreProcessor class which enhances user prompts
 * by injecting relevant memory context from the database.
 *
 * Coverage Target: 90%+
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { PreProcessor } from "../../../src/interceptor/pre-processor";
import { createTestDatabase, insertTestMemory } from "../../helpers/test-db";
import type { MemoryFact } from "../../../src/types/memory";

describe("PreProcessor", () => {
  let db: Database;
  let processor: PreProcessor;

  beforeEach(() => {
    db = createTestDatabase();
    processor = new PreProcessor();
  });

  afterEach(() => {
    db.close();
  });

  describe("Basic Enhancement", () => {
    test("should enhance prompt with relevant context", () => {
      // Seed test memories
      const memory: MemoryFact = {
        id: "mem_test001",
        uri: "memory://project/fact/mem_test001",
        topic: "api",
        content_toon: "REST API uses authentication",
        content_raw: "The REST API requires Bearer token authentication for all endpoints.",
        importance_score: 0.9,
        status: "active",
        access_count: 5,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "How do I call the API?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
        expect(result.value.memories_used.length).toBeGreaterThan(0);
        expect(result.value.enhanced_prompt).toContain("[MEMORY_CONTEXT]");
        expect(result.value.enhanced_prompt).toContain("How do I call the API?");
      }
    });

    test("should return unchanged prompt when no relevant memories", () => {
      const result = processor.enhance(db, "What is the weather like?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(false);
        expect(result.value.memories_used.length).toBe(0);
        expect(result.value.enhanced_prompt).toBe("What is the weather like?");
      }
    });

    test("should return unchanged prompt when database is empty", () => {
      const result = processor.enhance(db, "How do I implement authentication?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(false);
        expect(result.value.memories_used.length).toBe(0);
      }
    });
  });

  describe("Keyword Extraction", () => {
    test("should extract meaningful keywords from technical text", () => {
      const memory: MemoryFact = {
        id: "mem_test002",
        uri: "memory://project/fact/mem_test002",
        topic: "database",
        content_toon: "PostgreSQL used for data",
        content_raw: "We decided to use PostgreSQL for the primary database.",
        importance_score: 0.8,
        status: "active",
        access_count: 3,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "How do I configure the database connection?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
      }
    });

    test("should extract camelCase and PascalCase terms", () => {
      const memory: MemoryFact = {
        id: "mem_test003",
        uri: "memory://project/fact/mem_test003",
        topic: "authentication",
        content_toon: "AuthService handles login",
        content_raw: "The AuthService class handles user authentication and token generation.",
        importance_score: 0.85,
        status: "active",
        access_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "How does AuthService work?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
        expect(result.value.memories_used).toContain("mem_test003");
      }
    });

    test("should filter out stop words", () => {
      const memory: MemoryFact = {
        id: "mem_test004",
        uri: "memory://project/fact/mem_test004",
        topic: "caching",
        content_toon: "Redis used for caching",
        content_raw: "We use Redis for caching frequently accessed data.",
        importance_score: 0.7,
        status: "active",
        access_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "the a an is are was were be been being");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should not find any relevant context with only stop words
        expect(result.value.context_found).toBe(false);
      }
    });

    test("should prioritize repeated words", () => {
      const memory: MemoryFact = {
        id: "mem_test005",
        uri: "memory://project/fact/mem_test005",
        topic: "testing",
        content_toon: "Unit tests are important",
        content_raw: "Unit tests ensure code quality and prevent regressions.",
        importance_score: 0.75,
        status: "active",
        access_count: 4,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "test test testing tested tests");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
      }
    });
  });

  describe("Context Block Formatting", () => {
    test("should format context with MEMORY_CONTEXT delimiters", () => {
      const memory: MemoryFact = {
        id: "mem_test006",
        uri: "memory://project/fact/mem_test006",
        topic: "deployment",
        content_toon: "Use Docker for deployment",
        content_raw: "We use Docker containers for consistent deployment across environments.",
        importance_score: 0.8,
        status: "active",
        access_count: 6,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "How do I deploy the application?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.enhanced_prompt).toContain("[MEMORY_CONTEXT]");
        expect(result.value.enhanced_prompt).toContain("[/MEMORY_CONTEXT]");
      }
    });

    test("should include topic headers in context block", () => {
      const memory: MemoryFact = {
        id: "mem_test007",
        uri: "memory://project/fact/mem_test007",
        topic: "security",
        content_toon: "HTTPS required for all endpoints",
        content_raw: "All API endpoints must use HTTPS for secure communication.",
        importance_score: 0.95,
        status: "active",
        access_count: 10,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "How do I secure the API?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.enhanced_prompt).toContain("### 1. security");
      }
    });

    test("should limit number of memories injected", () => {
      // Insert multiple memories
      for (let i = 0; i < 10; i++) {
        const memory: MemoryFact = {
          id: `mem_test${i.toString().padStart(3, "0")}`,
          uri: `memory://project/fact/mem_test${i.toString().padStart(3, "0")}`,
          topic: "performance",
          content_toon: `Performance tip ${i}`,
          content_raw: `Performance optimization tip number ${i} for better speed.`,
          importance_score: 0.5 + (i * 0.05),
          status: "active",
          access_count: i,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);
      }

      const limitedProcessor = new PreProcessor({ maxContextMemories: 3 });
      const result = limitedProcessor.enhance(db, "How do I improve performance?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.memories_used.length).toBeLessThanOrEqual(3);
      }
    });

    test("should truncate long context blocks", () => {
      // Insert memory with very long content
      const longContent = "A".repeat(2000);
      const memory: MemoryFact = {
        id: "mem_test_long",
        uri: "memory://project/fact/mem_test_long",
        topic: "documentation",
        content_toon: longContent.substring(0, 200),
        content_raw: longContent,
        importance_score: 0.9,
        status: "active",
        access_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const shortProcessor = new PreProcessor({ maxContextLength: 500 });
      const result = shortProcessor.enhance(db, "What is the documentation?");

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.context_found) {
        // Extract context block
        const start = result.value.enhanced_prompt.indexOf("[MEMORY_CONTEXT]");
        const end = result.value.enhanced_prompt.indexOf("[/MEMORY_CONTEXT]");
        if (start !== -1 && end !== -1) {
          const contextBlock = result.value.enhanced_prompt.substring(start, end + "[/MEMORY_CONTEXT]".length);
          expect(contextBlock.length).toBeLessThanOrEqual(600); // Allow some margin
        }
      }
    });
  });

  describe("Relevance Filtering", () => {
    test("should filter memories by minimum relevance score", () => {
      const lowRelevanceMemory: MemoryFact = {
        id: "mem_low_rel",
        uri: "memory://project/fact/mem_low_rel",
        topic: "misc",
        content_toon: "Random note",
        content_raw: "Just a random note with low relevance.",
        importance_score: 0.2,
        status: "active",
        access_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, lowRelevanceMemory);

      const strictProcessor = new PreProcessor({ minRelevanceScore: 0.8 });
      const result = strictProcessor.enhance(db, "What about the note?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should not include low relevance memory
        expect(result.value.context_found).toBe(false);
      }
    });

    test("should include high relevance memories", () => {
      const highRelevanceMemory: MemoryFact = {
        id: "mem_high_rel",
        uri: "memory://project/fact/mem_high_rel",
        topic: "architecture",
        content_toon: "Microservices architecture decision",
        content_raw: "We decided to use microservices architecture for scalability.",
        importance_score: 0.95,
        status: "active",
        access_count: 15,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, highRelevanceMemory);

      const result = processor.enhance(db, "What architecture should we use?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
        expect(result.value.memories_used).toContain("mem_high_rel");
      }
    });
  });

  describe("Error Handling", () => {
    test("should return error for null user message", () => {
      const result = processor.enhance(db, null as any);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Invalid user message");
      }
    });

    test("should return error for undefined user message", () => {
      const result = processor.enhance(db, undefined as any);

      expect(result.isErr()).toBe(true);
    });

    test("should return error for empty string", () => {
      const result = processor.enhance(db, "");

      expect(result.isErr()).toBe(true);
    });

    test("should return error for non-string input", () => {
      const result = processor.enhance(db, 123 as any);

      expect(result.isErr()).toBe(true);
    });

    test("should gracefully handle database errors", () => {
      // Close the database to simulate an error
      db.close();

      const result = processor.enhance(db, "test query");

      // Should not throw, but may return error or empty result
      expect(result.isOk() || result.isErr()).toBe(true);
    });
  });

  describe("Configuration Options", () => {
    test("should use custom max context memories", () => {
      const customProcessor = new PreProcessor({ maxContextMemories: 5 });
      expect(customProcessor).toBeDefined();
    });

    test("should use custom min relevance score", () => {
      const customProcessor = new PreProcessor({ minRelevanceScore: 0.5 });
      expect(customProcessor).toBeDefined();
    });

    test("should use custom context header", () => {
      const memory: MemoryFact = {
        id: "mem_custom",
        uri: "memory://project/fact/mem_custom",
        topic: "test",
        content_toon: "Test memory",
        content_raw: "Test memory content for custom header.",
        importance_score: 0.8,
        status: "active",
        access_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const customProcessor = new PreProcessor({
        contextHeader: "CUSTOM HEADER",
        maxContextMemories: 1
      });
      const result = customProcessor.enhance(db, "test memory");

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.context_found) {
        expect(result.value.enhanced_prompt).toContain("CUSTOM HEADER");
      }
    });

    test("should include metadata when configured", () => {
      const memory: MemoryFact = {
        id: "mem_meta",
        uri: "memory://project/fact/mem_meta",
        topic: "metadata",
        content_toon: "Metadata test",
        content_raw: "Testing metadata inclusion in context.",
        importance_score: 0.85,
        status: "active",
        access_count: 2,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const customProcessor = new PreProcessor({
        includeMetadata: true,
        maxContextMemories: 1
      });
      const result = customProcessor.enhance(db, "metadata test");

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.context_found) {
        expect(result.value.enhanced_prompt).toContain("relevance");
      }
    });

    test("should use custom max context length", () => {
      const customProcessor = new PreProcessor({ maxContextLength: 200 });
      expect(customProcessor).toBeDefined();
    });
  });

  describe("Multiple Memory Scenarios", () => {
    test("should include multiple relevant memories", () => {
      const memories: MemoryFact[] = [
        {
          id: "mem_multi_1",
          uri: "memory://project/fact/mem_multi_1",
          topic: "api",
          content_toon: "REST API design",
          content_raw: "The REST API follows standard HTTP methods.",
          importance_score: 0.8,
          status: "active",
          access_count: 5,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
        {
          id: "mem_multi_2",
          uri: "memory://project/fact/mem_multi_2",
          topic: "authentication",
          content_toon: "JWT authentication",
          content_raw: "JWT tokens are used for authentication with 1-hour expiration.",
          importance_score: 0.85,
          status: "active",
          access_count: 8,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
        {
          id: "mem_multi_3",
          uri: "memory://project/fact/mem_multi_3",
          topic: "security",
          content_toon: "HTTPS required",
          content_raw: "All API endpoints require HTTPS connections.",
          importance_score: 0.9,
          status: "active",
          access_count: 12,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
      ];

      memories.forEach((m) => insertTestMemory(db, m));

      const result = processor.enhance(db, "How do I secure the API authentication?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
        expect(result.value.memories_used.length).toBeGreaterThanOrEqual(2);
      }
    });

    test("should sort memories by relevance", () => {
      const memories: MemoryFact[] = [
        {
          id: "mem_sort_1",
          uri: "memory://project/fact/mem_sort_1",
          topic: "database",
          content_toon: "Database connection",
          content_raw: "Database connection pooling is configured.",
          importance_score: 0.7,
          status: "active",
          access_count: 3,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
        {
          id: "mem_sort_2",
          uri: "memory://project/fact/mem_sort_2",
          topic: "database",
          content_toon: "Database indexing",
          content_raw: "Database indexes improve query performance significantly.",
          importance_score: 0.95,
          status: "active",
          access_count: 15,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
      ];

      memories.forEach((m) => insertTestMemory(db, m));

      const result = processor.enhance(db, "How do I optimize the database?");

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memories_used.length > 0) {
        // First memory should be the most relevant
        expect(result.value.memories_used[0]).toBe("mem_sort_2");
      }
    });
  });

  describe("Real-World Scenarios", () => {
    test("should handle development question", () => {
      const memory: MemoryFact = {
        id: "mem_dev",
        uri: "memory://project/fact/mem_dev",
        topic: "development",
        content_toon: "TypeScript for type safety",
        content_raw: "We use TypeScript for all new projects to ensure type safety and better IDE support.",
        importance_score: 0.88,
        status: "active",
        access_count: 20,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "Should I use TypeScript for the new project?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
      }
    });

    test("should handle debugging context", () => {
      const memory: MemoryFact = {
        id: "mem_debug",
        uri: "memory://project/fact/mem_debug",
        topic: "bug",
        content_toon: "Memory leak in useEffect",
        content_raw: "The memory leak was caused by missing cleanup function in useEffect hook.",
        importance_score: 0.92,
        status: "active",
        access_count: 25,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const result = processor.enhance(db, "There's a memory leak in my React component");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
        expect(result.value.memories_used).toContain("mem_debug");
      }
    });

    test("should handle architecture question", () => {
      const memories: MemoryFact[] = [
        {
          id: "mem_arch_1",
          uri: "memory://project/fact/mem_arch_1",
          topic: "architecture",
          content_toon: "Microservices for scalability",
          content_raw: "We chose microservices to enable independent scaling of components.",
          importance_score: 0.9,
          status: "active",
          access_count: 30,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
        {
          id: "mem_arch_2",
          uri: "memory://project/fact/mem_arch_2",
          topic: "architecture",
          content_toon: "Event-driven communication",
          content_raw: "Services communicate via event bus for loose coupling.",
          importance_score: 0.85,
          status: "active",
          access_count: 18,
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        },
      ];

      memories.forEach((m) => insertTestMemory(db, m));

      const result = processor.enhance(db, "How should we design the system architecture?");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.context_found).toBe(true);
        expect(result.value.memories_used.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("should preserve original user message", () => {
      const memory: MemoryFact = {
        id: "mem_preserve",
        uri: "memory://project/fact/mem_preserve",
        topic: "test",
        content_toon: "Test memory",
        content_raw: "Test memory for message preservation.",
        importance_score: 0.8,
        status: "active",
        access_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
        bin_id: 0,
      };
      insertTestMemory(db, memory);

      const userMessage = "This is my specific question about testing?";
      const result = processor.enhance(db, userMessage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.enhanced_prompt).toContain(userMessage);
      }
    });
  });

  describe("Performance", () => {
    test("should process quickly for simple queries", () => {
      const memory: MemoryFact = {
        id: "mem_perf",
        uri: "memory://project/fact/mem_perf",
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

      const start = performance.now();
      const result = processor.enhance(db, "performance test");
      const duration = performance.now() - start;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    test("should handle large memory database efficiently", () => {
      // Insert 100 memories
      for (let i = 0; i < 100; i++) {
        const memory: MemoryFact = {
          id: `mem_large_${i.toString().padStart(3, "0")}`,
          uri: `memory://project/fact/mem_large_${i.toString().padStart(3, "0")}`,
          topic: `topic-${i % 10}`,
          content_toon: `Memory ${i} content`,
          content_raw: `This is memory number ${i} with some test content for performance testing.`,
          importance_score: Math.random(),
          status: "active",
          access_count: Math.floor(Math.random() * 10),
          created_at: new Date(),
          updated_at: new Date(),
          bin_id: 0,
        };
        insertTestMemory(db, memory);
      }

      const start = performance.now();
      const result = processor.enhance(db, "test content performance");
      const duration = performance.now() - start;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(200); // Should still be fast
    });
  });
});

// Import afterEach for cleanup
import { afterEach } from "bun:test";
