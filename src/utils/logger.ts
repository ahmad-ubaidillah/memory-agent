/**
 * Structured Logging System for Memory-Agent MCP
 *
 * Provides JSON-formatted logging with configurable levels and output destinations.
 */

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    code: string;
    message?: string;
    stack?: string;
  };
  duration_ms?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  output: "console" | "file" | "both";
  filePath?: string;
  includeTimestamp: boolean;
  colorize: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const COLORS = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m", // Yellow
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[90m", // Gray
  RESET: "\x1b[0m",
};

class Logger {
  private config: LoggerConfig;
  private fileHandle?: ReturnType<typeof Bun.file>;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: ((typeof Bun !== "undefined" ? Bun.env.LOG_LEVEL : undefined) as LogLevel) || "INFO",
      output: "console",
      includeTimestamp: true,
      colorize: true,
      ...config,
    };

    if (this.config.output === "file" || this.config.output === "both") {
      if (!this.config.filePath) {
        this.config.filePath = ".memory/memory-agent.log";
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.config.level];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatConsole(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    const levelStr = this.config.colorize
      ? `${COLORS[entry.level]}${entry.level}${COLORS.RESET}`
      : entry.level;

    parts.push(`${levelStr}:`);
    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
      parts.push(`\n  Error Code: ${entry.error.code}`);
      if (entry.error.message) {
        parts.push(`\n  Error Message: ${entry.error.message}`);
      }
      if (entry.error.stack && this.config.level === "DEBUG") {
        parts.push(`\n  Stack Trace:\n${entry.error.stack}`);
      }
    }

    if (entry.duration_ms !== undefined) {
      parts.push(`(${entry.duration_ms.toFixed(2)}ms)`);
    }

    return parts.join(" ");
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.filePath) return;

    try {
      const logLine = `${JSON.stringify(entry)}\n`;
      await Bun.write(this.config.filePath, logLine, { createPath: true });
    } catch (error) {
      // Fallback to console if file write fails
      console.error("Failed to write to log file:", error);
    }
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: { code: string; message?: string; stack?: string },
    duration_ms?: number
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 && { context }),
      ...(error && { error }),
      ...(duration_ms !== undefined && { duration_ms }),
    };

    // Output to console
    if (this.config.output === "console" || this.config.output === "both") {
      const consoleMethod = level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log";
      console[consoleMethod](this.formatConsole(entry));
    }

    // Output to file
    if (this.config.output === "file" || this.config.output === "both") {
      await this.writeToFile(entry);
    }
  }

  /**
   * Log error message
   */
  error(
    message: string,
    context?: Record<string, unknown>,
    error?: { code: string; message?: string; stack?: string }
  ): void {
    this.log("ERROR", message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log("WARN", message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log("INFO", message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log("DEBUG", message, context);
  }

  /**
   * Log performance metric with duration
   */
  metric(message: string, duration_ms: number, context?: Record<string, unknown>): void {
    this.log("INFO", message, context, undefined, duration_ms);
  }

  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.metric(label, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.metric(`${label} (failed)`, duration);
      throw error;
    }
  }

  /**
   * Create child logger with persistent context
   */
  child(defaultContext: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }

  /**
   * Set log level at runtime
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: Record<string, unknown>
  ) {}

  private mergeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) {
      return Object.keys(this.defaultContext).length > 0 ? this.defaultContext : undefined;
    }
    return { ...this.defaultContext, ...context };
  }

  error(
    message: string,
    context?: Record<string, unknown>,
    error?: { code: string; message?: string; stack?: string }
  ): void {
    this.parent.error(message, this.mergeContext(context), error);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(message, this.mergeContext(context));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  metric(message: string, duration_ms: number, context?: Record<string, unknown>): void {
    this.parent.metric(message, duration_ms, this.mergeContext(context));
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

/**
 * Get or create logger instance
 */
export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

/**
 * Create a new logger instance (useful for testing)
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Reset logger instance (useful for testing)
 */
export function resetLogger(): void {
  loggerInstance = null;
}

// Export default logger instance
export default getLogger();
