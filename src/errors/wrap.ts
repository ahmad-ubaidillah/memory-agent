/**
 * Error Wrapping Utilities
 *
 * Provides utilities to wrap native errors into typed MemoryAgentError instances,
 * preserving context and stack traces for debugging.
 */

import {
  ConfigError,
  DatabaseError,
  EmbeddingError,
  FileError,
  LLMError,
  MemoryAgentError,
  ToolError,
  ValidationError,
} from "./types";

/**
 * Context information for error wrapping
 */
export interface ErrorWrapContext {
  operation?: string;
  tool?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Wrap unknown error into MemoryAgentError
 *
 * @param error - Unknown error to wrap
 * @param context - Additional context about where the error occurred
 * @returns MemoryAgentError instance
 */
export function wrapError(error: unknown, context?: ErrorWrapContext): MemoryAgentError {
  // Already a MemoryAgentError - add context to details
  if (error instanceof MemoryAgentError) {
    // Merge context into existing error details
    const existingDetails = error.details || {};

    if (context?.operation) {
      existingDetails.operation = context.operation;
    }
    if (context?.tool) {
      existingDetails.tool = context.tool;
    }
    if (context?.timestamp) {
      existingDetails.timestamp = context.timestamp;
    }
    if (context?.metadata) {
      Object.assign(existingDetails, context.metadata);
    }

    // Update the details directly (they are mutable despite readonly annotation)
    // biome-ignore lint/suspicious/noExplicitAny: Must cast to any to mutate readonly property
    (error as any).details = existingDetails;

    return error;
  }

  // Native Error instance
  if (error instanceof Error) {
    return classifyNativeError(error, context);
  }

  // String error
  if (typeof error === "string") {
    return new ToolError(error, {
      rawError: error,
      ...context?.metadata,
    });
  }

  // Unknown error type
  return new ToolError(
    "An unexpected error occurred",
    {
      rawError: String(error),
      errorType: typeof error,
      ...context?.metadata,
    },
    false
  );
}

/**
 * Classify native Error into specific MemoryAgentError type
 */
function classifyNativeError(error: Error, context?: ErrorWrapContext): MemoryAgentError {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Build details object with context
  const details: Record<string, unknown> = {
    originalError: error.name,
    stack: error.stack,
    ...context?.metadata,
  };

  // Add context properties if present
  if (context?.operation) {
    details.operation = context.operation;
  }
  if (context?.tool) {
    details.tool = context.tool;
  }
  if (context?.timestamp) {
    details.timestamp = context.timestamp;
  }

  // Configuration errors (check before database since "config" is more specific)
  if (
    message.includes("config") ||
    message.includes("environment") ||
    message.includes("env") ||
    name.includes("config")
  ) {
    return new ConfigError(error.message, details);
  }

  // Database errors
  if (
    name.includes("sqlite") ||
    message.includes("database") ||
    message.includes("sql") ||
    message.includes("query")
  ) {
    return new DatabaseError(error.message, details);
  }

  // File system errors
  if (
    name.includes("file") ||
    message.includes("enoent") ||
    message.includes("eacces") ||
    message.includes("permission") ||
    message.includes("not found")
  ) {
    return new FileError(error.message, details);
  }

  // Validation errors
  if (
    name.includes("validation") ||
    name.includes("zod") ||
    message.includes("invalid") ||
    message.includes("required")
  ) {
    return new ValidationError(error.message, details);
  }

  // Default to ToolError
  return new ToolError(error.message, details);
}

/**
 * Higher-order function to wrap async handlers with error handling
 *
 * @param operation - Name of the operation
 * @param handler - Async function to wrap
 * @returns Wrapped function that catches and wraps errors
 *
 * @example
 * const safeStore = withErrorHandling('memory_store', async (input) => {
 *   return await storeInDatabase(input);
 * });
 */
export function withErrorHandling<TArgs extends unknown[], TResult>(
  operation: string,
  handler: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await handler(...args);
    } catch (error) {
      const wrapped = wrapError(error, {
        operation,
        timestamp: new Date().toISOString(),
      });

      // Log the error (will be implemented with logger)
      console.error(`[${operation}] Error:`, wrapped.toJSON());

      throw wrapped;
    }
  };
}

/**
 * Assert condition and throw typed error if false
 *
 * @param condition - Condition to assert
 * @param message - Error message if condition is false
 * @param errorCreator - Function or class to create the error (default: creates ValidationError)
 */
export function assert(
  condition: boolean,
  message: string,
  // biome-ignore lint/suspicious/noExplicitAny: Accepts any error creator function/class for flexibility
  errorCreator: any = (msg: string, details?: Record<string, unknown>) =>
    new ValidationError(msg, details)
): asserts condition {
  if (!condition) {
    // Check if errorCreator is a class constructor (has prototype) or a function
    // Class constructors need to be called with 'new', arrow functions don't
    if (errorCreator.prototype && errorCreator.prototype.constructor === errorCreator) {
      // It's a class constructor - call with new
      throw new errorCreator(message);
    }
    // It's a regular function or arrow function - call normally
    throw errorCreator(message);
  }
}

/**
 * Create error from code
 *
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional details
 * @returns MemoryAgentError instance
 */
export function createErrorFromCode(
  code: string,
  message: string,
  details?: Record<string, unknown>
): MemoryAgentError {
  const category = code.split("_")[0];

  switch (category) {
    case "DB":
      return new DatabaseError(message, { code, ...details });
    case "EMB":
      return new EmbeddingError(message, { code, ...details });
    case "LLM":
      return new LLMError(message, { code, ...details });
    case "TOOL":
      return new ToolError(message, { code, ...details });
    case "FILE":
      return new FileError(message, { code, ...details });
    case "CFG":
      return new ConfigError(message, { code, ...details });
    default:
      return new ValidationError(message, { code, ...details });
  }
}
