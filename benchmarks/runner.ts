/**
 * Benchmark Runner
 *
 * Main benchmark runner for Memory-Agent MCP performance testing.
 * Executes benchmark suites, collects metrics, and generates reports.
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import type {
  BenchmarkConfig,
  BenchmarkReport,
  BenchmarkResult,
  BenchmarkSuite,
  BenchmarkMetrics,
  RegressionResult,
  HistoricalEntry,
  PerformanceTarget,
} from "./types";
import { DEFAULT_CONFIG, PERFORMANCE_TARGETS } from "./types";
import { loadBenchmarkSuites } from "./suites/index";

/**
 * Benchmark Runner Class
 */
export class BenchmarkRunner {
  private config: BenchmarkConfig;
  private suites: BenchmarkSuite[] = [];
  private results: BenchmarkResult[] = [];

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a benchmark suite
   */
  registerSuite(suite: BenchmarkSuite): void {
    this.suites.push(suite);
  }

  /**
   * Register multiple benchmark suites
   */
  registerSuites(suites: BenchmarkSuite[]): void {
    suites.forEach((suite) => this.registerSuite(suite));
  }

  /**
   * Run all registered benchmark suites
   */
  async runAll(): Promise<BenchmarkReport> {
    const startTime = performance.now();
    console.log("\n🚀 Starting Memory-Agent MCP Benchmark Suite\n");
    console.log(`Configuration:`);
    console.log(`  Iterations: ${this.config.iterations}`);
    console.log(`  Warmup: ${this.config.warmupIterations}`);
    console.log(`  Timeout: ${this.config.timeout}ms`);
    console.log(`  Memory Profiling: ${this.config.memoryProfiling}\n`);

    // Filter suites if needed
    const suitesToRun = this.config.suiteFilter
      ? this.suites.filter((s) => s.name.includes(this.config.suiteFilter!) || s.category === this.config.suiteFilter)
      : this.suites;

    if (suitesToRun.length === 0) {
      console.warn("⚠️  No benchmark suites to run");
      return this.generateReport(performance.now() - startTime);
    }

    // Run each suite
    for (const suite of suitesToRun) {
      await this.runSuite(suite);
    }

    const totalDuration = performance.now() - startTime;
    const report = this.generateReport(totalDuration);

    // Save results
    await this.saveResults(report);

    return report;
  }

  /**
   * Run a single benchmark suite
   */
  private async runSuite(suite: BenchmarkSuite): Promise<void> {
    console.log(`\n📦 Suite: ${suite.name}`);
    console.log(`   ${suite.description}\n`);

    // Setup
    if (suite.setup) {
      try {
        await suite.setup();
      } catch (error) {
        console.error(`   ❌ Suite setup failed: ${error}`);
        return;
      }
    }

    // Run each benchmark in the suite
    for (const benchmark of suite.benchmarks) {
      const result = await this.runBenchmark(suite.name, benchmark);
      this.results.push(result);
    }

    // Teardown
    if (suite.teardown) {
      try {
        await suite.teardown();
      } catch (error) {
        console.error(`   ⚠️  Suite teardown failed: ${error}`);
      }
    }
  }

  /**
   * Run a single benchmark
   */
  private async runBenchmark(
    suiteName: string,
    benchmark: {
      name: string;
      description?: string;
      iterations?: number;
      warmupIterations?: number;
      timeout?: number;
      target?: PerformanceTarget;
      run: () => Promise<void> | void;
    }
  ): Promise<BenchmarkResult> {
    const iterations = benchmark.iterations ?? this.config.iterations;
    const warmupIterations = benchmark.warmupIterations ?? this.config.warmupIterations;
    const timeout = benchmark.timeout ?? this.config.timeout;

    console.log(`   🏃 ${benchmark.name}`);
    if (benchmark.description && this.config.verbose) {
      console.log(`      ${benchmark.description}`);
    }

    const metrics: BenchmarkMetrics = {
      times: [],
      memorySnapshots: [],
      errors: [],
    };

    // Warmup iterations (not measured)
    if (warmupIterations > 0) {
      if (this.config.verbose) {
        console.log(`      Warming up (${warmupIterations} iterations)...`);
      }
      for (let i = 0; i < warmupIterations; i++) {
        try {
          await benchmark.run();
        } catch (error) {
          // Ignore warmup errors
        }
      }
    }

    // Force garbage collection before measurement (if available)
    if (global.gc) {
      global.gc();
    }

    const startTime = performance.now();

    // Measured iterations
    for (let i = 0; i < iterations; i++) {
      try {
        // Take memory snapshot before
        const memBefore = this.config.memoryProfiling ? this.getMemorySnapshot() : null;

        // Run benchmark
        const iterStart = performance.now();
        await Promise.race([
          benchmark.run(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Benchmark timeout after ${timeout}ms`)), timeout)
          ),
        ]);
        const iterEnd = performance.now();

        // Record time
        metrics.times.push(iterEnd - iterStart);

        // Take memory snapshot after
        if (memBefore) {
          const memAfter = this.getMemorySnapshot();
          metrics.memorySnapshots.push(memAfter);
        }
      } catch (error) {
        metrics.errors.push(error instanceof Error ? error : new Error(String(error)));
        if (this.config.verbose) {
          console.log(`      ⚠️  Iteration ${i + 1} failed: ${error}`);
        }
      }
    }

    const totalDuration = performance.now() - startTime;

    // Calculate statistics
    const result = this.calculateStatistics(
      suiteName,
      benchmark.name,
      benchmark.description,
      metrics,
      iterations,
      totalDuration,
      benchmark.target
    );

    // Print result
    this.printBenchmarkResult(result);

    return result;
  }

  /**
   * Get memory usage snapshot
   */
  private getMemorySnapshot() {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
    };
  }

  /**
   * Calculate statistics from metrics
   */
  private calculateStatistics(
    suiteName: string,
    benchmarkName: string,
    description: string | undefined,
    metrics: BenchmarkMetrics,
    iterations: number,
    totalMs: number,
    target?: PerformanceTarget
  ): BenchmarkResult {
    const times = metrics.times.sort((a, b) => a - b);

    if (times.length === 0) {
      return {
        name: benchmarkName,
        suite: suiteName,
        description,
        operations: 0,
        totalMs: 0,
        avgMs: 0,
        minMs: 0,
        maxMs: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        memoryPeakMB: 0,
        timestamp: new Date().toISOString(),
        status: "fail",
        target,
      };
    }

    // Calculate percentiles
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    // Calculate memory peak
    const memoryPeak = metrics.memorySnapshots.length > 0
      ? Math.max(...metrics.memorySnapshots.map((m) => m.heapUsed))
      : 0;

    // Determine status based on target
    let status: "pass" | "fail" | "warning" = "pass";
    if (target) {
      const actualValue = target.metric === "p99" ? p99 :
                         target.metric === "p95" ? p95 :
                         target.metric === "avg" ? times.reduce((a, b) => a + b, 0) / times.length :
                         times[times.length - 1]; // max

      if (actualValue > target.value) {
        status = "fail";
      } else if (actualValue > target.value * 0.9) {
        status = "warning";
      }
    }

    return {
      name: benchmarkName,
      suite: suiteName,
      description,
      operations: times.length,
      totalMs,
      avgMs: times.reduce((a, b) => a + b, 0) / times.length,
      minMs: times[0],
      maxMs: times[times.length - 1],
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      memoryPeakMB: Math.round(memoryPeak * 100) / 100,
      timestamp: new Date().toISOString(),
      status,
      target,
    };
  }

  /**
   * Print benchmark result
   */
  private printBenchmarkResult(result: BenchmarkResult): void {
    const statusEmoji = result.status === "pass" ? "✅" : result.status === "warning" ? "⚠️" : "❌";
    const targetInfo = result.target
      ? ` (target: ${result.target.metric} <${result.target.value}ms)`
      : "";

    console.log(
      `      ${statusEmoji} avg: ${result.avgMs.toFixed(2)}ms, ` +
      `p50: ${result.p50Ms.toFixed(2)}ms, ` +
      `p95: ${result.p95Ms.toFixed(2)}ms, ` +
      `p99: ${result.p99Ms.toFixed(2)}ms${targetInfo}`
    );

    if (this.config.verbose && result.memoryPeakMB > 0) {
      console.log(`         Memory peak: ${result.memoryPeakMB.toFixed(2)}MB`);
    }
  }

  /**
   * Generate full benchmark report
   */
  private generateReport(totalDurationMs: number): BenchmarkReport {
    const git = this.getGitInfo();
    const environment = this.getEnvironmentInfo();

    // Calculate summary
    const passed = this.results.filter((r) => r.status === "pass").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const warnings = this.results.filter((r) => r.status === "warning").length;

    // Check for regressions if baseline exists
    let regressions = 0;
    if (this.config.compareBaseline) {
      const regressionResults = this.detectRegressions();
      regressions = regressionResults.filter((r) => r.isRegression).length;
    }

    // Validate performance targets
    const targetValidations = this.validateTargets();

    return {
      timestamp: new Date().toISOString(),
      git,
      environment,
      config: this.config,
      results: this.results,
      summary: {
        total: this.results.length,
        passed,
        failed,
        warnings,
        regressions,
        totalDurationMs,
      },
      targets: targetValidations,
    };
  }

  /**
   * Get git information
   */
  private getGitInfo() {
    try {
      return {
        commit: execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim(),
        branch: execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim(),
        author: execSync("git log -1 --format='%an'", { encoding: "utf-8" }).trim(),
        message: execSync("git log -1 --format='%s'", { encoding: "utf-8" }).trim(),
      };
    } catch {
      return {
        commit: "unknown",
        branch: "unknown",
      };
    }
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo() {
    return {
      node: process.version,
      bun: Bun.version || "unknown",
      platform: process.platform,
      arch: process.arch,
      cpus: navigator.hardwareConcurrency || 1,
      memory: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    };
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(): RegressionResult[] {
    const baselinePath = this.config.compareBaseline
      ? resolve(this.config.outputDir, this.config.compareBaseline)
      : resolve(this.config.outputDir, "baseline.json");

    if (!existsSync(baselinePath)) {
      return [];
    }

    try {
      const baseline = JSON.parse(readFileSync(baselinePath, "utf-8")) as BenchmarkReport;
      const regressions: RegressionResult[] = [];

      for (const current of this.results) {
        const base = baseline.results.find(
          (r) => r.name === current.name && r.suite === current.suite
        );

        if (base) {
          const deviation = ((current.p99Ms - base.p99Ms) / base.p99Ms) * 100;
          const isRegression = deviation > this.config.regressionThreshold;

          regressions.push({
            benchmark: `${current.suite}/${current.name}`,
            baseline: base.p99Ms,
            current: current.p99Ms,
            deviation,
            isRegression,
            severity: isRegression
              ? deviation > 50
                ? "critical"
                : deviation > 30
                ? "major"
                : "minor"
              : "none",
          });
        }
      }

      return regressions;
    } catch (error) {
      console.error("Failed to load baseline for comparison:", error);
      return [];
    }
  }

  /**
   * Validate performance targets
   */
  private validateTargets(): Array<{
    operation: string;
    target: string;
    actual: number;
    status: "pass" | "fail";
    margin: number;
  }> {
    const validations: Array<{
      operation: string;
      target: string;
      actual: number;
      status: "pass" | "fail";
      margin: number;
    }> = [];

    for (const target of PERFORMANCE_TARGETS) {
      // Find matching benchmark results
      const matching = this.results.filter((r) =>
        r.name.toLowerCase().includes(target.operation.toLowerCase()) ||
        r.suite.toLowerCase().includes(target.operation.toLowerCase())
      );

      if (matching.length > 0) {
        const actual = Math.max(...matching.map((r) => {
          switch (target.metric) {
            case "p99": return r.p99Ms;
            case "p95": return r.p95Ms;
            case "avg": return r.avgMs;
            case "max": return r.maxMs;
            default: return r.p99Ms;
          }
        }));

        const margin = ((target.value - actual) / target.value) * 100;

        validations.push({
          operation: target.operation,
          target: `${target.metric} < ${target.value}ms`,
          actual: Math.round(actual * 100) / 100,
          status: actual <= target.value ? "pass" : "fail",
          margin: Math.round(margin * 100) / 100,
        });
      }
    }

    return validations;
  }

  /**
   * Save benchmark results
   */
  private async saveResults(report: BenchmarkReport): Promise<void> {
    const outputDir = this.config.outputDir;

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Save latest results
    const latestPath = join(outputDir, "latest.json");
    writeFileSync(latestPath, JSON.stringify(report, null, 2));

    // Save to history
    if (this.config.saveHistory) {
      const historyDir = join(outputDir, "history");
      if (!existsSync(historyDir)) {
        mkdirSync(historyDir, { recursive: true });
      }

      const historyEntry: HistoricalEntry = {
        timestamp: report.timestamp,
        commit: report.git.commit,
        results: report.results.map((r) => ({
          name: r.name,
          suite: r.suite,
          avgMs: Math.round(r.avgMs * 100) / 100,
          p99Ms: Math.round(r.p99Ms * 100) / 100,
          status: r.status,
        })),
        summary: report.summary,
      };

      const historyPath = join(historyDir, `${report.timestamp.replace(/[:.]/g, "-")}.json`);
      writeFileSync(historyPath, JSON.stringify(historyEntry, null, 2));
    }

    console.log(`\n💾 Results saved to ${outputDir}`);
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const config: Partial<BenchmarkConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--suite" && args[i + 1]) {
      config.suiteFilter = args[i + 1];
      i++;
    } else if (arg === "--iterations" && args[i + 1]) {
      config.iterations = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--compare" && args[i + 1]) {
      config.compareBaseline = args[i + 1];
      i++;
    } else if (arg === "--verbose" || arg === "-v") {
      config.verbose = true;
    } else if (arg === "--output" && args[i + 1]) {
      config.outputFormat = args[i + 1].split(",") as any;
      i++;
    }
  }

  const runner = new BenchmarkRunner(config);

  // Dynamically load and register suites
  // This will be implemented when we create the actual benchmark suites
  console.log("ℹ️  Loading benchmark suites...");

  try {
    // Import all benchmark suites
    const suites = await loadBenchmarkSuites(config.suiteFilter);
    runner.registerSuites(suites);

    // Run benchmarks
    const report = await runner.runAll();

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 BENCHMARK SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`📉 Regressions: ${report.summary.regressions}`);
    console.log(`⏱️  Total Duration: ${(report.summary.totalDurationMs / 1000).toFixed(2)}s`);

    // Print target validations
    if (report.targets.length > 0) {
      console.log("\n🎯 Performance Targets:");
      for (const validation of report.targets) {
        const status = validation.status === "pass" ? "✅" : "❌";
        console.log(
          `  ${status} ${validation.operation}: ` +
          `actual ${validation.actual}ms vs target ${validation.target} ` +
          `(margin: ${validation.margin > 0 ? "+" : ""}${validation.margin}%)`
        );
      }
    }

    // Exit with appropriate code
    if (report.summary.failed > 0 || (config.failOnRegression && report.summary.regressions > 0)) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Benchmark execution failed:", error);
    process.exit(1);
  }
}



// Run if executed directly
if (import.meta.main) {
  main();
}

export { main as runBenchmarks };
