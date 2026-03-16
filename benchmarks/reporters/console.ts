/**
 * Console Reporter
 *
 * Formats and displays benchmark results in the console with colors and formatting.
 */

import type { BenchmarkReport, BenchmarkResult, BenchmarkReporter, TargetValidation, RegressionResult } from "../types";

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
};

/**
 * Console Reporter Implementation
 */
export class ConsoleReporter implements BenchmarkReporter {
  name = "console";

  /**
   * Generate console report
   */
  generate(report: BenchmarkReport): string {
    const lines: string[] = [];

    // Header
    lines.push("");
    lines.push(this.colorize("═".repeat(80), colors.cyan, colors.bright));
    lines.push(this.colorize("  MEMORY-AGENT MCP - PERFORMANCE BENCHMARK REPORT", colors.cyan, colors.bright));
    lines.push(this.colorize("═".repeat(80), colors.cyan, colors.bright));
    lines.push("");

    // Environment info
    lines.push(this.colorize("Environment:", colors.white, colors.bright));
    lines.push(`  Node: ${report.environment.node}`);
    lines.push(`  Bun: ${report.environment.bun}`);
    lines.push(`  Platform: ${report.environment.platform} (${report.environment.arch})`);
    lines.push(`  CPUs: ${report.environment.cpus}`);
    lines.push(`  Memory: ${report.environment.memory}MB`);
    lines.push("");

    // Git info
    lines.push(this.colorize("Git:", colors.white, colors.bright));
    lines.push(`  Branch: ${report.git.branch}`);
    lines.push(`  Commit: ${report.git.commit}`);
    if (report.git.author) {
      lines.push(`  Author: ${report.git.author}`);
    }
    if (report.git.message) {
      lines.push(`  Message: ${report.git.message}`);
    }
    lines.push("");

    // Configuration
    lines.push(this.colorize("Configuration:", colors.white, colors.bright));
    lines.push(`  Iterations: ${report.config.iterations}`);
    lines.push(`  Warmup: ${report.config.warmupIterations}`);
    lines.push(`  Timeout: ${report.config.timeout}ms`);
    lines.push(`  Memory Profiling: ${report.config.memoryProfiling ? "Enabled" : "Disabled"}`);
    lines.push("");

    // Divider
    lines.push(this.colorize("─".repeat(80), colors.dim));
    lines.push("");

    // Group results by suite
    const groupedResults = this.groupBySuite(report.results);

    // Display results for each suite
    for (const [suiteName, results] of Object.entries(groupedResults)) {
      lines.push(this.colorize(`📦 ${suiteName}`, colors.magenta, colors.bright));
      lines.push("");

      // Table header
      const header = this.formatRow("Benchmark", "Avg", "P50", "P95", "P99", "Status", "Memory");
      lines.push(this.colorize(header, colors.white, colors.bright));
      lines.push(this.colorize("─".repeat(80), colors.dim));

      // Results
      for (const result of results) {
        const row = this.formatResultRow(result);
        lines.push(row);
      }

      lines.push("");
    }

    // Performance targets
    if (report.targets.length > 0) {
      lines.push(this.colorize("─".repeat(80), colors.dim));
      lines.push("");
      lines.push(this.colorize("🎯 Performance Targets", colors.cyan, colors.bright));
      lines.push("");

      const header = this.formatTargetRow("Operation", "Target", "Actual", "Margin", "Status");
      lines.push(this.colorize(header, colors.white, colors.bright));
      lines.push(this.colorize("─".repeat(80), colors.dim));

      for (const validation of report.targets) {
        const row = this.formatValidationRow(validation);
        lines.push(row);
      }

      lines.push("");
    }

    // Summary
    lines.push(this.colorize("─".repeat(80), colors.dim));
    lines.push("");
    lines.push(this.colorize("📊 Summary", colors.cyan, colors.bright));
    lines.push("");
    lines.push(`  Total Benchmarks: ${report.summary.total}`);
    lines.push(`  ${this.colorize("✅ Passed:", colors.green)} ${report.summary.passed}`);
    lines.push(`  ${this.colorize("❌ Failed:", colors.red)} ${report.summary.failed}`);
    lines.push(`  ${this.colorize("⚠️  Warnings:", colors.yellow)} ${report.summary.warnings}`);
    lines.push(`  ${this.colorize("📉 Regressions:", colors.magenta)} ${report.summary.regressions}`);
    lines.push(`  ${this.colorize("⏱️  Duration:", colors.blue)} ${(report.summary.totalDurationMs / 1000).toFixed(2)}s`);
    lines.push("");

    // Status indicator
    if (report.summary.failed === 0 && report.summary.regressions === 0) {
      lines.push(this.colorize("  ✓ All benchmarks passed!", colors.green, colors.bright));
    } else if (report.summary.failed > 0) {
      lines.push(this.colorize("  ✗ Some benchmarks failed!", colors.red, colors.bright));
    } else {
      lines.push(this.colorize("  ⚠ Performance regressions detected!", colors.yellow, colors.bright));
    }

    lines.push("");
    lines.push(this.colorize("═".repeat(80), colors.cyan, colors.bright));
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Group results by suite
   */
  private groupBySuite(results: BenchmarkResult[]): Record<string, BenchmarkResult[]> {
    const grouped: Record<string, BenchmarkResult[]> = {};

    for (const result of results) {
      if (!grouped[result.suite]) {
        grouped[result.suite] = [];
      }
      grouped[result.suite].push(result);
    }

    return grouped;
  }

  /**
   * Format a table row
   */
  private formatRow(...columns: string[]): string {
    const widths = [35, 10, 10, 10, 10, 8, 10];
    return columns.map((col, i) => this.pad(col, widths[i])).join("");
  }

  /**
   * Format a result row
   */
  private formatResultRow(result: BenchmarkResult): string {
    const name = this.truncate(result.name, 34);
    const avg = `${result.avgMs.toFixed(2)}ms`;
    const p50 = `${result.p50Ms.toFixed(2)}ms`;
    const p95 = `${result.p95Ms.toFixed(2)}ms`;
    const p99 = `${result.p99Ms.toFixed(2)}ms`;
    const status = this.getStatusEmoji(result.status);
    const memory = result.memoryPeakMB > 0 ? `${result.memoryPeakMB.toFixed(1)}MB` : "-";

    const widths = [35, 10, 10, 10, 10, 8, 10];
    const values = [name, avg, p50, p95, p99, status, memory];

    const row = values.map((val, i) => this.pad(val, widths[i])).join("");

    // Color based on status
    if (result.status === "fail") {
      return this.colorize(row, colors.red);
    } else if (result.status === "warning") {
      return this.colorize(row, colors.yellow);
    }
    return row;
  }

  /**
   * Format target validation row
   */
  private formatTargetRow(...columns: string[]): string {
    const widths = [25, 20, 15, 10, 8];
    return columns.map((col, i) => this.pad(col, widths[i])).join("");
  }

  /**
   * Format validation row
   */
  private formatValidationRow(validation: TargetValidation): string {
    const operation = this.truncate(validation.operation, 24);
    const target = validation.target;
    const actual = `${validation.actual}ms`;
    const margin = `${validation.margin > 0 ? "+" : ""}${validation.margin}%`;
    const status = validation.status === "pass" ? "✅" : "❌";

    const widths = [25, 20, 15, 10, 8];
    const values = [operation, target, actual, margin, status];

    const row = values.map((val, i) => this.pad(val, widths[i])).join("");

    return validation.status === "pass"
      ? this.colorize(row, colors.green)
      : this.colorize(row, colors.red);
  }

  /**
   * Get status emoji
   */
  private getStatusEmoji(status: "pass" | "fail" | "warning"): string {
    switch (status) {
      case "pass":
        return "✅";
      case "fail":
        return "❌";
      case "warning":
        return "⚠️";
    }
  }

  /**
   * Colorize text
   */
  private colorize(text: string, ...colorCodes: string[]): string {
    return `${colorCodes.join("")}${text}${colors.reset}`;
  }

  /**
   * Pad string to fixed width
   */
  private pad(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    return text + " ".repeat(width - text.length);
  }

  /**
   * Truncate string with ellipsis
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + "...";
  }
}

/**
 * Export singleton instance
 */
export const consoleReporter = new ConsoleReporter();
