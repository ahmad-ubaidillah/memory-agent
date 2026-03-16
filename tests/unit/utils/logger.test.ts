/**
 * Unit Tests for Logger
 *
 * Tests the structured logging system including log levels,
 * formatting, context handling, and child loggers.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  type LogLevel,
  type LoggerConfig,
  createLogger,
  getLogger,
  resetLogger,
} from "../../../src/utils/logger";

describe("Logger", () => {
  let capturedLogs: string[] = [];

  beforeEach(() => {
    // Reset logger instance before each test
    resetLogger();
    capturedLogs = [];
  });

  afterEach(() => {
    // Restore console methods - actually we use spies so no need to restore
  });

  describe("Logger Creation", () => {
    test("should create logger with default config", () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe("INFO");
    });

    test("should create logger with custom config", () => {
      const logger = createLogger({ level: "DEBUG" });
      expect(logger.getLevel()).toBe("DEBUG");
    });

    test("should return singleton instance with getLogger", () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    test("should create new instance with createLogger", () => {
      const logger1 = createLogger();
      const logger2 = createLogger();
      expect(logger1).not.toBe(logger2);
    });
  });

  describe("Log Levels", () => {
    test("should log ERROR messages", () => {
      const logger = createLogger({ level: "ERROR", colorize: false });
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.error("Test error message");

      console.error = originalError;
      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("ERROR:");
      expect(capturedLogs[0]).toContain("Test error message");
    });

    test("should log WARN messages", () => {
      const logger = createLogger({ level: "WARN", colorize: false });
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.warn("Test warning message");

      console.warn = originalWarn;
      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("WARN:");
      expect(capturedLogs[0]).toContain("Test warning message");
    });

    test("should log INFO messages", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test info message");

      console.log = originalLog;
      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("INFO:");
      expect(capturedLogs[0]).toContain("Test info message");
    });

    test("should log DEBUG messages when level is DEBUG", () => {
      const logger = createLogger({ level: "DEBUG", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.debug("Test debug message");

      console.log = originalLog;
      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("DEBUG:");
      expect(capturedLogs[0]).toContain("Test debug message");
    });

    test("should NOT log DEBUG messages when level is INFO", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.debug("Test debug message");

      console.log = originalLog;
      expect(capturedLogs.length).toBe(0);
    });

    test("should NOT log INFO messages when level is WARN", () => {
      const logger = createLogger({ level: "WARN", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test info message");

      console.log = originalLog;
      expect(capturedLogs.length).toBe(0);
    });

    test("should respect log level priority: ERROR < WARN < INFO < DEBUG", () => {
      const logger = createLogger({ level: "WARN", colorize: false });

      const errors: string[] = [];
      const warns: string[] = [];
      const logs: string[] = [];

      const originalError = console.error;
      const originalWarn = console.warn;
      const originalLog = console.log;

      console.error = (...args: unknown[]) => errors.push(args.map(String).join(" "));
      console.warn = (...args: unknown[]) => warns.push(args.map(String).join(" "));
      console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));

      logger.error("error");
      logger.warn("warn");
      logger.info("info");
      logger.debug("debug");

      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;

      expect(errors.length).toBe(1);
      expect(warns.length).toBe(1);
      expect(logs.length).toBe(0); // INFO and DEBUG should be filtered
    });
  });

  describe("Context Handling", () => {
    test("should include context in log message", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message", { userId: "123", action: "test" });

      console.log = originalLog;
      expect(capturedLogs[0]).toContain('"userId":"123"');
      expect(capturedLogs[0]).toContain('"action":"test"');
    });

    test("should handle empty context", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message", {});

      console.log = originalLog;
      expect(capturedLogs[0]).toContain("INFO:");
      expect(capturedLogs[0]).toContain("Test message");
    });

    test("should handle undefined context", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message");

      console.log = originalLog;
      expect(capturedLogs.length).toBe(1);
    });
  });

  describe("Error Handling", () => {
    test("should format error with code and message", () => {
      const logger = createLogger({ level: "ERROR", colorize: false });
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.error(
        "Operation failed",
        { operation: "test" },
        {
          code: "TEST_001",
          message: "Test error occurred",
        }
      );

      console.error = originalError;
      expect(capturedLogs[0]).toContain("Error Code: TEST_001");
      expect(capturedLogs[0]).toContain("Error Message: Test error occurred");
    });

    test("should include stack trace in DEBUG mode", () => {
      const logger = createLogger({ level: "DEBUG", colorize: false });
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.error(
        "Test error",
        {},
        {
          code: "TEST_001",
          stack: "Error stack trace here",
        }
      );

      console.error = originalError;
      expect(capturedLogs[0]).toContain("Stack Trace:");
      expect(capturedLogs[0]).toContain("Error stack trace here");
    });

    test("should NOT include stack trace in INFO mode", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.error(
        "Test error",
        {},
        {
          code: "TEST_001",
          stack: "Error stack trace here",
        }
      );

      console.error = originalError;
      expect(capturedLogs[0]).not.toContain("Stack Trace:");
    });
  });

  describe("Performance Metrics", () => {
    test("should log metric with duration", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.metric("Database query", 45.5);

      console.log = originalLog;
      expect(capturedLogs[0]).toContain("Database query");
      expect(capturedLogs[0]).toContain("45.50ms");
    });

    test("should log metric with context", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.metric("API call", 123.45, { endpoint: "/users" });

      console.log = originalLog;
      expect(capturedLogs[0]).toContain("API call");
      expect(capturedLogs[0]).toContain("123.45ms");
      expect(capturedLogs[0]).toContain('"endpoint":"/users"');
    });
  });

  describe("Time Tracking", () => {
    test("should time async function execution", async () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      const result = await logger.time("Test operation", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      });

      console.log = originalLog;
      expect(result).toBe("success");
      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("Test operation");
      expect(capturedLogs[0]).toContain("ms");
    });

    test("should time failed operation", async () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      try {
        await logger.time("Failing operation", async () => {
          throw new Error("Test error");
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe("Test error");
        expect(capturedLogs.length).toBe(1);
        expect(capturedLogs[0]).toContain("Failing operation (failed)");
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe("Child Logger", () => {
    test("should create child logger with default context", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      const childLogger = logger.child({ service: "memory-store", version: "1.0" });
      childLogger.info("Test message");

      console.log = originalLog;
      expect(capturedLogs[0]).toContain('"service":"memory-store"');
      expect(capturedLogs[0]).toContain('"version":"1.0"');
    });

    test("should merge child context with additional context", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      const childLogger = logger.child({ service: "memory-store" });
      childLogger.info("Test message", { operation: "query" });

      console.log = originalLog;
      expect(capturedLogs[0]).toContain('"service":"memory-store"');
      expect(capturedLogs[0]).toContain('"operation":"query"');
    });

    test("should support child logger for all log levels", () => {
      const logger = createLogger({ level: "DEBUG", colorize: false });
      const childLogger = logger.child({ component: "test" });

      const errors: string[] = [];
      const warns: string[] = [];
      const logs: string[] = [];

      const originalError = console.error;
      const originalWarn = console.warn;
      const originalLog = console.log;

      console.error = (...args: unknown[]) => errors.push(args.map(String).join(" "));
      console.warn = (...args: unknown[]) => warns.push(args.map(String).join(" "));
      console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));

      childLogger.error("error");
      childLogger.warn("warn");
      childLogger.info("info");
      childLogger.debug("debug");

      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;

      expect(errors.length).toBe(1);
      expect(warns.length).toBe(1);
      expect(logs.length).toBe(2); // info and debug
    });

    test("should support child logger metrics", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      const childLogger = logger.child({ service: "api" });
      childLogger.metric("Request time", 50.5);

      console.log = originalLog;
      expect(capturedLogs[0]).toContain('"service":"api"');
      expect(capturedLogs[0]).toContain("50.50ms");
    });
  });

  describe("Runtime Configuration", () => {
    test("should change log level at runtime", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      // INFO level - should log
      logger.info("First message");
      expect(capturedLogs.length).toBe(1);

      // Change to WARN - should not log INFO
      logger.setLevel("WARN");
      logger.info("Second message");
      expect(capturedLogs.length).toBe(1); // Still 1, not 2

      // WARN should log
      const warns: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => warns.push(args.map(String).join(" "));
      logger.warn("Warning message");
      console.warn = originalWarn;
      expect(warns.length).toBe(1);

      console.log = originalLog;
    });

    test("should get current log level", () => {
      const logger = createLogger({ level: "DEBUG" });
      expect(logger.getLevel()).toBe("DEBUG");

      logger.setLevel("ERROR");
      expect(logger.getLevel()).toBe("ERROR");
    });
  });

  describe("Timestamp Handling", () => {
    test("should include timestamp by default", () => {
      const logger = createLogger({ level: "INFO", colorize: false, includeTimestamp: true });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message");

      console.log = originalLog;
      // ISO timestamp format: 2025-01-19T10:30:45.123Z
      expect(capturedLogs[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    test("should not include timestamp when disabled", () => {
      const logger = createLogger({ level: "INFO", colorize: false, includeTimestamp: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message");

      console.log = originalLog;
      expect(capturedLogs[0]).not.toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe("Colorization", () => {
    test("should include color codes when colorize is true", () => {
      const logger = createLogger({ level: "INFO", colorize: true });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message");

      console.log = originalLog;
      // ANSI color codes
      expect(capturedLogs[0]).toContain("\x1b[36m"); // Cyan for INFO
      expect(capturedLogs[0]).toContain("\x1b[0m"); // Reset
    });

    test("should not include color codes when colorize is false", () => {
      const logger = createLogger({ level: "INFO", colorize: false });
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        capturedLogs.push(args.map(String).join(" "));
      };

      logger.info("Test message");

      console.log = originalLog;
      expect(capturedLogs[0]).not.toContain("\x1b[");
    });
  });

  describe("Environment Variables", () => {
    test("should use LOG_LEVEL from environment", () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = "DEBUG";

      resetLogger();
      const logger = getLogger();

      expect(logger.getLevel()).toBe("DEBUG");

      process.env.LOG_LEVEL = originalLogLevel ?? undefined;
    });
  });
});
