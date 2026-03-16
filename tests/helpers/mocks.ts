/**
 * Mock Implementations for Testing
 *
 * Provides mock implementations of core services for unit and integration testing.
 * All mocks are designed to be fast, deterministic, and easy to use in tests.
 */

import type { MemoryFact, MemoryQueryResult, MemoryRow } from "../../src/types/memory";

/**
 * Mock Memory Database
 *
 * In-memory database implementation for testing without actual SQLite.
 */
export interface MockDatabase {
  memories: Map<string, MemoryFact>;
  prepare: (sql: string) => {
    run: (params: Record<string, unknown>) => { changes: number };
    all: (params?: unknown[]) => MemoryRow[];
    get: (params?: unknown[]) => MemoryRow | undefined;
  };
  transaction: <T>(fn: () => T) => T;
  close: () => void;
  clear: () => void;
  getLastInserted: () => MemoryFact | undefined;
  insert: (memory: MemoryFact) => void;
}

export function createMockDatabase(): MockDatabase {
  const memories = new Map<string, MemoryFact>();
  let lastInserted: MemoryFact | undefined;

  return {
    memories,

    prepare(sql: string) {
      const sqlLower = sql.toLowerCase();

      return {
        run(params: Record<string, unknown>) {
          // INSERT operation
          if (sqlLower.includes("insert")) {
            const id = (params.$id as string) || `mem_${Date.now()}`;
            const memory: MemoryFact = {
              id,
              uri: (params.$uri as string) || `memory://project/fact/${id}`,
              topic: (params.$topic as string) || "general",
              content_toon: (params.$content_toon as string) || "",
              content_raw: (params.$content_raw as string) || "",
              bin_id: (params.$bin_id as number) || 1,
              importance_score: (params.$importance_score as number) || 0.5,
              status: ((params.$status as string) || "active") as MemoryFact["status"],
              access_count: (params.$access_count as number) || 0,
              created_at: new Date((params.$created_at as string) || new Date()),
              updated_at: new Date((params.$updated_at as string) || new Date()),
              metadata: params.$metadata ? JSON.parse(params.$metadata as string) : undefined,
            };
            memories.set(id, memory);
            lastInserted = memory;
            return { changes: 1 };
          }

          // UPDATE operation
          if (sqlLower.includes("update")) {
            if (sqlLower.includes("where id =")) {
              const id = params.$id as string;
              const memory = memories.get(id);
              if (memory) {
                if (params.$importance_score !== undefined) {
                  memory.importance_score = params.$importance_score as number;
                }
                if (params.$status !== undefined) {
                  memory.status = params.$status as MemoryFact["status"];
                }
                if (params.$access_count !== undefined) {
                  memory.access_count = params.$access_count as number;
                }
                memory.updated_at = new Date();
                return { changes: 1 };
              }
            }
            return { changes: 0 };
          }

          // DELETE operation
          if (sqlLower.includes("delete")) {
            if (sqlLower.includes("where id =")) {
              const id = params.$id as string;
              const deleted = memories.delete(id);
              return { changes: deleted ? 1 : 0 };
            }
            // Delete by topic
            if (sqlLower.includes("where topic =")) {
              const topic = params.$topic as string;
              let count = 0;
              for (const [id, memory] of memories.entries()) {
                if (memory.topic === topic) {
                  memories.delete(id);
                  count++;
                }
              }
              return { changes: count };
            }
            return { changes: 0 };
          }

          return { changes: 0 };
        },

        all(params?: unknown[]) {
          // SELECT operation
          if (sqlLower.includes("select")) {
            let results = Array.from(memories.values());

            // Filter by topic
            if (sqlLower.includes("where topic =") && params) {
              const topic = params[0] as string;
              results = results.filter((m) => m.topic === topic);
            }

            // Filter by status
            if (sqlLower.includes("and status =") && params && params.length > 1) {
              const status = params[1] as string;
              results = results.filter((m) => m.status === status);
            }

            // Filter by min importance
            if (sqlLower.includes("importance_score >=") && params) {
              const minImportance = Array.isArray(params)
                ? (params.find((_, _i) => sqlLower.includes("importance_score >=")) as number)
                : 0;
              results = results.filter((m) => m.importance_score >= minImportance);
            }

            // Order by importance
            if (sqlLower.includes("order by importance_score desc")) {
              results.sort((a, b) => b.importance_score - a.importance_score);
            }

            // Apply limit
            if (sqlLower.includes("limit") && params) {
              const _limitIndex = sqlLower.indexOf("limit");
              const limit = Array.isArray(params) ? (params[params.length - 1] as number) : 10;
              results = results.slice(0, limit);
            }

            // Convert to MemoryRow format
            return results.map((m) => ({
              id: m.id,
              uri: m.uri,
              topic: m.topic,
              content_toon: m.content_toon,
              content_raw: m.content_raw,
              vector: m.vector ? Buffer.from(new Float32Array(m.vector).buffer) : null,
              bin_id: m.bin_id,
              importance_score: m.importance_score,
              status: m.status,
              access_count: m.access_count,
              created_at: m.created_at.toISOString(),
              updated_at: m.updated_at.toISOString(),
              archived_at: m.archived_at?.toISOString() || null,
              metadata: m.metadata ? JSON.stringify(m.metadata) : null,
            }));
          }

          return [];
        },

        get(params?: unknown[]) {
          const results = this.all(params);
          return results.length > 0 ? results[0] : undefined;
        },
      };
    },

    transaction<T>(fn: () => T): T {
      // Simple mock - just execute the function
      return fn();
    },

    close() {
      // No-op for in-memory database
    },

    clear() {
      memories.clear();
      lastInserted = undefined;
    },

    getLastInserted(): MemoryFact | undefined {
      return lastInserted;
    },

    insert(memory: MemoryFact) {
      memories.set(memory.id, memory);
      lastInserted = memory;
    },
  };
}

/**
 * Mock Embedder
 *
 * Generates deterministic embeddings for testing without loading ML models.
 */
export interface MockEmbedder {
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;
  getDimension: () => number;
}

export function createMockEmbedder(dimension = 384): MockEmbedder {
  return {
    async embed(text: string): Promise<number[]> {
      // Generate deterministic embedding based on text content
      const embedding = new Array(dimension).fill(0);

      // Simple hash-based embedding (not realistic, but deterministic)
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        embedding[i % dimension] += Math.sin(charCode * (i + 1)) * 0.1;
      }

      // Normalize to unit length
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map((val) => val / (magnitude || 1));
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
      return Promise.all(texts.map((text) => this.embed(text)));
    },

    getDimension(): number {
      return dimension;
    },
  };
}

/**
 * Mock LLM Bridge
 *
 * Provides predictable LLM responses for testing without loading models.
 */
export interface MockLLM {
  distill: (content: string) => Promise<string>;
  expandQuery: (query: string) => Promise<string[]>;
  shouldLearn: (conversation: Array<{ role: string; content: string }>) => Promise<boolean>;
}

export function createMockLLM(): MockLLM {
  return {
    async distill(content: string): Promise<string> {
      // Simple TOON distillation logic
      const patterns: Record<string, string> = {
        decided: "decision",
        chose: "decision",
        recommend: "recommendation",
        bug: "bug",
        fix: "fix",
        api: "api",
        endpoint: "endpoint",
      };

      const pairs: string[] = [];
      const words = content.toLowerCase().split(/\s+/);

      for (const [pattern, key] of Object.entries(patterns)) {
        if (words.includes(pattern)) {
          pairs.push(`${key}:${pattern}`);
        }
      }

      // Add date if content suggests a decision
      if (pairs.some((p) => p.startsWith("decision:"))) {
        pairs.push(`date:${new Date().toISOString().split("T")[0]}`);
      }

      return pairs.length > 0 ? pairs.join("|") : `note:${content.substring(0, 20)}`;
    },

    async expandQuery(query: string): Promise<string[]> {
      // Simple query expansion
      const expansions = [query];

      // Add synonyms/related terms
      const synonyms: Record<string, string[]> = {
        bug: ["error", "issue", "problem"],
        fix: ["solve", "resolve", "patch"],
        api: ["endpoint", "route", "service"],
        decision: ["choice", "selection", "preference"],
      };

      for (const [term, related] of Object.entries(synonyms)) {
        if (query.toLowerCase().includes(term)) {
          expansions.push(...related);
        }
      }

      return expansions;
    },

    async shouldLearn(conversation: Array<{ role: string; content: string }>): Promise<boolean> {
      // Simple pattern matching to detect valuable information
      const decisionPatterns = [
        /i (decided|chose|recommend)/i,
        /let's (change|switch|use)/i,
        /the (bug|issue) was/i,
        /we should (implement|use|adopt)/i,
      ];

      const content = conversation.map((m) => m.content).join(" ");
      return decisionPatterns.some((pattern) => pattern.test(content));
    },
  };
}

/**
 * Mock Logger
 *
 * Captures log entries for testing without actual logging output.
 */
export interface MockLogger {
  entries: Array<{
    level: string;
    message: string;
    context?: Record<string, unknown>;
    error?: { code: string; message?: string };
  }>;
  error: (
    message: string,
    context?: Record<string, unknown>,
    error?: { code: string; message?: string }
  ) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
  clear: () => void;
  getEntriesByLevel: (
    level: string
  ) => Array<{ message: string; context?: Record<string, unknown> }>;
}

export function createMockLogger(): MockLogger {
  const entries: MockLogger["entries"] = [];

  return {
    entries,

    error(
      message: string,
      context?: Record<string, unknown>,
      error?: { code: string; message?: string }
    ) {
      const entry: {
        level: string;
        message: string;
        context?: Record<string, unknown>;
        error?: { code: string; message?: string };
      } = { level: "ERROR", message };
      if (context !== undefined) entry.context = context;
      if (error !== undefined) entry.error = error;
      entries.push(entry);
    },

    warn(message: string, context?: Record<string, unknown>) {
      const entry: {
        level: string;
        message: string;
        context?: Record<string, unknown>;
      } = {
        level: "WARN",
        message,
      };
      if (context !== undefined) entry.context = context;
      entries.push(entry);
    },

    info(message: string, context?: Record<string, unknown>) {
      const entry: {
        level: string;
        message: string;
        context?: Record<string, unknown>;
      } = {
        level: "INFO",
        message,
      };
      if (context !== undefined) entry.context = context;
      entries.push(entry);
    },

    debug(message: string, context?: Record<string, unknown>) {
      const entry: {
        level: string;
        message: string;
        context?: Record<string, unknown>;
      } = {
        level: "DEBUG",
        message,
      };
      if (context !== undefined) entry.context = context;
      entries.push(entry);
    },

    clear() {
      entries.length = 0;
    },

    getEntriesByLevel(level: string) {
      return entries
        .filter((e) => e.level === level)
        .map((e) => {
          const entry: { message: string; context?: Record<string, unknown> } = {
            message: e.message,
          };
          if (e.context !== undefined) entry.context = e.context;
          return entry;
        });
    },
  };
}

/**
 * Mock MCP Server Client
 *
 * Simulates MCP client for integration testing.
 */
export interface MockMCPClient {
  tools: Map<string, { name: string; description: string; inputSchema: unknown }>;
  resources: Map<string, { uri: string; name: string; description: string }>;
  listTools: () => Promise<{
    tools: Array<{ name: string; description: string; inputSchema: unknown }>;
  }>;
  listResources: () => Promise<{
    resources: Array<{ uri: string; name: string; description: string }>;
  }>;
  callTool: (request: {
    name: string;
    arguments: Record<string, unknown>;
  }) => Promise<{
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }>;
  registerTool: (tool: {
    name: string;
    description: string;
    inputSchema: unknown;
    handler: (args: Record<string, unknown>) => Promise<{
      content: Array<{ type: string; text?: string }>;
      isError?: boolean;
    }>;
  }) => void;
  registerResource: (resource: {
    uri: string;
    name: string;
    description: string;
    handler: (...args: unknown[]) => Promise<unknown>;
  }) => void;
}

export function createMockMCPClient(): MockMCPClient {
  const tools = new Map<
    string,
    {
      name: string;
      description: string;
      inputSchema: unknown;
      handler: (args: Record<string, unknown>) => Promise<{
        content: Array<{ type: string; text?: string }>;
        isError?: boolean;
      }>;
    }
  >();
  const resources = new Map<
    string,
    {
      uri: string;
      name: string;
      description: string;
      handler: (...args: unknown[]) => Promise<unknown>;
    }
  >();

  return {
    tools,
    resources,

    async listTools() {
      return {
        tools: Array.from(tools.values()).map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };
    },

    async listResources() {
      return {
        resources: Array.from(resources.values()).map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
        })),
      };
    },

    async callTool(request: {
      name: string;
      arguments: Record<string, unknown>;
    }) {
      const tool = tools.get(request.name);
      if (!tool) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Tool not found" }) }],
          isError: true,
        };
      }

      try {
        const result = await tool.handler(request.arguments);
        return result;
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    },

    registerTool(tool: {
      name: string;
      description: string;
      inputSchema: unknown;
      handler: (args: Record<string, unknown>) => Promise<{
        content: Array<{ type: string; text?: string }>;
        isError?: boolean;
      }>;
    }) {
      tools.set(tool.name, { ...tool, handler: tool.handler });
    },

    registerResource(resource: {
      uri: string;
      name: string;
      description: string;
      handler: (...args: unknown[]) => Promise<unknown>;
    }) {
      resources.set(resource.uri, { ...resource, handler: resource.handler });
    },
  };
}

/**
 * Test Utilities
 */

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a promise that rejects after timeout
 */
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ]);
}

/**
 * Assert that a condition is true (for use in tests)
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Compare two arrays for equality
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
}

/**
 * Compare two objects for deep equality
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
