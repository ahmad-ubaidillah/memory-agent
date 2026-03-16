/**
 * Benchmark Infrastructure Test
 *
 * Simple test to verify the benchmark infrastructure is working correctly.
 * Run with: tsx benchmarks/test-infrastructure.ts
 */

import { BenchmarkRunner } from "./runner";
import { loadBenchmarkSuites, getSuiteStats } from "./suites/index";
import { consoleReporter } from "./reporters/console";
import { jsonReporter } from "./reporters/json";
import { htmlReporter } from "./reporters/html";
import type { BenchmarkSuite } from "./types";

/**
 * Test 1: Verify suite loading
 */
async function testSuiteLoading() {
  console.log("\n🧪 Test 1: Suite Loading\n");
  console.log("=".repeat(60));

  const stats = getSuiteStats();
  console.log(`Total suites: ${stats.total}`);
  console.log(`Total benchmarks: ${stats.totalBenchmarks}`);
  console.log(`By category:`);
  console.log(`  - Tools: ${stats.byCategory.tools}`);
  console.log(`  - Core: ${stats.byCategory.core}`);
  console.log(`  - Scalability: ${stats.byCategory.scalability}`);

  const allSuites = loadBenchmarkSuites();
  console.log(`\nLoaded ${allSuites.length} suites:`);

  for (const suite of allSuites) {
    console.log(`  - ${suite.name} (${suite.benchmarks.length} benchmarks)`);
  }

  if (allSuites.length === 0) {
    throw new Error("No benchmark suites loaded!");
  }

  console.log("\n✅ Suite loading test passed\n");
}

/**
 * Test 2: Verify runner creation
 */
async function testRunnerCreation() {
  console.log("\n🧪 Test 2: Runner Creation\n");
  console.log("=".repeat(60));

  const runner = new BenchmarkRunner({
    iterations: 10,
    warmupIterations: 2,
    verbose: true,
    memoryProfiling: false,
    outputFormat: ["console"],
    saveHistory: false,
  });

  console.log("✅ Runner created successfully");
  console.log(`Configuration:`);
  console.log(`  - Iterations: ${10}`);
  console.log(`  - Warmup: ${2}`);
  console.log(`  - Verbose: true`);

  console.log("\n✅ Runner creation test passed\n");
}

/**
 * Test 3: Verify reporters
 */
async function testReporters() {
  console.log("\n🧪 Test 3: Reporters\n");
  console.log("=".repeat(60));

  // Create a mock report
  const mockReport = {
    timestamp: new Date().toISOString(),
    git: {
      commit: "test123",
      branch: "test-branch",
    },
    environment: {
      node: "v20.0.0",
      bun: "1.0.0",
      platform: "darwin",
      arch: "arm64",
      cpus: 8,
      memory: 100,
    },
    config: {
      iterations: 10,
      warmupIterations: 2,
      timeout: 30000,
      memoryProfiling: false,
      verbose: true,
      regressionThreshold: 15,
      outputFormat: ["console"] as const,
      outputDir: "benchmarks/results",
      saveHistory: false,
      failOnRegression: false,
    },
    results: [
      {
        name: "test_benchmark",
        suite: "test_suite",
        operations: 10,
        totalMs: 50,
        avgMs: 5,
        minMs: 3,
        maxMs: 8,
        p50Ms: 4.5,
        p95Ms: 7,
        p99Ms: 7.8,
        memoryPeakMB: 12.5,
        timestamp: new Date().toISOString(),
        status: "pass" as const,
      },
    ],
    summary: {
      total: 1,
      passed: 1,
      failed: 0,
      warnings: 0,
      regressions: 0,
      totalDurationMs: 50,
    },
    targets: [],
  };

  // Test console reporter
  console.log("\nTesting Console Reporter:");
  const consoleOutput = consoleReporter.generate(mockReport);
  console.log(`  Generated ${consoleOutput.length} characters`);
  console.log("  ✅ Console reporter works");

  // Test JSON reporter
  console.log("\nTesting JSON Reporter:");
  const jsonOutput = jsonReporter.generate(mockReport);
  const parsed = JSON.parse(jsonOutput);
  console.log(`  Generated valid JSON with ${parsed.results.length} results`);
  console.log("  ✅ JSON reporter works");

  // Test HTML reporter
  console.log("\nTesting HTML Reporter:");
  const htmlOutput = htmlReporter.generate(mockReport);
  console.log(`  Generated ${htmlOutput.length} characters`);
  console.log(`  Contains <html>: ${htmlOutput.includes("<html>")}`);
  console.log(`  Contains <title>: ${htmlOutput.includes("<title>")}`);
  console.log("  ✅ HTML reporter works");

  console.log("\n✅ Reporters test passed\n");
}

/**
 * Test 4: Run minimal benchmark
 */
async function testMinimalBenchmark() {
  console.log("\n🧪 Test 4: Minimal Benchmark\n");
  console.log("=".repeat(60));

  const testSuite: BenchmarkSuite = {
    name: "test_suite",
    description: "Test suite for infrastructure validation",
    category: "tools",
    benchmarks: [
      {
        name: "fast_operation",
        description: "A fast operation for testing",
        iterations: 10,
        warmupIterations: 2,
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
        },
      },
      {
        name: "medium_operation",
        description: "A medium speed operation for testing",
        iterations: 10,
        warmupIterations: 2,
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
        },
      },
    ],
  };

  const runner = new BenchmarkRunner({
    iterations: 10,
    warmupIterations: 2,
    verbose: false,
    memoryProfiling: false,
    outputFormat: ["console"],
    saveHistory: false,
  });

  runner.registerSuite(testSuite);

  console.log("Running minimal benchmark suite...\n");
  const report = await runner.runAll();

  console.log("\nBenchmark Results:");
  console.log(`  Total: ${report.summary.total}`);
  console.log(`  Passed: ${report.summary.passed}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log(`  Duration: ${report.summary.totalDurationMs.toFixed(2)}ms`);

  if (report.summary.failed > 0) {
    throw new Error("Some benchmarks failed!");
  }

  console.log("\n✅ Minimal benchmark test passed\n");
}

/**
 * Test 5: Verify suite filtering
 */
async function testSuiteFiltering() {
  console.log("\n🧪 Test 5: Suite Filtering\n");
  console.log("=".repeat(60));

  const allSuites = loadBenchmarkSuites();
  const toolsSuites = loadBenchmarkSuites("tools");
  const coreSuites = loadBenchmarkSuites("core");
  const scalabilitySuites = loadBenchmarkSuites("scalability");

  console.log(`All suites: ${allSuites.length}`);
  console.log(`Tools suites: ${toolsSuites.length}`);
  console.log(`Core suites: ${coreSuites.length}`);
  console.log(`Scalability suites: ${scalabilitySuites.length}`);

  // Verify filtering works
  if (toolsSuites.some((s) => s.category !== "tools")) {
    throw new Error("Tools filter returned non-tool suites!");
  }

  if (coreSuites.some((s) => s.category !== "core")) {
    throw new Error("Core filter returned non-core suites!");
  }

  if (scalabilitySuites.some((s) => s.category !== "scalability")) {
    throw new Error("Scalability filter returned non-scalability suites!");
  }

  console.log("\n✅ Suite filtering test passed\n");
}

/**
 * Test 6: Performance target validation
 */
async function testPerformanceTargets() {
  console.log("\n🧪 Test 6: Performance Targets\n");
  console.log("=".repeat(60));

  const { PERFORMANCE_TARGETS } = await import("./types");

  console.log("Performance targets defined:");
  for (const target of PERFORMANCE_TARGETS) {
    console.log(`  - ${target.operation}: ${target.metric} < ${target.value}ms`);
    console.log(`    ${target.description}`);
  }

  if (PERFORMANCE_TARGETS.length === 0) {
    throw new Error("No performance targets defined!");
  }

  console.log("\n✅ Performance targets test passed\n");
}

/**
 * Main test runner
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  BENCHMARK INFRASTRUCTURE TEST SUITE");
  console.log("=".repeat(60));

  const tests = [
    { name: "Suite Loading", fn: testSuiteLoading },
    { name: "Runner Creation", fn: testRunnerCreation },
    { name: "Reporters", fn: testReporters },
    { name: "Minimal Benchmark", fn: testMinimalBenchmark },
    { name: "Suite Filtering", fn: testSuiteFiltering },
    { name: "Performance Targets", fn: testPerformanceTargets },
  ];

  const results: Array<{ name: string; status: "pass" | "fail"; error?: Error }> = [];

  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, status: "pass" });
    } catch (error) {
      results.push({
        name: test.name,
        status: "fail",
        error: error instanceof Error ? error : new Error(String(error)),
      });
      console.error(`\n❌ ${test.name} failed:`, error);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  TEST SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;

  for (const result of results) {
    const icon = result.status === "pass" ? "✅" : "❌";
    console.log(`${icon} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\n❌ Some tests failed. Please fix the issues above.\n");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed! Benchmark infrastructure is ready.\n");
    process.exit(0);
  }
}

// Run tests
main().catch((error) => {
  console.error("\n❌ Test suite failed with error:", error);
  process.exit(1);
});
