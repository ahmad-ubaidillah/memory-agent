/**
 * Memory Auto Learn Tool for Memory-Agent MCP Server
 *
 * MCP tool that automatically extracts and stores memories from
 * AI conversation responses. Uses the PostProcessor to detect
 * decision patterns and important learnings.
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";
import { PostProcessor } from "../interceptor/post-processor";
import { ToolError } from "../errors/types";
import type { MCPToolResponse } from "../types/mcp";

/**
 * Input schema for memory_auto_learn tool
 */
export const MemoryAutoLearnInputSchema = z.object({
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1)
    .describe("Array of conversation messages with role and content"),
  auto_detect_importance: z
    .boolean()
    .optional()
    .describe("Auto-detect importance from patterns (default: true)"),
  min_confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum confidence score to store memory (default: 0.7)"),
  max_memories: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum memories to store per conversation (default: 5)"),
});

/**
 * Type for memory_auto_learn tool input
 */
export type MemoryAutoLearnInput = z.infer<typeof MemoryAutoLearnInputSchema>;

/**
 * Output schema for memory_auto_learn tool
 */
export const MemoryAutoLearnOutputSchema = z.object({
  stored: z.boolean().describe("Whether a memory was stored"),
  reason: z.string().optional().describe("Reason for decision (if not stored)"),
  memory_id: z.string().optional().describe("Memory ID (if stored)"),
  content: z.string().optional().describe("Content that was stored (if stored)"),
  pattern_type: z.string().optional().describe("Type of pattern detected (if stored)"),
  confidence: z.number().optional().describe("Confidence score (if stored)"),
});

/**
 * Type for memory_auto_learn tool output
 */
export type MemoryAutoLearnOutput = z.infer<typeof MemoryAutoLearnOutputSchema>;

/**
 * MCP Tool definition for memory_auto_learn
 */
export const memoryAutoLearnToolDefinition = {
  name: "memory_auto_learn",
  description: `Automatically extract and store memories from AI conversation.

This tool:
1. Analyzes the last AI response in the conversation
2. Detects decision patterns, bug reports, recommendations, etc.
3. Extracts important learnings automatically
4. Stores them as persistent memories with appropriate importance

Detected patterns include:
- Decisions: "I decided to...", "I recommend..."
- Bugs: "The bug was caused by...", "Root cause..."
- Changes: "Let's change...", "We migrated..."
- Important: "Important:", "Warning:", "Best practice..."
- And more...

Use this to automatically capture important knowledge from conversations
without manual memory storage.

Performance: Async (non-blocking)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      conversation: {
        type: "array",
        description: "Array of conversation messages with role and content",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["user", "assistant"],
              description: "Message role (user or assistant)",
            },
            content: {
              type: "string",
              description: "Message content",
            },
          },
          required: ["role", "content"],
        },
      },
      auto_detect_importance: {
        type: "boolean",
        description: "Auto-detect importance from patterns (default: true)",
      },
      min_confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Minimum confidence score to store memory (default: 0.7)",
      },
      max_memories: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Maximum memories to store per conversation (default: 5)",
      },
    },
    required: ["conversation"],
    additionalProperties: false,
  },
};

/**
 * Execute memory_auto_learn tool
 *
 * @param db - SQLite database instance
 * @param input - Tool input parameters
 * @returns Result with auto-learn output or error
 */
export function executeMemoryAutoLearn(
  db: Database,
  input: unknown
): Result<MemoryAutoLearnOutput, ToolError> {
  // Validate input
  const inputResult = MemoryAutoLearnInputSchema.safeParse(input);

  if (!inputResult.success) {
    return err(
      new ToolError("Invalid input for memory_auto_learn tool", {
        errors: inputResult.error.errors,
      })
    );
  }

  const validatedInput = inputResult.data;

  // Create PostProcessor with optional configuration
  const postProcessor = new PostProcessor({
    autoDetectImportance: validatedInput.auto_detect_importance,
    minConfidenceScore: validatedInput.min_confidence,
    maxMemoriesPerConversation: validatedInput.max_memories,
  });

  // Process the conversation
  const processResult = postProcessor.process(db, validatedInput.conversation);

  if (processResult.isErr()) {
    return err(
      new ToolError("Failed to process conversation", {
        error: processResult.error.message,
        details: processResult.error.details,
      })
    );
  }

  const result = processResult.value;

  // Extract additional metadata if memory was stored
  if (result.stored && result.memory_id) {
    return ok({
      stored: true,
      memory_id: result.memory_id,
      content: result.content,
      reason: result.reason,
      pattern_type: (result as any).pattern_type,
      confidence: (result as any).confidence,
    });
  }

  return ok({
    stored: false,
    reason: result.reason,
  });
}

/**
 * Execute memory_auto_learn tool and return MCP response
 *
 * @param db - SQLite database instance
 * @param input - Tool input parameters
 * @returns MCP tool response
 */
export async function handleMemoryAutoLearn(
  db: Database,
  input: unknown
): Promise<MCPToolResponse> {
  const result = executeMemoryAutoLearn(db, input);

  if (result.isErr()) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: true,
            message: result.error.message,
            details: result.error.details,
          }),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.value, null, 2),
      },
    ],
  };
}

/**
 * Execute memory_auto_learn tool asynchronously (non-blocking)
 *
 * @param db - SQLite database instance
 * @param input - Tool input parameters
 * @param callback - Optional callback with result
 */
export function executeMemoryAutoLearnAsync(
  db: Database,
  input: unknown,
  callback?: (result: Result<MemoryAutoLearnOutput, ToolError>) => void
): void {
  // Use process.nextTick for non-blocking execution
  process.nextTick(() => {
    const result = executeMemoryAutoLearn(db, input);

    if (callback) {
      callback(result);
    } else {
      // Log result if no callback provided
      if (result.isOk() && result.value.stored) {
        console.log(`[AutoLearn] Stored memory: ${result.value.memory_id}`);
      }
    }
  });
}

/**
 * Export tool definition and executor
 */
export const autoLearnTool = {
  definition: memoryAutoLearnToolDefinition,
  execute: executeMemoryAutoLearn,
  handler: handleMemoryAutoLearn,
  executeAsync: executeMemoryAutoLearnAsync,
};
