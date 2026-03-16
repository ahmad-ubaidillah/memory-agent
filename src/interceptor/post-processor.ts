/**
 * Post-Processor for Memory Interceptor
 *
 * Automatically extracts and stores learnings from AI conversation responses.
 * Analyzes conversation history, detects decision patterns, and creates
 * persistent memories for future reference.
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { storeMemory } from "../core/memory-db";
import { ToolError } from "../errors/types";
import type { AutoLearnResult, ConversationMessage } from "../types/memory";
import { type DetectedPattern, PatternDetector } from "./pattern-detector";

/**
 * Configuration for PostProcessor
 */
export interface PostProcessorConfig {
  /** Minimum confidence score to store a memory (default: 0.7) */
  minConfidenceScore?: number;

  /** Whether to auto-detect importance from patterns (default: true) */
  autoDetectImportance?: boolean;

  /** Default importance score when auto-detect is disabled (default: 0.5) */
  defaultImportance?: number;

  /** Whether to process user messages too (default: false) */
  processUserMessages?: boolean;

  /** Maximum memories to store per conversation (default: 5) */
  maxMemoriesPerConversation?: number;

  /** Whether to deduplicate similar content (default: true) */
  deduplicate?: boolean;
}

/**
 * PostProcessor class
 *
 * Analyzes AI conversations, detects important patterns (decisions, bugs, etc.),
 * and automatically stores them as persistent memories.
 */
export class PostProcessor {
  private config: Required<PostProcessorConfig>;
  private patternDetector: PatternDetector;

  constructor(config?: PostProcessorConfig) {
    this.config = {
      minConfidenceScore: config?.minConfidenceScore ?? 0.7,
      autoDetectImportance: config?.autoDetectImportance ?? true,
      defaultImportance: config?.defaultImportance ?? 0.5,
      processUserMessages: config?.processUserMessages ?? false,
      maxMemoriesPerConversation: config?.maxMemoriesPerConversation ?? 5,
      deduplicate: config?.deduplicate ?? true,
    };

    this.patternDetector = new PatternDetector();
  }

  /**
   * Process a conversation and extract memories
   *
   * @param db - SQLite database instance
   * @param conversation - Array of conversation messages
   * @returns Result with auto-learn result or error
   */
  process(
    db: Database,
    conversation: ConversationMessage[],
  ): Result<AutoLearnResult, ToolError> {
    if (
      !conversation ||
      !Array.isArray(conversation) ||
      conversation.length === 0
    ) {
      return err(
        new ToolError("Invalid conversation: must be a non-empty array", {
          operation: "post-processor.process",
        }),
      );
    }

    try {
      // Get the last AI message (most recent response)
      const lastAiMessage = this.getLastAiMessage(conversation);

      if (!lastAiMessage) {
        return ok({
          stored: false,
          reason: "No AI message found in conversation",
        });
      }

      // Detect patterns in AI response
      const patternsResult = this.patternDetector.detect(lastAiMessage.content);

      if (patternsResult.isErr()) {
        return err(
          new ToolError("Failed to detect patterns", {
            operation: "post-processor.process",
            error: patternsResult.error.message,
          }),
        );
      }

      const patterns = patternsResult.value;

      // Filter by confidence
      const confidentPatterns = patterns.filter(
        (p) => p.confidence >= this.config.minConfidenceScore,
      );

      if (confidentPatterns.length === 0) {
        return ok({
          stored: false,
          reason: "No patterns met minimum confidence threshold",
        });
      }

      // Deduplicate if enabled
      const uniquePatterns = this.config.deduplicate
        ? this.deduplicatePatterns(confidentPatterns)
        : confidentPatterns;

      // Limit number of memories
      const patternsToStore = uniquePatterns.slice(
        0,
        this.config.maxMemoriesPerConversation,
      );

      if (patternsToStore.length === 0) {
        return ok({
          stored: false,
          reason: "No unique patterns to store after deduplication",
        });
      }

      // Store the top pattern (or multiple if implementing batch storage)
      const topPattern = patternsToStore[0];

      if (!topPattern) {
        return ok({
          stored: false,
          reason: "No pattern available to store",
        });
      }

      const importance = this.config.autoDetectImportance
        ? topPattern.suggestedImportance
        : this.config.defaultImportance;

      // Store memory
      const storeResult = storeMemory(db, {
        content: topPattern.content,
        topic: topPattern.topic,
        importance,
        metadata: {
          ...topPattern.metadata,
          pattern_type: topPattern.type,
          pattern_name: topPattern.pattern,
          confidence: topPattern.confidence,
          auto_learned: true,
        },
      });

      if (storeResult.isErr()) {
        return err(
          new ToolError("Failed to store memory", {
            operation: "post-processor.process",
            error: storeResult.error.message,
          }),
        );
      }

      const memory = storeResult.value;

      return ok({
        stored: true,
        memory_id: memory.id,
        content: memory.content_raw,
        reason: `Detected ${topPattern.type} pattern with ${(topPattern.confidence * 100).toFixed(0)}% confidence`,
      });
    } catch (error) {
      return err(
        new ToolError("Failed to process conversation", {
          operation: "post-processor.process",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * Process conversation asynchronously (non-blocking)
   * This is the preferred method for production use
   *
   * @param db - SQLite database instance
   * @param conversation - Array of conversation messages
   * @param callback - Optional callback with result
   */
  processAsync(
    db: Database,
    conversation: ConversationMessage[],
    callback?: (result: Result<AutoLearnResult, ToolError>) => void,
  ): void {
    // Use process.nextTick for non-blocking execution
    process.nextTick(() => {
      const result = this.process(db, conversation);

      if (callback) {
        callback(result);
      } else {
        // Log result if no callback provided
        if (result.isOk()) {
          const value = result.value;
          if (value.stored) {
            console.log(
              `[PostProcessor] Auto-learned memory: ${value.memory_id}`,
            );
          } else {
            console.log(`[PostProcessor] No memory stored: ${value.reason}`);
          }
        } else {
          console.error(`[PostProcessor] Error:`, result.error.message);
        }
      }
    });
  }

  /**
   * Process multiple patterns and store them all
   *
   * @param db - SQLite database instance
   * @param conversation - Array of conversation messages
   * @returns Result with array of stored memories
   */
  processBatch(
    db: Database,
    conversation: ConversationMessage[],
  ): Result<AutoLearnResult[], ToolError> {
    if (
      !conversation ||
      !Array.isArray(conversation) ||
      conversation.length === 0
    ) {
      return err(
        new ToolError("Invalid conversation: must be a non-empty array", {
          operation: "post-processor.processBatch",
        }),
      );
    }

    try {
      const lastAiMessage = this.getLastAiMessage(conversation);

      if (!lastAiMessage) {
        return ok([]);
      }

      // Detect patterns
      const patternsResult = this.patternDetector.detect(lastAiMessage.content);

      if (patternsResult.isErr()) {
        return err(
          new ToolError("Failed to detect patterns", {
            operation: "post-processor.processBatch",
            error: patternsResult.error.message,
          }),
        );
      }

      const patterns = patternsResult.value;
      const confidentPatterns = patterns.filter(
        (p) => p.confidence >= this.config.minConfidenceScore,
      );

      if (confidentPatterns.length === 0) {
        return ok([]);
      }

      // Deduplicate
      const uniquePatterns = this.config.deduplicate
        ? this.deduplicatePatterns(confidentPatterns)
        : confidentPatterns;

      // Limit
      const patternsToStore = uniquePatterns.slice(
        0,
        this.config.maxMemoriesPerConversation,
      );

      // Store all patterns
      const results: AutoLearnResult[] = [];

      for (const pattern of patternsToStore) {
        const importance = this.config.autoDetectImportance
          ? pattern.suggestedImportance
          : this.config.defaultImportance;

        const storeResult = storeMemory(db, {
          content: pattern.content,
          topic: pattern.topic,
          importance,
          metadata: {
            ...pattern.metadata,
            pattern_type: pattern.type,
            pattern_name: pattern.pattern,
            confidence: pattern.confidence,
            auto_learned: true,
          },
        });

        if (storeResult.isOk()) {
          const memory = storeResult.value;
          results.push({
            stored: true,
            memory_id: memory.id,
            content: memory.content_raw,
            reason: `Detected ${pattern.type} pattern with ${(pattern.confidence * 100).toFixed(0)}% confidence`,
          });
        } else {
          results.push({
            stored: false,
            reason: `Failed to store: ${storeResult.error.message}`,
          });
        }
      }

      return ok(results);
    } catch (error) {
      return err(
        new ToolError("Failed to process conversation batch", {
          operation: "post-processor.processBatch",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * Get the last AI message from conversation
   */
  private getLastAiMessage(
    conversation: ConversationMessage[],
  ): ConversationMessage | null {
    // Iterate backwards to find the last assistant message
    for (let i = conversation.length - 1; i >= 0; i--) {
      const message = conversation[i];
      if (message && message.role === "assistant") {
        return message;
      }
    }

    return null;
  }

  /**
   * Deduplicate similar patterns
   */
  private deduplicatePatterns(patterns: DetectedPattern[]): DetectedPattern[] {
    const seen = new Set<string>();
    const unique: DetectedPattern[] = [];

    for (const pattern of patterns) {
      // Create a signature based on type and content similarity
      const signature = `${pattern.type}:${pattern.content.substring(0, 50).toLowerCase()}`;

      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(pattern);
      }
    }

    return unique;
  }

  /**
   * Analyze a single message without storing
   * Useful for preview/debugging
   *
   * @param message - Message to analyze
   * @returns Detected patterns
   */
  analyzeMessage(message: string): Result<DetectedPattern[], ToolError> {
    if (!message || typeof message !== "string") {
      return err(
        new ToolError("Invalid message: must be a non-empty string", {
          operation: "post-processor.analyzeMessage",
        }),
      );
    }

    const result = this.patternDetector.detect(message);

    if (result.isErr()) {
      return err(
        new ToolError("Failed to analyze message", {
          operation: "post-processor.analyzeMessage",
          error: result.error.message,
        }),
      );
    }

    return ok(result.value);
  }
}

/**
 * Singleton instance for convenience
 */
let instance: PostProcessor | null = null;

/**
 * Get singleton PostProcessor instance
 */
export function getPostProcessor(config?: PostProcessorConfig): PostProcessor {
  if (!instance || config) {
    instance = new PostProcessor(config);
  }
  return instance;
}
