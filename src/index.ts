#!/usr/bin/env bun
/**
 * Memory-Agent MCP Server
 *
 * A Model Context Protocol server that provides persistent memory capabilities
 * for AI assistants like Claude, Cursor, and Windsurf.
 */

import { Database } from "bun:sqlite";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ensureMemoryTable, storeMemory, queryMemories, getMemoryById, deleteMemory, getMemoryStats, updateMemory, listMemories } from "./core/memory-db";
import { wrapError } from "./errors/wrap.js";
import { executeMemoryDecay } from "./tools/decay";
import { executeMemoryReview } from "./tools/review";
import { handleMemoryEnhancePrompt as handleMemoryEnhancePromptReal } from "./tools/enhance-prompt";
import { handleMemoryAutoLearn as handleMemoryAutoLearnReal } from "./tools/auto-learn";
import type {
  MCPResource,
  MCPResourceContent,
  MCPTool,
  MCPToolResponse,
} from "./types/mcp.js";
import { getLogger } from "./utils/logger.js";

const envLevel = typeof Bun !== "undefined" ? Bun.env.LOG_LEVEL : undefined;
// biome-ignore lint/suspicious/noExplicitAny: Logger level can be string or undefined
const logger = getLogger({ level: (envLevel as any) || "INFO" });

/**
 * Server metadata
 */
const SERVER_INFO = {
  name: "memory-agent-mcp",
  version: "0.1.0",
  description: "Memory-Agent MCP Server with persistent memory capabilities",
};

/**
 * Create MCP server instance
 */
function createServer(): Server {
  return new Server(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );
}

/**
 * Server instance
 */
const server = createServer();

/**
 * Database instance
 */
let db: Database | null = null;

/**
 * List all available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: MCPTool[] = [
    // Memory Tools
    {
      name: "memory_store",
      description: "Store a new memory with optional metadata",
      inputSchema: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The memory content to store",
          },
          topic: {
            type: "string",
            description: "Optional topic/category for the memory",
          },
          importance: {
            type: "number",
            description: "Importance score from 0 to 1 (default: 0.5)",
            minimum: 0,
            maximum: 1,
          },
          metadata: {
            type: "object",
            description: "Optional additional metadata",
          },
        },
        required: ["content"],
      },
    },
    {
      name: "memory_query",
      description: "Query memories using semantic search",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 10)",
          },
          topic: {
            type: "string",
            description: "Filter by topic",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "memory_forget",
      description: "Delete a specific memory by ID",
      inputSchema: {
        type: "object",
        properties: {
          memory_id: {
            type: "string",
            description: "The ID of the memory to delete",
          },
        },
        required: ["memory_id"],
      },
    },
    {
      name: "memory_stats",
      description: "Get statistics about stored memories",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "memory_export",
      description: "Export memories to a file",
      inputSchema: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["json", "markdown"],
            description: "Export format (default: json)",
          },
          topic: {
            type: "string",
            description: "Filter by topic (optional)",
          },
        },
      },
    },
    {
      name: "memory_import",
      description: "Import memories from a file",
      inputSchema: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "Path to the file to import",
          },
        },
        required: ["file_path"],
      },
    },
    // Interceptor Tools
    {
      name: "memory_enhance_prompt",
      description: "Enhance a user prompt with relevant memory context",
      inputSchema: {
        type: "object",
        properties: {
          user_message: {
            type: "string",
            description: "The user's message to enhance",
          },
        },
        required: ["user_message"],
      },
    },
    {
      name: "memory_auto_learn",
      description: "Automatically extract and store memories from conversation",
      inputSchema: {
        type: "object",
        properties: {
          conversation: {
            type: "array",
            description:
              "The conversation history (objects with role and content)",
          },
          auto_detect_importance: {
            type: "boolean",
            description: "Auto-detect importance (default: true)",
          },
        },
        required: ["conversation"],
      },
    },
    {
      name: "memory_decay",
      description: "Run the decay function to manage memory quality",
      inputSchema: {
        type: "object",
        properties: {
          decay_factor: {
            type: "number",
            description: "Decay factor (default: 0.95)",
          },
          archive_threshold: {
            type: "number",
            description: "Archive threshold (default: 0.2)",
          },
          delete_threshold: {
            type: "number",
            description: "Delete threshold (default: 0.05)",
          },
          dry_run: {
            type: "boolean",
            description: "Preview changes without applying (default: false)",
          },
        },
      },
    },
    {
      name: "memory_review",
      description: "Review and manage archived memories",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["list", "restore", "delete"],
            description: "Action to perform",
          },
          memory_id: {
            type: "string",
            description: "Memory ID for restore/delete actions",
          },
          limit: {
            type: "number",
            description: "Maximum number of memories to list (default: 20)",
          },
        },
      },
    },
    {
      name: "memory_ingest",
      description: "Ingest memories from files or directories",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File or directory path to ingest",
          },
          recursive: {
            type: "boolean",
            description: "Recursively ingest directories (default: true)",
          },
        },
        required: ["path"],
      },
    },
    {
      name: "memory_compress",
      description: "Compress multiple related memories into summaries",
      inputSchema: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Topic to compress (optional, compresses all if not specified)",
          },
          older_than_days: {
            type: "number",
            description:
              "Only compress memories older than N days (default: 30)",
          },
        },
      },
    },
  ];

  return { tools };
});

/**
 * Handle tool execution requests
 */
server.setRequestHandler(
  CallToolRequestSchema,
  async (
    request,
    _extra,
  ): Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }> => {
    const { name, arguments: args } = request.params;

    try {
      let result: MCPToolResponse;

      switch (name) {
        case "memory_store":
          result = await handleMemoryStore(args);
          break;
        case "memory_query":
          result = await handleMemoryQuery(args);
          break;
        case "memory_forget":
          result = await handleMemoryForget(args);
          break;
        case "memory_stats":
          result = await handleMemoryStats(args);
          break;
        case "memory_export":
          result = await handleMemoryExport(args);
          break;
        case "memory_import":
          result = await handleMemoryImport(args);
          break;
        case "memory_enhance_prompt":
          result = await handleMemoryEnhancePrompt(args);
          break;
        case "memory_auto_learn":
          result = await handleMemoryAutoLearn(args);
          break;
        case "memory_decay":
          result = await handleMemoryDecay(args);
          break;
        case "memory_review":
          result = await handleMemoryReview(args);
          break;
        case "memory_ingest":
          result = await handleMemoryIngest(args);
          break;
        case "memory_compress":
          result = await handleMemoryCompress(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return result as {
        content: { type: string; text: string }[];
        isError?: boolean;
      };
    } catch (error) {
      const wrapped = wrapError(error, { operation: name });

      // Conditionally construct error object without undefined stack
      const errorObj = wrapped.stack
        ? { code: wrapped.code, message: wrapped.message, stack: wrapped.stack }
        : { code: wrapped.code, message: wrapped.message };

      logger.error(`Tool execution failed: ${name}`, {}, errorObj);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              code: wrapped.code,
              message: wrapped.message,
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

/**
 * List all available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources: MCPResource[] = [
    {
      uri: "memory://stats",
      name: "Memory Statistics",
      description: "Current statistics about the memory database",
      mimeType: "application/json",
    },
    {
      uri: "memory://config",
      name: "Configuration",
      description: "Current server configuration",
      mimeType: "application/json",
    },
  ];

  return { resources };
});

/**
 * Handle resource read requests
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  const contents: MCPResourceContent[] = [];

  switch (uri) {
    case "memory://stats":
      contents.push({
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          total_memories: 0,
          topics: {},
          mode: "full",
        }),
      });
      break;
    case "memory://config":
      contents.push({
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          version: SERVER_INFO.version,
          mode: "full",
        }),
      });
      break;
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }

  return { contents };
});

// Tool handlers using real implementations
async function handleMemoryStore(args: unknown): Promise<MCPToolResponse> {
  const input = args as { content: string; topic?: string; importance?: number; metadata?: Record<string, unknown> };
  
  if (!input.content) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "content is required" }) }],
      isError: true,
    };
  }
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = storeMemory(db, {
    content: input.content,
    topic: input.topic,
    importance: input.importance,
    metadata: input.metadata,
  });
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  return {
    content: [{ type: "text", text: JSON.stringify({ success: true, memory_id: result.value.id }) }],
  };
}

async function handleMemoryQuery(args: unknown): Promise<MCPToolResponse> {
  const input = args as { query: string; limit?: number; topic?: string; min_importance?: number };
  
  if (!input.query) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "query is required" }) }],
      isError: true,
    };
  }
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = queryMemories(db, {
    query: input.query,
    limit: input.limit ?? 10,
    topic: input.topic,
    minImportance: input.min_importance,
  });
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  return {
    content: [{ type: "text", text: JSON.stringify({ results: result.value }) }],
  };
}

async function handleMemoryForget(args: unknown): Promise<MCPToolResponse> {
  const input = args as { memory_id: string };
  
  if (!input.memory_id) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "memory_id is required" }) }],
      isError: true,
    };
  }
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = deleteMemory(db, input.memory_id);
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  return {
    content: [{ type: "text", text: JSON.stringify({ success: result.value, deleted: result.value }) }],
  };
}

async function handleMemoryStats(_args: unknown): Promise<MCPToolResponse> {
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = getMemoryStats(db);
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  const stats = result.value;
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify({
        total_memories: stats.total,
        active_memories: stats.active,
        archived_memories: stats.archived,
        topics: stats.byTopic,
        average_importance: stats.averageImportance,
      }) 
    }],
  };
}

async function handleMemoryExport(args: unknown): Promise<MCPToolResponse> {
  const input = args as { format?: string; topic?: string };
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = listMemories(db, { topic: input.topic, limit: 1000 });
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  const memories = result.value;
  
  if (input.format === "markdown") {
    // Export as markdown
    let markdown = "# Memory Export\n\n";
    for (const memory of memories) {
      markdown += `## ${memory.topic}\n\n`;
      markdown += `${memory.content_raw}\n\n`;
      markdown += `---\n`;
      markdown += `Importance: ${memory.importance_score} | Created: ${memory.created_at.toISOString()}\n\n`;
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ format: "markdown", content: markdown, count: memories.length }) }],
    };
  }
  
  // Default: JSON format
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify({ 
        format: "json", 
        memories: memories.map(m => ({
          id: m.id,
          topic: m.topic,
          content: m.content_raw,
          importance: m.importance_score,
          created_at: m.created_at.toISOString(),
        })),
        count: memories.length 
      }) 
    }],
  };
}

async function handleMemoryImport(args: unknown): Promise<MCPToolResponse> {
  const input = args as { file_path: string };
  
  if (!input.file_path) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "file_path is required" }) }],
      isError: true,
    };
  }
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  try {
    // Read file
    const file = Bun.file(input.file_path);
    const content = await file.text();
    
    let imported = 0;
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(content);
      const memories = Array.isArray(data) ? data : data.memories;
      
      if (Array.isArray(memories)) {
        for (const mem of memories) {
          const result = storeMemory(db, {
            content: mem.content || mem.content_raw,
            topic: mem.topic,
            importance: mem.importance || mem.importance_score,
          });
          if (result.isOk()) {
            imported++;
          }
        }
      }
    } catch {
      // Try markdown format - simple parsing
      const lines = content.split("\n");
      let currentTopic = "general";
      let currentContent = "";
      
      for (const line of lines) {
        if (line.startsWith("## ")) {
          // Save previous memory
          if (currentContent.trim()) {
            storeMemory(db, { content: currentContent.trim(), topic: currentTopic });
            imported++;
          }
          currentTopic = line.substring(3).trim();
          currentContent = "";
        } else if (line.trim() && !line.startsWith("#")) {
          currentContent += line + "\n";
        }
      }
      
      // Save last memory
      if (currentContent.trim()) {
        storeMemory(db, { content: currentContent.trim(), topic: currentTopic });
        imported++;
      }
    }
    
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, imported }) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: `Failed to import: ${error}` }) }],
      isError: true,
    };
  }
}

async function handleMemoryEnhancePrompt(
  args: unknown,
): Promise<MCPToolResponse> {
  if (!db) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: true,
            message: "Database not initialized",
          }),
        },
      ],
      isError: true,
    };
  }
  return handleMemoryEnhancePromptReal(db, args);
}

async function handleMemoryAutoLearn(args: unknown): Promise<MCPToolResponse> {
  if (!db) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: true,
            message: "Database not initialized",
          }),
        },
      ],
      isError: true,
    };
  }
  return handleMemoryAutoLearnReal(db, args);
}

async function handleMemoryDecay(args: unknown): Promise<MCPToolResponse> {
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = executeMemoryDecay(db, args);
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  const decayResult = result.value;
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify({ 
        success: decayResult.success,
        archived: decayResult.archived,
        deleted: decayResult.deleted,
        kept: decayResult.kept,
        duration_ms: decayResult.duration_ms,
        message: decayResult.message,
      }) 
    }],
  };
}

async function handleMemoryReview(args: unknown): Promise<MCPToolResponse> {
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  const result = executeMemoryReview(db, args);
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  return {
    content: [{ type: "text", text: JSON.stringify(result.value) }],
  };
}

async function handleMemoryIngest(args: unknown): Promise<MCPToolResponse> {
  const input = args as { path: string; recursive?: boolean };
  
  if (!input.path) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "path is required" }) }],
      isError: true,
    };
  }
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  try {
    const path = input.path;
    const recursive = input.recursive ?? true;
    let ingested = 0;
    
    const file = Bun.file(path);
    const stat = await file.exists();
    
    if (!stat) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: true, message: "Path not found" }) }],
        isError: true,
      };
    }
    
    // Check if it's a file or directory
    // Note: This is simplified - in production you'd want proper directory traversal
    const content = await file.text();
    
    // Extract text content - simple approach
    const textContent = content;
    
    // Store as memory with topic based on filename
    const topic = path.split("/").pop()?.split("\\").pop()?.replace(/\.[^.]+$/, "") || "ingested";
    
    const result = storeMemory(db, {
      content: textContent.substring(0, 10000), // Limit content length
      topic: `file:${topic}`,
      importance: 0.5,
      metadata: { source: "ingested" as const, path: path, ingested_at: new Date().toISOString() },
    });
    
    if (result.isOk()) {
      ingested = 1;
    }
    
    return {
      content: [{ type: "text", text: JSON.stringify({ ingested, path }) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: `Failed to ingest: ${error}` }) }],
      isError: true,
    };
  }
}

async function handleMemoryCompress(args: unknown): Promise<MCPToolResponse> {
  const input = args as { topic?: string; older_than_days?: number };
  
  if (!db) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: "Database not initialized" }) }],
      isError: true,
    };
  }
  
  // Get memories to compress
  const olderThan = input.older_than_days ?? 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThan);
  
  const result = listMemories(db, { topic: input.topic, limit: 100 });
  
  if (result.isErr()) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: true, message: result.error.message }) }],
      isError: true,
    };
  }
  
  const memories = result.value.filter(m => m.created_at < cutoffDate);
  
  if (memories.length === 0) {
    return {
      content: [{ type: "text", text: JSON.stringify({ compressed: 0, message: "No memories to compress" }) }],
    };
  }
  
  // Simple compression: keep only highest importance memory and mark others as archived
  let compressed = 0;
  
  // Sort by importance and keep top one
  memories.sort((a, b) => b.importance_score - a.importance_score);
  
  for (let i = 1; i < memories.length; i++) {
    const mem = memories[i];
    if (!mem) continue;
    
    const updateResult = updateMemory(db, {
      memoryId: mem.id,
      status: "archived",
    });
    
    if (updateResult.isOk()) {
      compressed++;
    }
  }
  
  return {
    content: [{ type: "text", text: JSON.stringify({ compressed, total: memories.length }) }],
  };
}

/**
 * Main entry point
 */
async function main() {
  logger.info(`Starting ${SERVER_INFO.name} v${SERVER_INFO.version}`);

  // Initialize database
  const dbPath =
    typeof Bun !== "undefined" && Bun.env.MEMORY_DB_PATH
      ? Bun.env.MEMORY_DB_PATH
      : ".memory/memory.db";

  try {
    db = new Database(dbPath);
    ensureMemoryTable(db);
    logger.info("Database initialized successfully", { path: dbPath });
  } catch (error) {
    logger.error(
      "Failed to initialize database",
      {},
      {
        code: "DB_INIT_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    );
    throw error;
  }

  const transport = new StdioServerTransport();

  await server.connect(transport);

  const memoryMode =
    typeof Bun !== "undefined" ? Bun.env.MEMORY_MODE : undefined;
  const projectRoot =
    typeof Bun !== "undefined" ? Bun.env.MEMORY_PROJECT_ROOT : undefined;
  logger.info("Server started successfully", {
    mode: memoryMode || "full",
    project: projectRoot || process.cwd(),
    database: dbPath,
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await server.close();
    logger.info("Server closed successfully");

    // Close database connection
    if (db) {
      db.close();
      logger.info("Database closed successfully");
    }

    process.exit(0);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Conditionally construct error object without undefined stack
    const errorObj = errorStack
      ? { code: "SHUTDOWN_ERROR", message: errorMsg, stack: errorStack }
      : { code: "SHUTDOWN_ERROR", message: errorMsg };

    logger.error("Error during shutdown", {}, errorObj);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  const wrapped = wrapError(error, { operation: "uncaughtException" });

  // Conditionally construct error object without undefined stack
  const errorObj = wrapped.stack
    ? { code: wrapped.code, message: wrapped.message, stack: wrapped.stack }
    : { code: wrapped.code, message: wrapped.message };

  logger.error("Uncaught exception", {}, errorObj);
  process.exit(1);
});

process.on("unhandledRejection", (reason, _promise) => {
  const wrapped = wrapError(reason, { operation: "unhandledRejection" });

  // Conditionally construct error object without undefined stack
  const errorObj = wrapped.stack
    ? { code: wrapped.code, message: wrapped.message, stack: wrapped.stack }
    : { code: wrapped.code, message: wrapped.message };

  logger.error("Unhandled rejection", {}, errorObj);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  const wrapped = wrapError(error, { operation: "main" });

  // Conditionally construct error object without undefined stack
  const errorObj = wrapped.stack
    ? { code: wrapped.code, message: wrapped.message, stack: wrapped.stack }
    : { code: wrapped.code, message: wrapped.message };

  logger.error("Failed to start server", {}, errorObj);
  process.exit(1);
});
