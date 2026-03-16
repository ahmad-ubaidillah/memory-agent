/**
 * Error types for Memory-Agent MCP Server
 *
 * This module defines a comprehensive error handling system with:
 * - Base error class with serialization support
 * - Specific error types for different components
 * - Error codes for programmatic handling
 * - Recoverable vs non-recoverable distinction
 */

/**
 * Base error class for all Memory-Agent errors
 * Provides structured error information and JSON serialization
 */
export class MemoryAgentError extends Error {
  constructor(
    public readonly code: string,
    override readonly message: string,
    public readonly details?: Record<string, unknown>,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = "MemoryAgentError";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, MemoryAgentError);
    }
  }

  /**
   * Serialize error to JSON for MCP protocol transmission
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      error: true,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
    };

    if (this.details) {
      result.details = this.details;
    }

    // Include stack trace in development mode
    // Use Bun.env for Bun runtime compatibility
    const nodeEnv = typeof Bun !== "undefined" ? Bun.env.NODE_ENV : undefined;
    const debug = typeof Bun !== "undefined" ? Bun.env.DEBUG : undefined;
    if (nodeEnv === "development" || debug) {
      result.stack = this.stack;
    }

    return result;
  }

  /**
   * Convert to string for logging
   */
  override toString(): string {
    let str = `${this.name} [${this.code}]: ${this.message}`;
    if (this.details) {
      str += ` | Details: ${JSON.stringify(this.details)}`;
    }
    return str;
  }
}

/**
 * Database-related errors
 * Usually recoverable (connection issues, query failures)
 */
export class DatabaseError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>, recoverable = true) {
    super("DATABASE_ERROR", message, details, recoverable);
    this.name = "DatabaseError";
  }
}

/**
 * Embedding generation errors
 * Usually recoverable (can fall back to Lite Mode)
 */
export class EmbeddingError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>, recoverable = true) {
    super("EMBEDDING_ERROR", message, details, recoverable);
    this.name = "EmbeddingError";
  }
}

/**
 * LLM-related errors
 * Usually recoverable (can fall back to Lite Mode or heuristics)
 */
export class LLMError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>, recoverable = true) {
    super("LLM_ERROR", message, details, recoverable);
    this.name = "LLMError";
  }
}

/**
 * Tool execution errors
 * Usually non-recoverable (invalid input, missing parameters)
 */
export class ToolError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>, recoverable = false) {
    super("TOOL_ERROR", message, details, recoverable);
    this.name = "ToolError";
  }
}

/**
 * File operation errors
 * Depends on the specific error (file not found vs permission denied)
 */
export class FileError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>, recoverable = true) {
    super("FILE_ERROR", message, details, recoverable);
    this.name = "FileError";
  }
}

/**
 * Configuration errors
 * Usually non-recoverable (invalid configuration)
 */
export class ConfigError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>, recoverable = false) {
    super("CONFIG_ERROR", message, details, recoverable);
    this.name = "ConfigError";
  }
}

/**
 * Validation errors
 * Non-recoverable (invalid input)
 */
export class ValidationError extends MemoryAgentError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, details, false);
    this.name = "ValidationError";
  }
}

/**
 * Error code registry for consistent error identification
 */
export const ErrorCodes = {
  // Database errors (DB_XXX)
  DB_CONNECTION_FAILED: "DB_001",
  DB_QUERY_FAILED: "DB_002",
  DB_CORRUPTED: "DB_003",
  DB_TRANSACTION_FAILED: "DB_004",
  DB_MIGRATION_FAILED: "DB_005",

  // Embedding errors (EMB_XXX)
  EMB_MODEL_LOAD_FAILED: "EMB_001",
  EMB_GENERATION_FAILED: "EMB_002",
  EMB_DIMENSION_MISMATCH: "EMB_003",

  // LLM errors (LLM_XXX)
  LLM_MODEL_LOAD_FAILED: "LLM_001",
  LLM_DISTILLATION_FAILED: "LLM_002",
  LLM_TIMEOUT: "LLM_003",
  LLM_CONTEXT_TOO_LARGE: "LLM_004",

  // Tool errors (TOOL_XXX)
  TOOL_NOT_FOUND: "TOOL_001",
  TOOL_INVALID_INPUT: "TOOL_002",
  TOOL_TIMEOUT: "TOOL_003",
  TOOL_EXECUTION_FAILED: "TOOL_004",

  // File errors (FILE_XXX)
  FILE_NOT_FOUND: "FILE_001",
  FILE_PERMISSION_DENIED: "FILE_002",
  FILE_READ_ERROR: "FILE_003",
  FILE_WRITE_ERROR: "FILE_004",
  FILE_TOO_LARGE: "FILE_005",

  // Config errors (CFG_XXX)
  CFG_INVALID: "CFG_001",
  CFG_MISSING_REQUIRED: "CFG_002",
  CFG_ENV_INVALID: "CFG_003",

  // Validation errors (VAL_XXX)
  VAL_INVALID_INPUT: "VAL_001",
  VAL_MISSING_REQUIRED: "VAL_002",
  VAL_OUT_OF_RANGE: "VAL_003",
} as const;

/**
 * Error code type
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Union type of all error types
 */
export type AnyMemoryError =
  | DatabaseError
  | EmbeddingError
  | LLMError
  | ToolError
  | FileError
  | ConfigError
  | ValidationError;

/**
 * Helper function to check if an error is a MemoryAgentError
 */
export function isMemoryAgentError(error: unknown): error is MemoryAgentError {
  return error instanceof MemoryAgentError;
}

/**
 * Helper function to check if an error is recoverable
 */
export function isRecoverable(error: unknown): boolean {
  if (isMemoryAgentError(error)) {
    return error.recoverable;
  }
  // Unknown errors are considered non-recoverable
  return false;
}

/**
 * Error context for additional debugging information
 */
export interface ErrorContext {
  /** Component where the error occurred */
  component: string;
  /** Operation that failed */
  operation: string;
  /** Timestamp when the error occurred */
  timestamp: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Request ID if applicable */
  requestId?: string;
  /** User ID if applicable */
  userId?: string;
}

/**
 * Create error context
 */
export function createErrorContext(
  component: string,
  operation: string,
  metadata?: Record<string, unknown>
): ErrorContext {
  const context: ErrorContext = {
    component,
    operation,
    timestamp: new Date().toISOString(),
  };

  // Only add optional properties if they have values (for exactOptionalPropertyTypes)
  if (metadata !== undefined) {
    context.metadata = metadata;
  }

  return context;
}
