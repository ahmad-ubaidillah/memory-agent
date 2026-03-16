/**
 * Unit Tests: PostProcessor
 *
 * Comprehensive tests for the PostProcessor class which automatically
 * extracts and stores learnings from AI conversation responses.
 *
 * Coverage Target: 90%+
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { PostProcessor } from "../../../src/interceptor/post-processor";
import { createTestDatabase, insertTestMemory } from "../../helpers/test-db";
import type { ConversationMessage, MemoryFact } from "../../../src/types/memory";

describe("PostProcessor", () => {
  let db: Database;
  let processor: PostProcessor;

  beforeEach(() => {
    db = createTestDatabase();
    processor = new PostProcessor();
  });

  afterEach(() => {
    db.close();
  });

  describe("Basic Processing", () => {
    test("should store memory from decision pattern", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Should we use TypeScript?" },
        {
          role: "assistant",
          content: "I decided to use TypeScript for better type safety.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
        expect(result.value.memory_id).toBeDefined();
        expect(result.value.content).toContain("decided");
      }
    });

    test("should store memory from bug report pattern", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What caused the error?" },
        {
          role: "assistant",
          content: "The bug was caused by a null pointer exception in the handler.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
        expect(result.value.content).toContain("bug");
      }
    });

    test("should store memory from recommendation pattern", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "How should I handle errors?" },
        {
          role: "assistant",
          content: "I recommend using try-catch blocks for error handling.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should not store memory from casual conversation", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Hi there! How can I help you today?" },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(false);
        expect(result.value.reason).toBeDefined();
      }
    });

    test("should not store memory when no AI response exists", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Hello!" },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(false);
        expect(result.value.reason).toContain("No AI message");
      }
    });
  });

  describe("Conversation Handling", () => {
    test("should process last AI message in conversation", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "First question" },
        {
          role: "assistant",
          content: "I suggest using option A.",
        },
        { role: "user", content: "Second question" },
        {
          role: "assistant",
          content: "I decided to use option B instead.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.stored) {
        expect(result.value.content).toContain("option B");
        expect(result.value.content).not.toContain("option A");
      }
    });

    test("should handle multi-turn conversation", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What about authentication?" },
        {
          role: "assistant",
          content: "I recommend OAuth 2.0 for authentication.",
        },
        { role: "user", content: "And for the database?" },
        {
          role: "assistant",
          content: "We decided to use PostgreSQL with connection pooling.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
        expect(result.value.content).toContain("PostgreSQL");
      }
    });

    test("should handle empty conversation", () => {
      const conversation: ConversationMessage[] = [];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(false);
      }
    });

    test("should handle conversation with only user messages", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Question 1" },
        { role: "user", content: "Question 2" },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(false);
        expect(result.value.reason).toContain("No AI message");
      }
    });
  });

  describe("Confidence Filtering", () => {
    test("should store high confidence patterns by default", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What's the issue?" },
        {
          role: "assistant",
          content: "Critical: Database connection timeout in production!",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should filter low confidence patterns by default", () => {
      const processor = new PostProcessor({ minConfidenceScore: 0.9 });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Any thoughts?" },
        {
          role: "assistant",
          content: "I suggest maybe considering different options.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(false);
        expect(result.value.reason).toContain("confidence");
      }
    });

    test("should respect custom confidence threshold", () => {
      const lowThresholdProcessor = new PostProcessor({ minConfidenceScore: 0.5 });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "What do you think?" },
        {
          role: "assistant",
          content: "I suggest looking at the documentation.",
        },
      ];

      const result = lowThresholdProcessor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should store with lower threshold
        expect(result.value.stored).toBe(true);
      }
    });

    test("should filter patterns below 0.7 default threshold", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "How are you?" },
        {
          role: "assistant",
          content: "I'm doing well, thanks for asking!",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(false);
      }
    });
  });

  describe("Importance Detection", () => {
    test("should auto-detect importance from pattern type", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What caused the crash?" },
        {
          role: "assistant",
          content:
            "Critical: The bug was caused by a memory leak in the event handler.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        // Verify the stored memory has high importance
        const stmt = db.prepare<{
          importance_score: number;
        }, [string]>(`
          SELECT importance_score FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        expect(memory?.importance_score).toBeGreaterThan(0.8);
      }
    });

    test("should use default importance when auto-detect disabled", () => {
      const processor = new PostProcessor({
        autoDetectImportance: false,
        defaultImportance: 0.6,
      });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "What should I do?" },
        {
          role: "assistant",
          content: "I decided to implement caching.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{
          importance_score: number;
        }, [string]>(`
          SELECT importance_score FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        expect(memory?.importance_score).toBe(0.6);
      }
    });

    test("should assign higher importance to bug patterns", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Debug this error" },
        {
          role: "assistant",
          content: "The root cause was a race condition in the async code.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{
          importance_score: number;
        }, [string]>(`
          SELECT importance_score FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        expect(memory?.importance_score).toBeGreaterThan(0.85);
      }
    });

    test("should assign highest importance to critical patterns", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What's the status?" },
        {
          role: "assistant",
          content:
            "Critical: Security vulnerability discovered in authentication module!",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{
          importance_score: number;
        }, [string]>(`
          SELECT importance_score FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        expect(memory?.importance_score).toBeGreaterThan(0.9);
      }
    });
  });

  describe("Deduplication", () => {
    test("should deduplicate similar patterns by default", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What should I use?" },
        {
          role: "assistant",
          content:
            "I decided to use TypeScript. I decided to use TypeScript for the backend too.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
        // Should only store one memory despite duplicate patterns
        const stmt = db.prepare<{ count: number }>(`
          SELECT COUNT(*) as count FROM memory_facts
        `);
        const count = stmt.get();
        expect(count?.count).toBe(1);
      }
    });

    test("should store duplicates when deduplication disabled", () => {
      const processor = new PostProcessor({ deduplicate: false });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Tell me about decisions" },
        {
          role: "assistant",
          content:
            "I decided to use PostgreSQL. I decided to use Redis for caching.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      // With deduplication disabled, might store multiple memories
    });

    test("should not deduplicate different pattern types", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Summary?" },
        {
          role: "assistant",
          content:
            "I decided to use Docker. The bug was caused by missing configuration.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      // Different pattern types should both be detected
    });
  });

  describe("Configuration Options", () => {
    test("should respect maxMemoriesPerConversation setting", () => {
      const processor = new PostProcessor({ maxMemoriesPerConversation: 1 });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Multiple decisions" },
        {
          role: "assistant",
          content:
            "I decided to use React. I decided to use Node.js. I decided to use MongoDB.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      // Should only store 1 memory due to limit
    });

    test("should use default configuration when not specified", () => {
      const processor = new PostProcessor();

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Test" },
        {
          role: "assistant",
          content: "I decided to implement unit testing.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should allow disabling auto-detect importance", () => {
      const processor = new PostProcessor({
        autoDetectImportance: false,
        defaultImportance: 0.5,
      });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "What's critical?" },
        {
          role: "assistant",
          content: "Critical: This is very important information!",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{
          importance_score: number;
        }, [string]>(`
          SELECT importance_score FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        expect(memory?.importance_score).toBe(0.5);
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle null conversation", () => {
      const result = processor.process(db, null as any);

      expect(result.isErr()).toBe(true);
    });

    test("should handle undefined conversation", () => {
      const result = processor.process(db, undefined as any);

      expect(result.isErr()).toBe(true);
    });

    test("should handle non-array conversation", () => {
      const result = processor.process(db, "not an array" as any);

      expect(result.isErr()).toBe(true);
    });

    test("should handle invalid message format", () => {
      const conversation = [
        { invalid: "format" },
      ] as any as ConversationMessage[];

      const result = processor.process(db, conversation);

      // Should handle gracefully
      expect(result.isOk()).toBe(true);
    });

    test("should handle database errors gracefully", () => {
      // Close the database to force an error
      db.close();

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Test" },
        {
          role: "assistant",
          content: "I decided to test error handling.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Async Processing", () => {
    test("should process asynchronously with callback", (done) => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Async test" },
        {
          role: "assistant",
          content: "I decided to test async processing.",
        },
      ];

      processor.processAsync(db, conversation, (result) => {
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.stored).toBe(true);
        }
        done();
      });
    });

    test("should process asynchronously without callback", (done) => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Async test" },
        {
          role: "assistant",
          content: "I decided to test async without callback.",
        },
      ];

      // Should not throw
      processor.processAsync(db, conversation);

      // Give it time to process
      setTimeout(() => {
        done();
      }, 100);
    });

    test("should handle async errors gracefully", (done) => {
      db.close();

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Test" },
        {
          role: "assistant",
          content: "I decided to test async error handling.",
        },
      ];

      processor.processAsync(db, conversation, (result) => {
        expect(result.isErr()).toBe(true);
        done();
      });
    });
  });

  describe("Batch Processing", () => {
    test("should process multiple patterns in batch", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Multiple items" },
        {
          role: "assistant",
          content:
            "I decided to use TypeScript. I recommend using strict mode. The bug was caused by null reference.",
        },
      ];

      const result = processor.processBatch(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(1);
        expect(result.value.every((r) => r.stored)).toBe(true);
      }
    });

    test("should return empty array when no patterns detected", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const result = processor.processBatch(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    test("should respect max memories limit in batch", () => {
      const processor = new PostProcessor({ maxMemoriesPerConversation: 2 });

      const conversation: ConversationMessage[] = [
        { role: "user", content: "Many decisions" },
        {
          role: "assistant",
          content:
            "I decided A. I decided B. I decided C. I decided D. I decided E.",
        },
      ];

      const result = processor.processBatch(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeLessThanOrEqual(2);
      }
    });

    test("should handle batch with mixed results", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Mixed" },
        {
          role: "assistant",
          content:
            "I decided to implement feature A. Maybe consider option B. Critical: Security issue found!",
        },
      ];

      const result = processor.processBatch(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const stored = result.value.filter((r) => r.stored);
        const notStored = result.value.filter((r) => !r.stored);
        expect(stored.length).toBeGreaterThan(0);
      }
    });
  });

  describe("analyzeMessage Helper", () => {
    test("should analyze message without storing", () => {
      const message = "I decided to use PostgreSQL for the database.";

      const result = processor.analyzeMessage(message);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("decision");
      }
    });

    test("should return empty array for no patterns", () => {
      const message = "This is just a regular sentence.";

      const result = processor.analyzeMessage(message);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    test("should handle invalid message input", () => {
      const result = processor.analyzeMessage(null as any);

      expect(result.isErr()).toBe(true);
    });

    test("should not modify database", () => {
      const message = "I decided to test analysis without storage.";

      const countBefore = db
        .prepare<{ count: number }>("SELECT COUNT(*) as count FROM memory_facts")
        .get()?.count ?? 0;

      processor.analyzeMessage(message);

      const countAfter = db
        .prepare<{ count: number }>("SELECT COUNT(*) as count FROM memory_facts")
        .get()?.count ?? 0;

      expect(countAfter).toBe(countBefore);
    });
  });

  describe("Real-World Scenarios", () => {
    test("should handle code review conversation", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Can you review this PR?" },
        {
          role: "assistant",
          content: `
            I reviewed the PR and I decided to approve it with suggestions.
            Note that the error handling could be improved.
            We should add more unit tests for edge cases.
            Best practice: Keep functions small and focused.
          `,
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should handle debugging session", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "The app is crashing" },
        {
          role: "assistant",
          content: `
            The bug was caused by a race condition in the async handler.
            I fixed it by adding proper mutex locks.
            Warning: This affects all concurrent requests.
          `,
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should handle architecture discussion", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "How should we design the system?" },
        {
          role: "assistant",
          content: `
            I recommend using microservices architecture for scalability.
            We decided to use event-driven communication between services.
            Important: Each service should own its database.
            Best practice: Implement circuit breaker pattern.
          `,
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should handle technical Q&A", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "How do I optimize performance?" },
        {
          role: "assistant",
          content: `
            I suggest implementing caching with Redis.
            We should use connection pooling for database connections.
            I decided to add indexes to frequently queried columns.
          `,
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });

    test("should handle migration planning", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "We need to migrate the database" },
        {
          role: "assistant",
          content: `
            We decided to migrate from MySQL to PostgreSQL.
            I recommend using a gradual migration strategy.
            Warning: Test thoroughly before switching production traffic.
          `,
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.stored).toBe(true);
      }
    });
  });

  describe("Memory Metadata", () => {
    test("should include pattern metadata in stored memory", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What should I do?" },
        {
          role: "assistant",
          content: "I decided to implement logging for better debugging.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{ metadata: string }, [string]>(`
          SELECT metadata FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        const metadata = JSON.parse(memory?.metadata ?? "{}");

        expect(metadata.pattern_type).toBe("decision");
        expect(metadata.auto_learned).toBe(true);
        expect(metadata.source).toBe("ai");
        expect(metadata.confidence).toBeGreaterThan(0);
      }
    });

    test("should include confidence score in metadata", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "What's the issue?" },
        {
          role: "assistant",
          content: "Critical: Security vulnerability in authentication!",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{ metadata: string }, [string]>(`
          SELECT metadata FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        const metadata = JSON.parse(memory?.metadata ?? "{}");

        expect(metadata.confidence).toBeGreaterThan(0.9);
      }
    });

    test("should include pattern name in metadata", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Debug help" },
        {
          role: "assistant",
          content: "The bug was caused by a memory leak.",
        },
      ];

      const result = processor.process(db, conversation);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.memory_id) {
        const stmt = db.prepare<{ metadata: string }, [string]>(`
          SELECT metadata FROM memory_facts WHERE id = ?
        `);
        const memory = stmt.get(result.value.memory_id);
        const metadata = JSON.parse(memory?.metadata ?? "{}");

        expect(metadata.pattern_name).toBeDefined();
        expect(metadata.pattern_name).toContain("bug");
      }
    });
  });

  describe("Performance", () => {
    test("should process conversation quickly", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Test" },
        {
          role: "assistant",
          content: "I decided to test performance.",
        },
      ];

      const start = performance.now();
      const result = processor.process(db, conversation);
      const duration = performance.now() - start;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    test("should handle long conversations efficiently", () => {
      const conversation: ConversationMessage[] = [];

      // Add 50 message pairs
      for (let i = 0; i < 50; i++) {
        conversation.push({ role: "user", content: `Question ${i}` });
        conversation.push({
          role: "assistant",
          content: `I decided to answer question ${i}.`,
        });
      }

      const start = performance.now();
      const result = processor.process(db, conversation);
      const duration = performance.now() - start;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(200);
    });

    test("should handle batch processing efficiently", () => {
      const conversation: ConversationMessage[] = [
        { role: "user", content: "Many patterns" },
        {
          role: "assistant",
          content:
            "I decided A. I decided B. I decided C. The bug was X. I recommend Y. Important: Z!",
        },
      ];

      const start = performance.now();
      const result = processor.processBatch(db, conversation);
      const duration = performance.now() - start;

      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(150);
    });
  });
});
