/**
 * Memory Enhance Prompt Tool for Memory-Agent MCP Server
 *
 * MCP tool that enhances user prompts with relevant memory context.
 * Uses the PreProcessor to query relevant memories and inject them
 * into the prompt for improved AI responses.
 */

import type { Database } from "bun:sqlite";
import { type Result, err, ok } from "neverthrow";
import { z } from "zod";
import { PreProcessor } from "../interceptor/pre-processor";
import { ToolError } from "../errors/types";
import type { MCPToolResponse } from "../types/mcp";

/**
 * Input schema for memory_enhance_prompt tool
 */
export const MemoryEnhancePromptInputSchema = z.object({
  user_message: z.string().min(1).describe("The user's message to enhance with memory context"),
  max_context: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of memories to inject (default: 3)"),
  min_relevance: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum relevance score for memories (default: 0.3)"),
});

/**
 * Type for memory_enhance_prompt tool input
 */
export type MemoryEnhancePromptInput = z.infer<typeof MemoryEnhancePromptInputSchema>;

/**
 * Output schema for memory_enhance_prompt tool
 */
export const MemoryEnhancePromptOutputSchema = z.object({
  enhanced_prompt: z.string().describe("The user prompt enhanced with memory context"),
  context_found: z.boolean().describe("Whether relevant context was found and injected"),
  memories_used: z.array(z.string()).describe("IDs of memories used for enhancement"),
  context_block: z.string().optional().describe("The context block that was injected (if any)"),
});

/**
 * Type for memory_enhance_prompt tool output
 */
export type MemoryEnhancePromptOutput = z.infer<typeof MemoryEnhancePromptOutputSchema>;

/**
 * MCP Tool definition for memory_enhance_prompt
 */
export const memoryEnhancePromptToolDefinition = {
  name: "memory_enhance_prompt",
  description: `Enhance a user prompt with relevant memory context.

This tool:
1. Analyzes the user's message to extract keywords
2. Queries the memory database for relevant past knowledge
3. Injects relevant memories into the prompt as context
4. Returns the enhanced prompt for the AI to process

Use this to provide the AI with relevant context from past conversations,
decisions, and learnings without manual memory queries.

Performance: <50ms for most queries`,
  inputSchema: {
    type: "object" as const,
    properties: {
      user_message: {
        type: "string",
        description: "The user's message to enhance with memory context",
      },
      max_context: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description: "Maximum number of memories to inject (default: 3)",
      },
      min_relevance: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Minimum relevance score for memories (default: 0.3)",
      },
    },
    required: ["user_message"],
    additionalProperties: false,
  },
};

/**
 * Execute memory_enhance_prompt tool
 *
 * @param db - SQLite database instance
 * @param input - Tool input parameters
 * @returns Result with enhanced prompt or error
 */
export function executeMemoryEnhancePrompt(
  db: Database,
  input: unknown
): Result<MemoryEnhancePromptOutput, ToolError> {
  // Validate input
  const inputResult = MemoryEnhancePromptInputSchema.safeParse(input);

  if (!inputResult.success) {
    return err(
      new ToolError("Invalid input for memory_enhance_prompt tool", {
        errors: inputResult.error.errors,
      })
    );
  }

  const validatedInput = inputResult.data;

  // Create PreProcessor with optional configuration
  const preProcessor = new PreProcessor({
    maxContextMemories: validatedInput.max_context,
    minRelevanceScore: validatedInput.min_relevance,
  });

  // Enhance the prompt
  const enhanceResult = preProcessor.enhance(db, validatedInput.user_message);

  if (enhanceResult.isErr()) {
    return err(
      new ToolError("Failed to enhance prompt", {
        error: enhanceResult.error.message,
        details: enhanceResult.error.details,
      })
    );
  }

  const result = enhanceResult.value;

  // Extract context block if present
  let contextBlock: string | undefined;
  if (result.context_found) {
    const contextStart = result.enhanced_prompt.indexOf("[MEMORY_CONTEXT]");
    const contextEnd = result.enhanced_prompt.indexOf("[/MEMORY_CONTEXT]");
    if (contextStart !== -1 && contextEnd !== -1) {
      contextBlock = result.enhanced_prompt.substring(contextStart, contextEnd + "[/MEMORY_CONTEXT]".length);
    }
  }

  return ok({
    enhanced_prompt: result.enhanced_prompt,
    context_found: result.context_found,
    memories_used: result.memories_used,
    context_block: contextBlock,
  });
}

/**
 * Execute memory_enhance_prompt tool and return MCP response
 *
 * @param db - SQLite database instance
 * @param input - Tool input parameters
 * @returns MCP tool response
 */
export async function handleMemoryEnhancePrompt(
  db: Database,
  input: unknown
): Promise<MCPToolResponse> {
  const result = executeMemoryEnhancePrompt(db, input);

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
 * Export tool definition and executor
 */
export const enhancePromptTool = {
  definition: memoryEnhancePromptToolDefinition,
  execute: executeMemoryEnhancePrompt,
  handler: handleMemoryEnhancePrompt,
};
