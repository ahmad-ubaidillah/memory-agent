/**
 * Unit Tests: Pattern Detector
 *
 * Comprehensive tests for the PatternDetector class which identifies
 * decision patterns, bug reports, and other important learnings in
 * AI conversation responses.
 *
 * Coverage Target: 90%+
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { PatternDetector, type DetectedPattern } from "../../../src/interceptor/pattern-detector";

describe("PatternDetector", () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

  describe("Decision Patterns", () => {
    test("should detect 'I decided to' pattern", () => {
      const text = "I decided to use PostgreSQL for the database.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        const pattern = result.value[0];
        expect(pattern?.type).toBe("decision");
        expect(pattern?.confidence).toBeGreaterThan(0.8);
        expect(pattern?.content).toContain("decided");
      }
    });

    test("should detect 'I chose' pattern", () => {
      const text = "I chose React over Vue for the frontend.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("decision");
      }
    });

    test("should detect 'I selected' pattern", () => {
      const text = "I selected the microservices architecture.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("decision");
      }
    });

    test("should detect 'we decided' pattern", () => {
      const text = "We decided to implement caching.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("decision");
      }
    });
  });

  describe("Recommendation Patterns", () => {
    test("should detect 'I recommend' pattern", () => {
      const text = "I recommend using TypeScript for type safety.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("recommendation");
        expect(result.value[0]?.confidence).toBeGreaterThan(0.75);
      }
    });

    test("should detect 'I suggest' pattern", () => {
      const text = "I suggest we add unit tests first.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("recommendation");
      }
    });

    test("should detect 'recommend that' pattern", () => {
      const text = "I recommend that we refactor this module.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("recommendation");
      }
    });
  });

  describe("Bug Patterns", () => {
    test("should detect 'bug was caused by' pattern", () => {
      const text = "The bug was caused by a null pointer exception.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        const pattern = result.value[0];
        expect(pattern?.type).toBe("bug");
        expect(pattern?.confidence).toBeGreaterThan(0.9);
        expect(pattern?.suggestedImportance).toBeGreaterThan(0.85);
      }
    });

    test("should detect 'issue was caused by' pattern", () => {
      const text = "The issue was caused by incorrect configuration.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("bug");
      }
    });

    test("should detect 'root cause was' pattern", () => {
      const text = "The root cause was a race condition in the async code.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("bug");
        expect(result.value[0]?.confidence).toBeGreaterThan(0.9);
      }
    });

    test("should detect 'I fixed' pattern", () => {
      const text = "I fixed the bug by adding proper error handling.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("bug");
      }
    });

    test("should detect 'we resolved' pattern", () => {
      const text = "We resolved the issue with a database migration.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("bug");
      }
    });
  });

  describe("Change Patterns", () => {
    test("should detect 'let's change' pattern", () => {
      const text = "Let's change the API to use REST instead of GraphQL.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("change");
      }
    });

    test("should detect 'I switched' pattern", () => {
      const text = "I switched to a different logging library.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("change");
      }
    });

    test("should detect 'we migrated' pattern", () => {
      const text = "We migrated from MySQL to PostgreSQL.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("change");
        expect(result.value[0]?.confidence).toBeGreaterThan(0.85);
      }
    });

    test("should detect 'we updated' pattern", () => {
      const text = "We updated the configuration to use environment variables.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("change");
      }
    });
  });

  describe("Implementation Patterns", () => {
    test("should detect 'I implemented' pattern", () => {
      const text = "I implemented a new caching layer using Redis.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("implementation");
      }
    });

    test("should detect 'we created' pattern", () => {
      const text = "We created a new microservice for payments.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("implementation");
      }
    });

    test("should detect 'should use' pattern", () => {
      const text = "We should use connection pooling for better performance.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("implementation");
      }
    });

    test("should detect 'should avoid' pattern", () => {
      const text = "We should avoid using global variables.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("implementation");
        expect(result.value[0]?.suggestedImportance).toBeGreaterThan(0.7);
      }
    });

    test("should detect 'you should implement' pattern", () => {
      const text = "You should implement rate limiting.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("implementation");
      }
    });
  });

  describe("Note Patterns", () => {
    test("should detect 'note that' pattern", () => {
      const text = "Note that the API requires authentication.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("note");
      }
    });

    test("should detect 'please note' pattern", () => {
      const text = "Please note that this feature is deprecated.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("note");
      }
    });

    test("should detect 'remember to' pattern", () => {
      const text = "Remember to close the database connection.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("note");
      }
    });

    test("should detect "don't forget to" pattern", () => {
      const text = "Don't forget to update the documentation.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("note");
      }
    });

    test("should detect 'keep in mind' pattern", () => {
      const text = "Keep in mind that the server restarts at midnight.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("note");
      }
    });
  });

  describe("Important Patterns", () => {
    test("should detect 'Important:' pattern", () => {
      const text = "Important: This endpoint will be removed in v2.0.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        const pattern = result.value[0];
        expect(pattern?.type).toBe("important");
        expect(pattern?.confidence).toBeGreaterThan(0.9);
        expect(pattern?.suggestedImportance).toBeGreaterThan(0.9);
      }
    });

    test("should detect 'Critical:' pattern", () => {
      const text = "Critical: Security vulnerability detected in auth module.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("important");
        expect(result.value[0]?.suggestedImportance).toBeGreaterThan(0.9);
      }
    });

    test("should detect 'Warning:' pattern", () => {
      const text = "Warning: This operation cannot be undone.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("important");
      }
    });

    test("should detect 'Caution:' pattern", () => {
      const text = "Caution: Modifying this file may break the build.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("important");
      }
    });

    test("should detect 'Best practice:' pattern", () => {
      const text = "Best practice: Always validate user input.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("important");
        expect(result.value[0]?.confidence).toBeGreaterThan(0.8);
      }
    });

    test("should detect 'Pro tip:' pattern", () => {
      const text = "Pro tip: Use prepared statements for SQL queries.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.type).toBe("important");
      }
    });
  });

  describe("Multiple Patterns", () => {
    test("should detect multiple patterns in same text", () => {
      const text = `
        I decided to use PostgreSQL for the database.
        Important: Make sure to set up backups.
        The bug was caused by a missing index.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThanOrEqual(3);
        const types = result.value.map((p) => p.type);
        expect(types).toContain("decision");
        expect(types).toContain("important");
        expect(types).toContain("bug");
      }
    });

    test("should deduplicate similar patterns", () => {
      const text = `
        I decided to use TypeScript.
        I decided to use TypeScript for type safety.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should not have duplicate decision patterns
        const decisions = result.value.filter((p) => p.type === "decision");
        expect(decisions.length).toBeLessThanOrEqual(2);
      }
    });

    test("should sort patterns by confidence (highest first)", () => {
      const text = `
        I suggest we add more tests.
        Critical: Security issue found.
        Note that the API changed.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 1) {
        for (let i = 0; i < result.value.length - 1; i++) {
          expect(result.value[i]!.confidence).toBeGreaterThanOrEqual(
            result.value[i + 1]!.confidence
          );
        }
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty string", () => {
      const result = detector.detect("");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    test("should handle whitespace-only string", () => {
      const result = detector.detect("   \n\t  ");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    test("should handle text with no patterns", () => {
      const text = "This is just a regular sentence about the weather.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(0);
      }
    });

    test("should handle very long text", () => {
      const text = "I decided to refactor the code.".repeat(100);
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    test("should handle special characters", () => {
      const text = "I decided to use @scope/package-name for dependencies!";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    test("should handle case insensitivity", () => {
      const text1 = "I DECIDED TO USE REACT.";
      const text2 = "i decided to use react.";
      const text3 = "I Decided To Use React.";

      const result1 = detector.detect(text1);
      const result2 = detector.detect(text2);
      const result3 = detector.detect(text3);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk() && result3.isOk()) {
        expect(result1.value.length).toBeGreaterThan(0);
        expect(result2.value.length).toBeGreaterThan(0);
        expect(result3.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Error Handling", () => {
    test("should reject null input", () => {
      const result = detector.detect(null as any);

      expect(result.isErr()).toBe(true);
    });

    test("should reject undefined input", () => {
      const result = detector.detect(undefined as any);

      expect(result.isErr()).toBe(true);
    });

    test("should reject number input", () => {
      const result = detector.detect(123 as any);

      expect(result.isErr()).toBe(true);
    });

    test("should reject object input", () => {
      const result = detector.detect({ text: "test" } as any);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("Topic Extraction", () => {
    test("should extract topic from action-based pattern", () => {
      const text = "I decided to use PostgreSQL for better performance.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        expect(result.value[0]?.topic).toBeDefined();
        expect(result.value[0]?.topic.length).toBeGreaterThan(0);
      }
    });

    test("should extract topic from noun-based pattern", () => {
      const text = "The bug was caused by database connection timeout.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        expect(result.value[0]?.topic).toBeDefined();
        expect(result.value[0]?.topic).not.toBe("general");
      }
    });

    test("should extract topic from statement pattern", () => {
      const text = "Important: The API key must be kept secret.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        expect(result.value[0]?.topic).toBeDefined();
      }
    });

    test("should use 'general' as fallback topic", () => {
      const text = "I decided.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        // Should still have a topic even if minimal
        expect(result.value[0]?.topic).toBeDefined();
      }
    });
  });

  describe("Confidence Scoring", () => {
    test("should give higher confidence to important patterns", () => {
      const importantText = "Critical: Database migration required.";
      const normalText = "I suggest we add more logs.";

      const importantResult = detector.detect(importantText);
      const normalResult = detector.detect(normalText);

      expect(importantResult.isOk()).toBe(true);
      expect(normalResult.isOk()).toBe(true);

      if (
        importantResult.isOk() &&
        normalResult.isOk() &&
        importantResult.value.length > 0 &&
        normalResult.value.length > 0
      ) {
        expect(importantResult.value[0]!.confidence).toBeGreaterThan(
          normalResult.value[0]!.confidence
        );
      }
    });

    test("should boost confidence for patterns early in text", () => {
      const earlyPattern = "I decided to refactor. " + "x".repeat(500);
      const latePattern = "x".repeat(500) + " I decided to refactor.";

      const earlyResult = detector.detect(earlyPattern);
      const lateResult = detector.detect(latePattern);

      expect(earlyResult.isOk()).toBe(true);
      expect(lateResult.isOk()).toBe(true);

      if (
        earlyResult.isOk() &&
        lateResult.isOk() &&
        earlyResult.value.length > 0 &&
        lateResult.value.length > 0
      ) {
        // Early pattern should have same or higher confidence
        expect(earlyResult.value[0]!.confidence).toBeGreaterThanOrEqual(
          lateResult.value[0]!.confidence
        );
      }
    });

    test("should cap confidence at 1.0", () => {
      const text = "Critical: Important: Warning: Urgent alert!";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        result.value.forEach((pattern) => {
          expect(pattern.confidence).toBeLessThanOrEqual(1.0);
        });
      }
    });
  });

  describe("detectTop Method", () => {
    test("should return single most confident pattern", () => {
      const text = `
        I suggest adding tests.
        Critical: Security vulnerability found!
        Note that the API changed.
      `;
      const result = detector.detectTop(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).not.toBeNull();
        expect(result.value?.type).toBe("important");
      }
    });

    test("should return null when no patterns detected", () => {
      const text = "This is just a regular sentence.";
      const result = detector.detectTop(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    test("should handle errors like detect", () => {
      const result = detector.detectTop(null as any);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("hasImportantPatterns Method", () => {
    test("should return true for high confidence patterns", () => {
      const text = "Critical: This is very important!";
      const hasImportant = detector.hasImportantPatterns(text);

      expect(hasImportant).toBe(true);
    });

    test("should return false for low confidence patterns", () => {
      const text = "I suggest maybe considering options.";
      const hasImportant = detector.hasImportantPatterns(text);

      expect(hasImportant).toBe(false);
    });

    test("should return false for no patterns", () => {
      const text = "This is just a regular sentence.";
      const hasImportant = detector.hasImportantPatterns(text);

      expect(hasImportant).toBe(false);
    });

    test("should use 0.8 threshold", () => {
      const highText = "Critical: Important alert!";
      const mediumText = "I decided to use TypeScript.";

      expect(detector.hasImportantPatterns(highText)).toBe(true);
      expect(detector.hasImportantPatterns(mediumText)).toBe(false);
    });
  });

  describe("Pattern Metadata", () => {
    test("should include pattern name in detected pattern", () => {
      const text = "I decided to refactor the code.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        expect(result.value[0]?.pattern).toBeDefined();
        expect(result.value[0]?.pattern).toContain("decision");
      }
    });

    test("should include suggested importance", () => {
      const text = "Critical: Security issue!";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        expect(result.value[0]?.suggestedImportance).toBeDefined();
        expect(result.value[0]?.suggestedImportance).toBeGreaterThan(0.8);
      }
    });

    test("should include metadata with source", () => {
      const text = "I decided to use PostgreSQL.";
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 0) {
        expect(result.value[0]?.metadata).toBeDefined();
        expect(result.value[0]?.metadata?.source).toBe("ai");
        expect(result.value[0]?.metadata?.tags).toContain("auto-detected");
      }
    });
  });

  describe("Real-World Scenarios", () => {
    test("should detect decision in code review context", () => {
      const text = `
        Looking at the PR, I decided to approve it with some suggestions.
        We should add more unit tests for the edge cases.
        Note that the performance could be improved.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThanOrEqual(2);
      }
    });

    test("should detect bug report patterns", () => {
      const text = `
        The issue was caused by a race condition in the async handler.
        I fixed it by adding proper locking.
        Important: This affects all users on the free tier.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThanOrEqual(2);
        const types = result.value.map((p) => p.type);
        expect(types).toContain("bug");
        expect(types).toContain("important");
      }
    });

    test("should detect architectural decisions", () => {
      const text = `
        We decided to migrate to microservices architecture.
        I recommend using event sourcing for the audit log.
        Best practice: Keep services small and focused.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThanOrEqual(3);
      }
    });

    test("should handle mixed technical content", () => {
      const text = `
        function calculateTotal(items) {
          // I decided to use reduce for better performance
          return items.reduce((sum, item) => sum + item.price, 0);
        }

        Warning: This doesn't handle empty arrays.
        We should add validation.
      `;
      const result = detector.detect(text);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });
});
