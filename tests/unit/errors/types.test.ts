/**
 * Unit Tests: Error Types
 *
 * Tests all error type definitions and utilities.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import {
  ConfigError,
  DatabaseError,
  EmbeddingError,
  type ErrorCode,
  ErrorCodes,
  FileError,
  LLMError,
  MemoryAgentError,
  ToolError,
  ValidationError,
  createErrorContext,
  isMemoryAgentError,
  isRecoverable,
} from "../../../src/errors/types";

describe("Error Types", () => {
  describe("MemoryAgentError (Base Class)", () => {
    test("should create error with required fields", () => {
      const error = new MemoryAgentError("TEST_001", "Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("MemoryAgentError");
      expect(error.code).toBe("TEST_001");
      expect(error.message).toBe("Test error message");
      expect(error.recoverable).toBe(true);
      expect(error.details).toBeUndefined();
    });

    test("should create error with all fields", () => {
      const details = { key: "value", count: 42 };
      const error = new MemoryAgentError("TEST_002", "Test error", details, false);

      expect(error.code).toBe("TEST_002");
      expect(error.message).toBe("Test error");
      expect(error.details).toEqual(details);
      expect(error.recoverable).toBe(false);
    });

    test("should serialize to JSON correctly", () => {
      const error = new MemoryAgentError("TEST_003", "Test error", { foo: "bar" }, true);

      const json = error.toJSON();

      expect(json).toHaveProperty("error", true);
      expect(json).toHaveProperty("code", "TEST_003");
      expect(json).toHaveProperty("message", "Test error");
      expect(json).toHaveProperty("recoverable", true);
      expect(json).toHaveProperty("details");
      // biome-ignore lint/suspicious/noExplicitAny: Test needs to access details property not in type
      expect((json as any).details).toEqual({ foo: "bar" });
    });

    test("should not include details in JSON when undefined", () => {
      const error = new MemoryAgentError("TEST_004", "No details");

      const json = error.toJSON();

      expect(json).not.toHaveProperty("details");
    });

    test("should include stack trace in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new MemoryAgentError("TEST_005", "Dev error");
      const json = error.toJSON();

      expect(json).toHaveProperty("stack");
      // biome-ignore lint/suspicious/noExplicitAny: Test needs to access stack property not in type
      expect((json as any).stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    test("should include stack trace when DEBUG is set", () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = "true";

      const error = new MemoryAgentError("TEST_006", "Debug error");
      const json = error.toJSON();

      expect(json).toHaveProperty("stack");

      process.env.DEBUG = originalDebug;
    });

    test("should not include stack trace in production", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalDebug = process.env.DEBUG;
      process.env.NODE_ENV = "production";
      process.env.DEBUG = undefined;

      const error = new MemoryAgentError("TEST_007", "Prod error");
      const json = error.toJSON();

      expect(json).not.toHaveProperty("stack");

      process.env.NODE_ENV = originalEnv;
      process.env.DEBUG = originalDebug;
    });

    test("should convert to string correctly", () => {
      const error = new MemoryAgentError("TEST_008", "String test", {
        extra: "info",
      });

      const str = error.toString();

      expect(str).toContain("MemoryAgentError");
      expect(str).toContain("[TEST_008]");
      expect(str).toContain("String test");
      expect(str).toContain("extra");
    });

    test("should have proper stack trace", () => {
      const error = new MemoryAgentError("TEST_009", "Stack test");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("MemoryAgentError");
    });
  });

  describe("DatabaseError", () => {
    test("should create database error with default recoverable=true", () => {
      const error = new DatabaseError("Connection failed");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.name).toBe("DatabaseError");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.message).toBe("Connection failed");
      expect(error.recoverable).toBe(true);
    });

    test("should create database error with details", () => {
      const details = { host: "localhost", port: 5432 };
      const error = new DatabaseError("Query timeout", details, false);

      expect(error.details).toEqual(details);
      expect(error.recoverable).toBe(false);
    });

    test("should serialize correctly", () => {
      const error = new DatabaseError("DB error", { query: "SELECT *" });

      const json = error.toJSON();

      expect(json).toHaveProperty("code", "DATABASE_ERROR");
      // biome-ignore lint/suspicious/noExplicitAny: Test needs to access details property not in type
      expect((json as any).details).toEqual({ query: "SELECT *" });
    });
  });

  describe("EmbeddingError", () => {
    test("should create embedding error with default recoverable=true", () => {
      const error = new EmbeddingError("Model load failed");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("EmbeddingError");
      expect(error.code).toBe("EMBEDDING_ERROR");
      expect(error.recoverable).toBe(true);
    });

    test("should create embedding error with model details", () => {
      const error = new EmbeddingError(
        "Vector generation failed",
        { model: "all-MiniLM-L6-v2", dimension: 384 },
        true
      );

      expect(error.details).toEqual({
        model: "all-MiniLM-L6-v2",
        dimension: 384,
      });
      expect(error.recoverable).toBe(true);
    });
  });

  describe("LLMError", () => {
    test("should create LLM error with default recoverable=true", () => {
      const error = new LLMError("Model not loaded");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("LLMError");
      expect(error.code).toBe("LLM_ERROR");
      expect(error.recoverable).toBe(true);
    });

    test("should create LLM error with context", () => {
      const error = new LLMError(
        "TOON distillation failed",
        { content: "test content", reason: "timeout" },
        true
      );

      expect(error.details).toHaveProperty("content", "test content");
      expect(error.details).toHaveProperty("reason", "timeout");
    });
  });

  describe("ToolError", () => {
    test("should create tool error with default recoverable=false", () => {
      const error = new ToolError("Invalid input");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("ToolError");
      expect(error.code).toBe("TOOL_ERROR");
      expect(error.recoverable).toBe(false);
    });

    test("should allow overriding recoverable flag", () => {
      const error = new ToolError("Temporary failure", {}, true);

      expect(error.recoverable).toBe(true);
    });

    test("should include tool name in details", () => {
      const error = new ToolError("Tool failed", {
        tool: "memory_store",
        input: { content: "" },
      });

      expect(error.details).toHaveProperty("tool", "memory_store");
      expect(error.details).toHaveProperty("input");
    });
  });

  describe("FileError", () => {
    test("should create file error with default recoverable=true", () => {
      const error = new FileError("File not found");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("FileError");
      expect(error.code).toBe("FILE_ERROR");
      expect(error.recoverable).toBe(true);
    });

    test("should create file error with path details", () => {
      const error = new FileError("Permission denied", {
        path: "/etc/passwd",
        operation: "read",
      });

      expect(error.details).toHaveProperty("path", "/etc/passwd");
      expect(error.details).toHaveProperty("operation", "read");
    });
  });

  describe("ConfigError", () => {
    test("should create config error with default recoverable=false", () => {
      const error = new ConfigError("Invalid configuration");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("ConfigError");
      expect(error.code).toBe("CONFIG_ERROR");
      expect(error.recoverable).toBe(false);
    });

    test("should create config error with field details", () => {
      const error = new ConfigError("Missing required field", {
        field: "DATABASE_URL",
        env_var: "DB_HOST",
      });

      expect(error.details).toHaveProperty("field", "DATABASE_URL");
      expect(error.details).toHaveProperty("env_var", "DB_HOST");
    });
  });

  describe("ValidationError", () => {
    test("should create validation error with recoverable=false", () => {
      const error = new ValidationError("Invalid input");

      expect(error).toBeInstanceOf(MemoryAgentError);
      expect(error.name).toBe("ValidationError");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.recoverable).toBe(false);
    });

    test("should create validation error with field details", () => {
      const error = new ValidationError("Content cannot be empty", {
        field: "content",
        value: "",
        constraint: "minLength:1",
      });

      expect(error.details).toHaveProperty("field", "content");
      expect(error.details).toHaveProperty("value", "");
      expect(error.details).toHaveProperty("constraint", "minLength:1");
    });
  });

  describe("ErrorCodes", () => {
    test("should have database error codes", () => {
      expect(ErrorCodes.DB_CONNECTION_FAILED).toBe("DB_001");
      expect(ErrorCodes.DB_QUERY_FAILED).toBe("DB_002");
      expect(ErrorCodes.DB_CORRUPTED).toBe("DB_003");
      expect(ErrorCodes.DB_TRANSACTION_FAILED).toBe("DB_004");
      expect(ErrorCodes.DB_MIGRATION_FAILED).toBe("DB_005");
    });

    test("should have embedding error codes", () => {
      expect(ErrorCodes.EMB_MODEL_LOAD_FAILED).toBe("EMB_001");
      expect(ErrorCodes.EMB_GENERATION_FAILED).toBe("EMB_002");
      expect(ErrorCodes.EMB_DIMENSION_MISMATCH).toBe("EMB_003");
    });

    test("should have LLM error codes", () => {
      expect(ErrorCodes.LLM_MODEL_LOAD_FAILED).toBe("LLM_001");
      expect(ErrorCodes.LLM_DISTILLATION_FAILED).toBe("LLM_002");
      expect(ErrorCodes.LLM_TIMEOUT).toBe("LLM_003");
      expect(ErrorCodes.LLM_CONTEXT_TOO_LARGE).toBe("LLM_004");
    });

    test("should have tool error codes", () => {
      expect(ErrorCodes.TOOL_NOT_FOUND).toBe("TOOL_001");
      expect(ErrorCodes.TOOL_INVALID_INPUT).toBe("TOOL_002");
      expect(ErrorCodes.TOOL_TIMEOUT).toBe("TOOL_003");
      expect(ErrorCodes.TOOL_EXECUTION_FAILED).toBe("TOOL_004");
    });

    test("should have file error codes", () => {
      expect(ErrorCodes.FILE_NOT_FOUND).toBe("FILE_001");
      expect(ErrorCodes.FILE_PERMISSION_DENIED).toBe("FILE_002");
      expect(ErrorCodes.FILE_READ_ERROR).toBe("FILE_003");
      expect(ErrorCodes.FILE_WRITE_ERROR).toBe("FILE_004");
      expect(ErrorCodes.FILE_TOO_LARGE).toBe("FILE_005");
    });

    test("should have config error codes", () => {
      expect(ErrorCodes.CFG_INVALID).toBe("CFG_001");
      expect(ErrorCodes.CFG_MISSING_REQUIRED).toBe("CFG_002");
      expect(ErrorCodes.CFG_ENV_INVALID).toBe("CFG_003");
    });

    test("should have validation error codes", () => {
      expect(ErrorCodes.VAL_INVALID_INPUT).toBe("VAL_001");
      expect(ErrorCodes.VAL_MISSING_REQUIRED).toBe("VAL_002");
      expect(ErrorCodes.VAL_OUT_OF_RANGE).toBe("VAL_003");
    });

    test("should be typed as const", () => {
      const code: ErrorCode = ErrorCodes.DB_CONNECTION_FAILED;
      expect(code).toBe("DB_001");
    });
  });

  describe("Helper Functions", () => {
    describe("isMemoryAgentError", () => {
      test("should return true for MemoryAgentError", () => {
        const error = new MemoryAgentError("TEST", "Test");
        expect(isMemoryAgentError(error)).toBe(true);
      });

      test("should return true for subclass errors", () => {
        const dbError = new DatabaseError("DB error");
        const toolError = new ToolError("Tool error");
        const validationError = new ValidationError("Invalid");

        expect(isMemoryAgentError(dbError)).toBe(true);
        expect(isMemoryAgentError(toolError)).toBe(true);
        expect(isMemoryAgentError(validationError)).toBe(true);
      });

      test("should return false for native Error", () => {
        const error = new Error("Native error");
        expect(isMemoryAgentError(error)).toBe(false);
      });

      test("should return false for non-error values", () => {
        expect(isMemoryAgentError(null)).toBe(false);
        expect(isMemoryAgentError(undefined)).toBe(false);
        expect(isMemoryAgentError("error")).toBe(false);
        expect(isMemoryAgentError(123)).toBe(false);
        expect(isMemoryAgentError({})).toBe(false);
      });
    });

    describe("isRecoverable", () => {
      test("should return true for recoverable errors", () => {
        const dbError = new DatabaseError("Connection failed", {}, true);
        const embError = new EmbeddingError("Model failed", {}, true);

        expect(isRecoverable(dbError)).toBe(true);
        expect(isRecoverable(embError)).toBe(true);
      });

      test("should return false for non-recoverable errors", () => {
        const toolError = new ToolError("Invalid input", {}, false);
        const validationError = new ValidationError("Invalid");

        expect(isRecoverable(toolError)).toBe(false);
        expect(isRecoverable(validationError)).toBe(false);
      });

      test("should return false for non-MemoryAgentError", () => {
        const nativeError = new Error("Native error");
        expect(isRecoverable(nativeError)).toBe(false);
        expect(isRecoverable(null)).toBe(false);
        expect(isRecoverable("error")).toBe(false);
      });
    });

    describe("createErrorContext", () => {
      test("should create context with required fields", () => {
        const context = createErrorContext("DatabaseService", "query");

        expect(context).toHaveProperty("component", "DatabaseService");
        expect(context).toHaveProperty("operation", "query");
        expect(context).toHaveProperty("timestamp");
        expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      test("should create context with metadata", () => {
        const metadata = { query: "SELECT *", duration: 150 };
        const context = createErrorContext("QueryEngine", "execute", metadata);

        expect(context).toHaveProperty("metadata");
        expect(context.metadata).toEqual(metadata);
      });

      test("should generate ISO timestamp", () => {
        const before = new Date().toISOString();
        const context = createErrorContext("Test", "test");
        const after = new Date().toISOString();

        expect(context.timestamp >= before).toBe(true);
        expect(context.timestamp <= after).toBe(true);
      });

      test("should handle empty metadata", () => {
        const context = createErrorContext("Test", "test", {});

        expect(context).toHaveProperty("metadata");
        expect(context.metadata).toEqual({});
      });

      test("should handle undefined metadata", () => {
        const context = createErrorContext("Test", "test", undefined);

        expect(context.metadata).toBeUndefined();
      });
    });
  });

  describe("Error Inheritance and Type Checking", () => {
    test("should maintain proper prototype chain", () => {
      const dbError = new DatabaseError("Test");

      expect(dbError instanceof DatabaseError).toBe(true);
      expect(dbError instanceof MemoryAgentError).toBe(true);
      expect(dbError instanceof Error).toBe(true);
    });

    test("should have correct name property for each error type", () => {
      expect(new DatabaseError("test").name).toBe("DatabaseError");
      expect(new EmbeddingError("test").name).toBe("EmbeddingError");
      expect(new LLMError("test").name).toBe("LLMError");
      expect(new ToolError("test").name).toBe("ToolError");
      expect(new FileError("test").name).toBe("FileError");
      expect(new ConfigError("test").name).toBe("ConfigError");
      expect(new ValidationError("test").name).toBe("ValidationError");
    });

    test("should be catchable as Error", () => {
      let caught = false;

      try {
        throw new DatabaseError("Test error");
      } catch (error) {
        if (error instanceof Error) {
          caught = true;
          expect(error.message).toBe("Test error");
        }
      }

      expect(caught).toBe(true);
    });

    test("should be catchable as MemoryAgentError", () => {
      let caught = false;

      try {
        throw new ToolError("Test error");
      } catch (error) {
        if (isMemoryAgentError(error)) {
          caught = true;
          expect(error.code).toBe("TOOL_ERROR");
        }
      }

      expect(caught).toBe(true);
    });
  });

  describe("Error Usage Patterns", () => {
    test("should support throwing and catching specific error types", () => {
      function riskyOperation(): void {
        throw new DatabaseError("Connection timeout", {
          host: "localhost",
          port: 5432,
        });
      }

      expect(riskyOperation).toThrow(DatabaseError);
      expect(riskyOperation).toThrow(MemoryAgentError);
      expect(riskyOperation).toThrow("Connection timeout");
    });

    test("should support error differentiation in catch block", () => {
      function operation(type: string): void {
        if (type === "db") {
          throw new DatabaseError("DB error");
        }
        if (type === "validation") {
          throw new ValidationError("Invalid input");
        }
        throw new Error("Unknown error");
      }

      // Test database error
      try {
        operation("db");
      } catch (error) {
        expect(isMemoryAgentError(error)).toBe(true);
        if (isMemoryAgentError(error)) {
          expect(error.code).toBe("DATABASE_ERROR");
          expect(isRecoverable(error)).toBe(true);
        }
      }

      // Test validation error
      try {
        operation("validation");
      } catch (error) {
        expect(isMemoryAgentError(error)).toBe(true);
        if (isMemoryAgentError(error)) {
          expect(error.code).toBe("VALIDATION_ERROR");
          expect(isRecoverable(error)).toBe(false);
        }
      }
    });

    test("should support error chaining context", () => {
      const error = new DatabaseError("Query failed", {
        sql: "SELECT * FROM users",
        code: "SQLITE_ERROR",
      });

      const json = error.toJSON();

      expect(json).toHaveProperty("details");
      // biome-ignore lint/suspicious/noExplicitAny: Test needs to access details properties not in type
      expect((json as any).details.sql).toBe("SELECT * FROM users");
      // biome-ignore lint/suspicious/noExplicitAny: Test needs to access details properties not in type
      expect((json as any).details.code).toBe("SQLITE_ERROR");
    });
  });
});
