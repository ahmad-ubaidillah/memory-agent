/**
 * Type Definitions Index
 *
 * Central export for all TypeScript type definitions used in Memory-Agent MCP.
 */

// Memory-related types
export type {
  MemoryFact,
  MemoryStatus,
  MemoryMetadata,
  MemoryQueryResult,
  MemoryStoreInput,
  MemoryQueryInput,
  MemoryIngestInput,
  MemoryCompressInput,
  MemoryForgetInput,
  MemoryExportInput,
  MemoryImportInput,
  EnhancedPrompt,
  AutoLearnResult,
  DecayConfig,
  ConversationMessage,
  ReviewAction,
  MemoryReviewInput,
  MemoryStats,
  TOONPair,
  MemoryRow,
} from "./memory";

// MCP protocol types
export type {
  JSONSchema,
  JSONSchemaProperty,
  MCPTool,
  MCPToolContent,
  MCPToolResponse,
  MCPResource,
  MCPResourceContent,
  MCPCapabilities,
  MCPServerInfo,
  MCPRequestContext,
  ToolHandler,
  ResourceHandler,
  ToolRegistryEntry,
  ResourceRegistryEntry,
} from "./mcp";
