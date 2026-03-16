/**
 * Error Handling Module
 *
 * Central export for all error handling utilities and types.
 */

// Error types
export {
  MemoryAgentError,
  DatabaseError,
  EmbeddingError,
  LLMError,
  ToolError,
  FileError,
  ConfigError,
  ValidationError,
  ErrorCodes,
  type ErrorCode,
  type AnyMemoryError,
  type ErrorContext,
  isMemoryAgentError,
  isRecoverable,
  createErrorContext,
} from "./types";

// Error wrapping utilities
export {
  wrapError,
  withErrorHandling,
  assert,
  createErrorFromCode,
  type ErrorWrapContext,
} from "./wrap";
