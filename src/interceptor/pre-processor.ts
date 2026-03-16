/**
 * Pre-Processor for Memory Interceptor
 *
 * Enhances user prompts by injecting relevant memory context.
 * This enables AI assistants to have access to relevant past knowledge
 * without manual memory queries.
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { queryMemories } from "../core/memory-db";
import { ToolError } from "../errors/types";
import type { EnhancedPrompt } from "../types/memory";

/**
 * Configuration for PreProcessor
 */
export interface PreProcessorConfig {
  /** Maximum number of memories to inject (default: 3) */
  maxContextMemories?: number;

  /** Minimum relevance score to include memory (default: 0.3) */
  minRelevanceScore?: number;

  /** Whether to include memory metadata in context (default: false) */
  includeMetadata?: boolean;

  /** Custom context block header */
  contextHeader?: string;

  /** Maximum context block length (default: 1000 chars) */
  maxContextLength?: number;
}

/**
 * PreProcessor class
 *
 * Analyzes user messages, queries relevant memories, and injects
 * context to enhance the prompt for AI assistants.
 */
export class PreProcessor {
  private config: Required<PreProcessorConfig>;

  constructor(config?: PreProcessorConfig) {
    this.config = {
      maxContextMemories: config?.maxContextMemories ?? 3,
      minRelevanceScore: config?.minRelevanceScore ?? 0.3,
      includeMetadata: config?.includeMetadata ?? false,
      contextHeader: config?.contextHeader ?? "RELEVANT CONTEXT FROM MEMORY",
      maxContextLength: config?.maxContextLength ?? 1000,
    };
  }

  /**
   * Enhance a user prompt with relevant memory context
   *
   * @param db - SQLite database instance
   * @param userMessage - Original user message
   * @returns Result with enhanced prompt or error
   */
  enhance(
    db: Database,
    userMessage: string,
  ): Result<EnhancedPrompt, ToolError> {
    if (!userMessage || typeof userMessage !== "string") {
      return err(
        new ToolError("Invalid user message: must be a non-empty string", {
          operation: "pre-processor.enhance",
        }),
      );
    }

    try {
      // Extract keywords from user message for querying
      const keywords = this.extractKeywords(userMessage);

      if (keywords.length === 0) {
        // No meaningful keywords, return original message
        return ok({
          enhanced_prompt: userMessage,
          context_found: false,
          memories_used: [],
        });
      }

      // Query relevant memories
      const queryResult = queryMemories(db, {
        query: keywords.join(" "),
        limit: this.config.maxContextMemories,
        minImportance: this.config.minRelevanceScore,
      });

      if (queryResult.isErr()) {
        // Log error but don't fail - return original message
        console.error(
          "Memory query failed in pre-processor:",
          queryResult.error,
        );
        return ok({
          enhanced_prompt: userMessage,
          context_found: false,
          memories_used: [],
        });
      }

      const memories = queryResult.value;

      // Filter by relevance score
      const relevantMemories = memories.filter(
        (m) => m.score >= this.config.minRelevanceScore,
      );

      if (relevantMemories.length === 0) {
        // No relevant memories found
        return ok({
          enhanced_prompt: userMessage,
          context_found: false,
          memories_used: [],
        });
      }

      // Format context block
      const contextBlock = this.formatContextBlock(relevantMemories);

      // Check if context block is too long
      if (contextBlock.length > this.config.maxContextLength) {
        // Truncate context block
        const truncated = contextBlock.substring(
          0,
          this.config.maxContextLength,
        );
        const lastNewline = truncated.lastIndexOf("\n");
        const finalContext = truncated.substring(
          0,
          lastNewline > 0 ? lastNewline : truncated.length,
        );

        return ok({
          enhanced_prompt: this.injectContext(userMessage, finalContext),
          context_found: true,
          memories_used: relevantMemories.slice(0, 2).map((m) => m.id),
        });
      }

      // Inject context into prompt
      const enhancedPrompt = this.injectContext(userMessage, contextBlock);

      return ok({
        enhanced_prompt: enhancedPrompt,
        context_found: true,
        memories_used: relevantMemories.map((m) => m.id),
      });
    } catch (error) {
      return err(
        new ToolError("Failed to enhance prompt", {
          operation: "pre-processor.enhance",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * Extract keywords from user message for memory query
   */
  private extractKeywords(message: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "might",
      "must",
      "can",
      "could",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
      "my",
      "your",
      "his",
      "its",
      "our",
      "their",
      "this",
      "that",
      "these",
      "those",
      "and",
      "or",
      "but",
      "so",
      "if",
      "then",
      "because",
      "as",
      "until",
      "while",
      "of",
      "at",
      "by",
      "for",
      "with",
      "about",
      "against",
      "between",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "to",
      "from",
      "up",
      "down",
      "in",
      "out",
      "on",
      "off",
      "over",
      "under",
      "again",
      "further",
      "once",
      "here",
      "there",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "too",
      "very",
      "just",
      "now",
      "want",
      "need",
      "like",
      "know",
      "think",
      "see",
      "come",
      "go",
      "get",
      "make",
      "take",
      "use",
      "tell",
      "ask",
      "try",
      "let",
      "put",
      "say",
      "set",
    ]);

    // Extract words
    const words = message
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Remove duplicates and return top keywords
    const uniqueWords = [...new Set(words)];

    // Prioritize words that appear multiple times or are capitalized
    const wordFrequency = new Map<string, number>();
    for (const word of uniqueWords) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }

    // Also extract potential technical terms (camelCase, PascalCase, etc.)
    const technicalTerms =
      message.match(/[A-Z][a-z]+[A-Z][a-z]+|_[a-z]+_|[a-z]+-[a-z]+/g) || [];

    // Combine and prioritize
    const keywords = [
      ...technicalTerms.map((t) => t.toLowerCase()),
      ...uniqueWords
        .sort(
          (a, b) => (wordFrequency.get(b) || 0) - (wordFrequency.get(a) || 0),
        )
        .slice(0, 10),
    ];

    // Remove duplicates again and limit
    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Format memories into a context block
   */
  private formatContextBlock(
    memories: Array<{
      id: string;
      content: string;
      topic: string;
      score: number;
    }>,
  ): string {
    const lines: string[] = [];

    lines.push(`[MEMORY_CONTEXT]`);
    lines.push(`## ${this.config.contextHeader}`);
    lines.push("");

    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];

      if (!memory) {
        continue;
      }

      lines.push(`### ${i + 1}. ${memory.topic}`);
      lines.push(memory.content);

      if (this.config.includeMetadata) {
        lines.push(`*(relevance: ${(memory.score * 100).toFixed(0)}%)*`);
      }

      lines.push("");
    }

    lines.push("[/MEMORY_CONTEXT]");

    return lines.join("\n");
  }

  /**
   * Inject context block into user message
   */
  private injectContext(userMessage: string, contextBlock: string): string {
    // Insert context block before the user message
    return `${contextBlock}

${userMessage}`;
  }
}

/**
 * Singleton instance for convenience
 */
let instance: PreProcessor | null = null;

/**
 * Get singleton PreProcessor instance
 */
export function getPreProcessor(config?: PreProcessorConfig): PreProcessor {
  if (!instance || config) {
    instance = new PreProcessor(config);
  }
  return instance;
}
