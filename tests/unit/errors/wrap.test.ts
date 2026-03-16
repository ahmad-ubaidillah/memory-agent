/**
 * Unit Tests: Error Wrapping Utilities
 *
 * Tests for error wrapping, classification, and handling utilities.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import {
  assert,
  type ErrorWrapContext,
  createErrorFromCode,
  withErrorHandling,
  wrapError,
} from "../../../src/errors";
import {
  ConfigError,
  DatabaseError,
  EmbeddingError,
  ErrorCodes,
  FileError,
  LLMError,
  MemoryAgentError,
  ToolError,
  ValidationError,
  isMemoryAgentError,
} from "../../../src/errors/types";

describe("wrapError", () => {
  describe("MemoryAgentError instances", () => {
    test("should return same error if already MemoryAgentError", () => {
      const originalError = new DatabaseError("Connection failed");
      const wrapped = wrapError(originalError);

      expect(wrapped).toBe(originalError);
      expect(isMemoryAgentError(wrapped)).toBe(true);
    });

    test("should add context to existing MemoryAgentError", () => {
      const originalError = new DatabaseError("Query failed");
      const context: ErrorWrapContext = {
        operation: "memory_store",
        metadata: { query: "SELECT * FROM memories" },
      };

      const wrapped = wrapError(originalError, context);

      expect(wrapped).toBe(originalError);
      expect(wrapped.details).toMatchObject({
        query: "SELECT * FROM memories",
        operation: "memory_store",
      });
    });
  });

  describe("native Error instances", () => {
    test("should classify database errors", () => {
      const error = new Error("sqlite database connection failed");
      const wrapped = wrapError(error);

      expect(wrapped).toBeInstanceOf(DatabaseError);
      expect(wrapped.code).toBe("DATABASE_ERROR");
      expect(wrapped.message).toBe("sqlite database connection failed");
      expect(wrapped.recoverable).toBe(true);
    });

    test("should classify file errors", () => {
      const error = new Error("ENOENT: file not found");
      const wrapped = wrapError(error);

      expect(wrapped).toBeInstanceOf(FileError);
      expect(wrapped.code).toBe("FILE_ERROR");
      expect(wrapped.recoverable).toBe(true);
    });

    test("should classify validation errors", () => {
      const error = new Error("Invalid input: field is required");
      const wrapped = wrapError(error);

      expect(wrapped).toBeInstanceOf(ValidationError);
      expect(wrapped.code).toBe("VALIDATION_ERROR");
      expect(wrapped.recoverable).toBe(false);
    });

    test("should classify config errors", () => {
      const error = new Error("Missing required config: DATABASE_URL");
      const wrapped = wrapError(error);

      expect(wrapped).toBeInstanceOf(ConfigError);
      expect(wrapped.code).toBe("CONFIG_ERROR");
    });

    test("should default to ToolError for unknown errors", () => {
      const error = new Error("Something went wrong");
      const wrapped = wrapError(error);

      expect(wrapped).toBeInstanceOf(ToolError);
      expect(wrapped.code).toBe("TOOL_ERROR");
    });

    test("should preserve stack trace", () => {
      const error = new Error("Test error");
      const wrapped = wrapError(error);

      expect(wrapped.details?.stack).toBeDefined();
      expect(wrapped.details?.originalError).toBe("Error");
    });
  });

  describe("string errors", () => {
    test("should wrap string errors in ToolError", () => {
      const wrapped = wrapError("Something failed");

      expect(wrapped).toBeInstanceOf(ToolError);
      expect(wrapped.message).toBe("Something failed");
      expect(wrapped.details?.rawError).toBe("Something failed");
    });
  });

  describe("unknown error types", () => {
    test("should handle null", () => {
      const wrapped = wrapError(null);

      expect(wrapped).toBeInstanceOf(ToolError);
      expect(wrapped.message).toBe("An unexpected error occurred");
      expect(wrapped.details?.rawError).toBe("null");
      expect(wrapped.details?.errorType).toBe("object");
    });

    test("should handle undefined", () => {
      const wrapped = wrapError(undefined);

      expect(wrapped).toBeInstanceOf(ToolError);
      expect(wrapped.details?.rawError).toBe("undefined");
    });

    test("should handle numbers", () => {
      const wrapped = wrapError(42);

      expect(wrapped).toBeInstanceOf(ToolError);
      expect(wrapped.details?.rawError).toBe("42");
      expect(wrapped.details?.errorType).toBe("number");
    });

    test("should handle objects", () => {
      const wrapped = wrapError({ code: "CUSTOM", message: "Custom error" });

      expect(wrapped).toBeInstanceOf(ToolError);
      expect(wrapped.recoverable).toBe(false);
    });
  });

  describe("with context", () => {
    test("should include operation in details", () => {
      const error = new Error("Test error");
      const wrapped = wrapError(error, { operation: "memory_query" });

      expect(wrapped.details?.operation).toBe("memory_query");
    });

    test("should include tool in details", () => {
      const error = new Error("Test error");
      const wrapped = wrapError(error, { tool: "memory_store" });

      expect(wrapped.details?.tool).toBe("memory_store");
    });

    test("should include metadata in details", () => {
      const error = new Error("Test error");
      const wrapped = wrapError(error, {
        metadata: { userId: "user123", requestId: "req456" },
      });

      expect(wrapped.details?.userId).toBe("user123");
      expect(wrapped.details?.requestId).toBe("req456");
    });

    test("should include timestamp", () => {
      const error = new Error("Test error");
      const before = new Date().toISOString();
      const wrapped = wrapError(error, { timestamp: before });

      expect(wrapped.details?.timestamp).toBe(before);
    });
  });
});

describe("withErrorHandling", () => {
  describe("successful operations", () => {
    test("should return result on success", async () => {
      const handler = async (x: number) => x * 2;
      const wrapped = withErrorHandling("test_op", handler);

      const result = await wrapped(5);

      expect(result).toBe(10);
    });

    test("should pass through all arguments", async () => {
      const handler = async (a: number, b: string, c: boolean) => `${a}-${b}-${c}`;
      const wrapped = withErrorHandling("test_op", handler);

      const result = await wrapped(42, "test", true);

      expect(result).toBe("42-test-true");
    });
  });

  describe("error handling", () => {
    test("should wrap native errors", async () => {
      const handler = async () => {
        throw new Error("Operation failed");
      };
      const wrapped = withErrorHandling("test_op", handler);

      await expect(wrapped()).rejects.toThrow(MemoryAgentError);
    });

    test("should preserve MemoryAgentError instances", async () => {
      const originalError = new DatabaseError("Connection failed");
      const handler = async () => {
        throw originalError;
      };
      const wrapped = withErrorHandling("test_op", handler);

      try {
        await wrapped();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).details?.operation).toBe("test_op");
      }
    });

    test("should include operation in error context", async () => {
      const handler = async () => {
        throw new Error("Test error");
      };
      const wrapped = withErrorHandling("memory_store", handler);

      try {
        await wrapped();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(isMemoryAgentError(error)).toBe(true);
        expect((error as MemoryAgentError).details?.operation).toBe("memory_store");
      }
    });

    test("should include timestamp in error context", async () => {
      const handler = async () => {
        throw new Error("Test error");
      };
      const wrapped = withErrorHandling("test_op", handler);

      try {
        await wrapped();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(isMemoryAgentError(error)).toBe(true);
        expect((error as MemoryAgentError).details?.timestamp).toBeDefined();
      }
    });

    test("should handle async errors", async () => {
      const handler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async error");
      };
      const wrapped = withErrorHandling("test_op", handler);

      await expect(wrapped()).rejects.toThrow(MemoryAgentError);
    });
  });
});

describe("assert", () => {
  test("should not throw if condition is true", () => {
    expect(() => assert(true, "Should not throw")).not.toThrow();
  });

  test("should throw if condition is false", () => {
    expect(() => assert(false, "Should throw")).toThrow(ValidationError);
  });

  test("should throw with correct message", () => {
    try {
      assert(false, "Condition failed");
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toBe("Condition failed");
    }
  });

  test("should use custom error class", () => {
    expect(() => assert(false, "Database error", DatabaseError)).toThrow(DatabaseError);
  });

  test("should work with type guards", () => {
    const value: unknown = "test";

    assert(typeof value === "string", "Value must be a string");

    // TypeScript should now know value is a string
    expect(value.toUpperCase()).toBe("TEST");
  });

  test("should work with complex conditions", () => {
    const value: unknown = { id: 123, name: "test" };

    assert(typeof value === "object" && value !== null && "id" in value, "Value must have id");

    expect((value as { id: number }).id).toBe(123);
  });
});

describe("createErrorFromCode", () => {
  test("should create DatabaseError from DB_XXX codes", () => {
    const error = createErrorFromCode(ErrorCodes.DB_CONNECTION_FAILED, "Connection failed");

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toBe("Connection failed");
    expect(error.details?.code).toBe(ErrorCodes.DB_CONNECTION_FAILED);
  });

  test("should create EmbeddingError from EMB_XXX codes", () => {
    const error = createErrorFromCode(ErrorCodes.EMB_MODEL_LOAD_FAILED, "Model failed to load");

    expect(error).toBeInstanceOf(EmbeddingError);
    expect(error.message).toBe("Model failed to load");
  });

  test("should create LLMError from LLM_XXX codes", () => {
    const error = createErrorFromCode(ErrorCodes.LLM_TIMEOUT, "LLM request timed out");

    expect(error).toBeInstanceOf(LLMError);
  });

  test("should create ToolError from TOOL_XXX codes", () => {
    const error = createErrorFromCode(ErrorCodes.TOOL_INVALID_INPUT, "Invalid input");

    expect(error).toBeInstanceOf(ToolError);
  });

  test("should create FileError from FILE_XXX codes", () => {
    const error = createErrorFromCode(ErrorCodes.FILE_NOT_FOUND, "File not found");

    expect(error).toBeInstanceOf(FileError);
  });

  test("should create ConfigError from CFG_XXX codes", () => {
    const error = createErrorFromCode(ErrorCodes.CFG_MISSING_REQUIRED, "Missing config");

    expect(error).toBeInstanceOf(ConfigError);
  });

  test("should create ValidationError from unknown codes", () => {
    const error = createErrorFromCode("UNKNOWN_CODE", "Unknown error");

    expect(error).toBeInstanceOf(ValidationError);
  });

  test("should include additional details", () => {
    const error = createErrorFromCode(ErrorCodes.DB_QUERY_FAILED, "Query failed", {
      query: "SELECT * FROM users",
      duration: 150,
    });

    expect(error.details?.query).toBe("SELECT * FROM users");
    expect(error.details?.duration).toBe(150);
  });

  test("should handle all error code categories", () => {
    const codes = [
      { code: "DB_001", ExpectedClass: DatabaseError },
      { code: "EMB_001", ExpectedClass: EmbeddingError },
      { code: "LLM_001", ExpectedClass: LLMError },
      { code: "TOOL_001", ExpectedClass: ToolError },
      { code: "FILE_001", ExpectedClass: FileError },
      { code: "CFG_001", ExpectedClass: ConfigError },
      { code: "VAL_001", ExpectedClass: ValidationError },
      { code: "UNKNOWN", ExpectedClass: ValidationError },
    ];

    for (const { code, ExpectedClass } of codes) {
      const error = createErrorFromCode(code, "Test error");
      expect(error).toBeInstanceOf(ExpectedClass);
    }
  });
});

describe("error classification edge cases", () => {
  test("should classify error with 'sql' in name", () => {
    const error = new Error();
    error.name = "SqliteError";
    error.message = "constraint failed";

    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(DatabaseError);
  });

  test("should classify error with 'database' in message", () => {
    const error = new Error("database is locked");

    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(DatabaseError);
  });

  test("should classify error with 'query' in message", () => {
    const error = new Error("query execution failed");

    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(DatabaseError);
  });

  test("should classify error with 'permission' in message", () => {
    const error = new Error("permission denied");

    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(FileError);
  });

  test("should classify error with 'zod' in name", () => {
    const error = new Error();
    error.name = "ZodError";
    error.message = "validation failed";

    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(ValidationError);
  });

  test("should classify error with 'required' in message", () => {
    const error = new Error("field is required");

    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(ValidationError);
  });
});
