/**
 * Pattern Detector for Memory Interceptor
 *
 * Detects decision patterns, important notes, and other learnings
 * in AI conversation responses for automatic memory extraction.
 */

import { type Result, err, ok } from "neverthrow";
import type { MemoryMetadata } from "../types/memory";

/**
 * Types of patterns that can be detected
 */
export type PatternType =
  | "decision"
  | "bug"
  | "recommendation"
  | "note"
  | "important"
  | "change"
  | "implementation";

/**
 * Detected pattern result
 */
export interface DetectedPattern {
  /** Type of pattern detected */
  type: PatternType;

  /** Confidence score: 0.0 - 1.0 */
  confidence: number;

  /** Extracted topic/category */
  topic: string;

  /** The actual content that was matched */
  content: string;

  /** Pattern name that matched */
  pattern: string;

  /** Suggested importance score */
  suggestedImportance: number;

  /** Additional metadata */
  metadata?: MemoryMetadata;
}

/**
 * Pattern definition with regex and metadata
 */
interface PatternDefinition {
  name: string;
  type: PatternType;
  regex: RegExp;
  topicExtractor: (match: RegExpMatchArray) => string;
  confidenceBase: number;
  suggestedImportance: number;
}

/**
 * Pattern Detector class
 *
 * Analyzes text for decision patterns, bug reports, recommendations,
 * and other important information that should be stored in memory.
 */
export class PatternDetector {
  private patterns: PatternDefinition[];

  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * Initialize all pattern definitions
   */
  private initializePatterns(): PatternDefinition[] {
    return [
      // Decision patterns
      {
        name: "decision_made",
        type: "decision",
        regex:
          /\b(?:I|we)\s+(?:decided|chose|selected|opted)\s+(?:to\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromAction(match[1] || ""),
        confidenceBase: 0.9,
        suggestedImportance: 0.8,
      },
      {
        name: "recommendation",
        type: "recommendation",
        regex:
          /\b(?:I\s+)?recommend\s+(?:that\s+|using\s+|to\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromAction(match[1] || ""),
        confidenceBase: 0.85,
        suggestedImportance: 0.7,
      },
      {
        name: "suggestion",
        type: "recommendation",
        regex:
          /\b(?:I\s+)?suggest\s+(?:that\s+|using\s+|to\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromAction(match[1] || ""),
        confidenceBase: 0.75,
        suggestedImportance: 0.6,
      },

      // Bug/issue patterns
      {
        name: "bug_caused_by",
        type: "bug",
        regex:
          /(?:the\s+)?(?:bug|issue|error|problem)\s+(?:was\s+)?caused\s+by\s+(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromNoun(match[1] || ""),
        confidenceBase: 0.95,
        suggestedImportance: 0.9,
      },
      {
        name: "root_cause",
        type: "bug",
        regex: /(?:the\s+)?root\s+cause\s+(?:was|is)\s+(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromNoun(match[1] || ""),
        confidenceBase: 0.95,
        suggestedImportance: 0.9,
      },
      {
        name: "fix_applied",
        type: "bug",
        regex:
          /(?:I|we)\s+(?:fixed|resolved|patched)\s+(.+?)(?:by\s+|with\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromNoun(match[1] || ""),
        confidenceBase: 0.9,
        suggestedImportance: 0.85,
      },

      // Change patterns
      {
        name: "change_made",
        type: "change",
        regex:
          /\b(?:let's|I|we)\s+(?:change|switch|update|modify|replace)\s+(.+?)(?:to\s+|with\s+|using\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromNoun(match[1] || ""),
        confidenceBase: 0.85,
        suggestedImportance: 0.75,
      },
      {
        name: "migration",
        type: "change",
        regex:
          /(?:I|we)\s+(?:migrated|moved|ported)\s+(.+?)(?:to\s+|from\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromNoun(match[1] || ""),
        confidenceBase: 0.9,
        suggestedImportance: 0.8,
      },

      // Implementation patterns
      {
        name: "implementation",
        type: "implementation",
        regex:
          /(?:I|we)\s+(?:implemented|created|built|added)\s+(.+?)(?:using\s+|with\s+)?(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromNoun(match[1] || ""),
        confidenceBase: 0.85,
        suggestedImportance: 0.7,
      },
      {
        name: "should_use",
        type: "implementation",
        regex:
          /(?:we\s+should|you\s+should|it's\s+better\s+to)\s+(?:use|implement|adopt)\s+(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromAction(match[1] || ""),
        confidenceBase: 0.8,
        suggestedImportance: 0.7,
      },
      {
        name: "should_avoid",
        type: "implementation",
        regex:
          /(?:we\s+should|you\s+should|it's\s+better\s+to)\s+(?:avoid|not\s+use|refrain\s+from)\s+(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromAction(match[1] || ""),
        confidenceBase: 0.85,
        suggestedImportance: 0.75,
      },

      // Note patterns
      {
        name: "note",
        type: "note",
        regex:
          /(?:note\s+that|please\s+note|it's\s+worth\s+noting)\s+(.+?)(?:\.|$)/gi,
        topicExtractor: (match) =>
          this.extractTopicFromStatement(match[1] || ""),
        confidenceBase: 0.7,
        suggestedImportance: 0.6,
      },
      {
        name: "remember",
        type: "note",
        regex:
          /(?:remember\s+to|don't\s+forget\s+to|keep\s+in\s+mind)\s+(.+?)(?:\.|$)/gi,
        topicExtractor: (match) => this.extractTopicFromAction(match[1] || ""),
        confidenceBase: 0.75,
        suggestedImportance: 0.65,
      },

      // Important patterns
      {
        name: "important",
        type: "important",
        regex:
          /(?:important|critical|crucial|essential)(?::\s*|\s+)(.+?)(?:\.|$)/gi,
        topicExtractor: (match) =>
          this.extractTopicFromStatement(match[1] || ""),
        confidenceBase: 0.95,
        suggestedImportance: 0.95,
      },
      {
        name: "warning",
        type: "important",
        regex: /(?:warning|caution|alert)(?::\s*|\s+)(.+?)(?:\.|$)/gi,
        topicExtractor: (match) =>
          this.extractTopicFromStatement(match[1] || ""),
        confidenceBase: 0.9,
        suggestedImportance: 0.9,
      },
      {
        name: "best_practice",
        type: "important",
        regex:
          /(?:best\s+practice|pro\s+tip|recommended\s+approach)(?::\s*|\s+)(.+?)(?:\.|$)/gi,
        topicExtractor: (match) =>
          this.extractTopicFromStatement(match[1] || ""),
        confidenceBase: 0.85,
        suggestedImportance: 0.8,
      },
    ];
  }

  /**
   * Detect patterns in text
   *
   * @param text - Text to analyze
   * @returns Result with array of detected patterns or error
   */
  detect(text: string): Result<DetectedPattern[], Error> {
    if (!text || typeof text !== "string") {
      return err(new Error("Invalid input: text must be a non-empty string"));
    }

    const detected: DetectedPattern[] = [];

    for (const pattern of this.patterns) {
      try {
        const matches = text.matchAll(pattern.regex);

        for (const match of matches) {
          if (match[0]) {
            const content = match[0].trim();
            const topic = pattern.topicExtractor(match);
            const confidence = this.calculateConfidence(pattern, content, text);

            // Avoid duplicates
            const isDuplicate = detected.some(
              (d) => d.content === content && d.type === pattern.type,
            );

            if (!isDuplicate) {
              detected.push({
                type: pattern.type,
                confidence,
                topic,
                content,
                pattern: pattern.name,
                suggestedImportance: pattern.suggestedImportance,
                metadata: {
                  source: "ai",
                  tags: [pattern.type, "auto-detected"],
                },
              });
            }
          }
        }
      } catch (error) {
        // Continue with other patterns even if one fails
        console.error(`Pattern ${pattern.name} failed:`, error);
      }
    }

    // Sort by confidence (highest first)
    detected.sort((a, b) => b.confidence - a.confidence);

    return ok(detected);
  }

  /**
   * Detect patterns and return only the most confident one
   *
   * @param text - Text to analyze
   * @returns Result with top detected pattern or null
   */
  detectTop(text: string): Result<DetectedPattern | null, Error> {
    const result = this.detect(text);

    if (result.isErr()) {
      return err(result.error);
    }

    const topPattern = result.value[0] ?? null;
    return ok(topPattern);
  }

  /**
   * Check if text contains any important patterns
   *
   * @param text - Text to check
   * @returns True if important patterns detected
   */
  hasImportantPatterns(text: string): boolean {
    const result = this.detect(text);
    if (result.isErr()) {
      return false;
    }

    return result.value.some((p) => p.confidence >= 0.8);
  }

  /**
   * Calculate confidence score for a pattern match
   */
  private calculateConfidence(
    pattern: PatternDefinition,
    matchedContent: string,
    fullText: string,
  ): number {
    let confidence = pattern.confidenceBase;

    // Boost confidence if pattern appears early in text (more likely to be main point)
    const position = fullText
      .toLowerCase()
      .indexOf(matchedContent.toLowerCase());
    const relativePosition = position / fullText.length;
    if (relativePosition < 0.3) {
      confidence += 0.05;
    }

    // Boost confidence if matched content is substantial
    if (matchedContent.length > 50) {
      confidence += 0.03;
    }

    // Reduce confidence if text is very long (harder to determine importance)
    if (fullText.length > 500) {
      confidence -= 0.05;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Extract topic from an action-based pattern
   * e.g., "use TypeScript" -> "typescript"
   */
  private extractTopicFromAction(action: string): string {
    if (!action) return "general";

    // Remove common action words
    let topic = action
      .toLowerCase()
      .replace(/^(to|use|using|implement|implementing|add|adding)\s+/i, "")
      .replace(/\s+(for|in|on|at|by|with)\s+.*/gi, "")
      .trim();

    // Extract first meaningful word or phrase
    const words = topic.split(/\s+/);
    if (words.length > 3) {
      // Take first 2-3 significant words
      topic = words.slice(0, 3).join(" ");
    }

    return topic || "general";
  }

  /**
   * Extract topic from a noun-based pattern
   * e.g., "the database connection" -> "database"
   */
  private extractTopicFromNoun(noun: string): string {
    if (!noun) return "general";

    // Remove articles and common words
    let topic = noun
      .toLowerCase()
      .replace(/^(the|a|an|this|that|these|those)\s+/i, "")
      .replace(
        /\s+(issue|problem|bug|error|feature|component|module)\s*$/gi,
        "",
      )
      .trim();

    // Extract first meaningful word or short phrase
    const words = topic.split(/\s+/);
    if (words.length > 2) {
      topic = words.slice(0, 2).join(" ");
    }

    return topic || "general";
  }

  /**
   * Extract topic from a statement
   * e.g., "the API requires authentication" -> "api"
   */
  private extractTopicFromStatement(statement: string): string {
    if (!statement) return "general";

    // Extract the subject of the statement
    let topic = statement
      .toLowerCase()
      .replace(/^(the|a|an|this|that)\s+/i, "")
      .split(/\s+/)[0];

    // Clean up
    topic = (topic || "").replace(/[^a-z0-9_-]/gi, "");

    return topic || "general";
  }
}

/**
 * Singleton instance for convenience
 */
let instance: PatternDetector | null = null;

/**
 * Get singleton PatternDetector instance
 */
export function getPatternDetector(): PatternDetector {
  if (!instance) {
    instance = new PatternDetector();
  }
  return instance;
}
