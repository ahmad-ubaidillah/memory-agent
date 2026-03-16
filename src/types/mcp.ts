/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Core types for implementing MCP server tools, resources, and capabilities.
 */

/**
 * JSON Schema definition for tool input validation
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  items?: JSONSchema;
  enum?: string[];
  default?: unknown;
  description?: string;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: JSONSchemaProperty;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/**
 * MCP Tool response content
 */
export interface MCPToolContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

/**
 * MCP Tool response
 */
export interface MCPToolResponse {
  content: MCPToolContent[];
  isError?: boolean;
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * MCP Resource content
 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/**
 * Server capabilities
 */
export interface MCPCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  middleware?: boolean;
}

/**
 * Server information
 */
export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
}

/**
 * MCP Request context
 */
export interface MCPRequestContext {
  requestId?: string;
  clientInfo?: {
    name: string;
    version: string;
  };
}

/**
 * Tool handler function type
 */
export type ToolHandler = (input: unknown, context?: MCPRequestContext) => Promise<MCPToolResponse>;

/**
 * Resource handler function type
 */
export type ResourceHandler = (
  uri: string,
  context?: MCPRequestContext
) => Promise<MCPResourceContent>;

/**
 * Tool registry entry
 */
export interface ToolRegistryEntry {
  tool: MCPTool;
  handler: ToolHandler;
}

/**
 * Resource registry entry
 */
export interface ResourceRegistryEntry {
  resource: MCPResource;
  handler: ResourceHandler;
}
