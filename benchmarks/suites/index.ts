/**
 * Benchmark Suites Index
 *
 * Exports all benchmark suites for the Memory-Agent MCP benchmarking infrastructure.
 */

import type { BenchmarkSuite } from "../types";

// Import all benchmark suites (using default imports)
import storeBenchmarkSuite from "./tools/store.bench";
import queryBenchmarkSuite from "./tools/query.bench";
import databaseBenchmarkSuite from "./core/database.bench";
import smallScalabilitySuite from "./scalability/small.bench";
import mediumScalabilitySuite from "./scalability/medium.bench";
import largeScalabilitySuite from "./scalability/large.bench";

/**
 * All available benchmark suites
 */
export const allSuites: BenchmarkSuite[] = [
  // Tool benchmarks
  storeBenchmarkSuite,
  queryBenchmarkSuite,

  // Core operation benchmarks
  databaseBenchmarkSuite,

  // Scalability benchmarks
  smallScalabilitySuite,
  mediumScalabilitySuite,
  largeScalabilitySuite,
];

/**
 * Get suites by category
 */
export function getSuitesByCategory(
  category: "tools" | "core" | "scalability",
): BenchmarkSuite[] {
  return allSuites.filter((suite) => suite.category === category);
}

/**
 * Get suite by name
 */
export function getSuiteByName(name: string): BenchmarkSuite | undefined {
  return allSuites.find((suite) => suite.name === name);
}

/**
 * Load benchmark suites based on filter
 */
export function loadBenchmarkSuites(filter?: string): BenchmarkSuite[] {
  if (!filter) {
    return allSuites;
  }

  // Check if filter matches a category
  if (filter === "tools" || filter === "core" || "scalability") {
    return getSuitesByCategory(filter as "tools" | "core" | "scalability");
  }

  // Check if filter matches a suite name (partial match)
  const matchingSuites = allSuites.filter(
    (suite) =>
      suite.name.toLowerCase().includes(filter.toLowerCase()) ||
      suite.category.toLowerCase().includes(filter.toLowerCase()),
  );

  return matchingSuites;
}

/**
 * Get list of available suite names
 */
export function getAvailableSuiteNames(): string[] {
  return allSuites.map((suite) => suite.name);
}

/**
 * Get benchmark suite statistics
 */
export function getSuiteStats() {
  return {
    total: allSuites.length,
    byCategory: {
      tools: getSuitesByCategory("tools").length,
      core: getSuitesByCategory("core").length,
      scalability: getSuitesByCategory("scalability").length,
    },
    totalBenchmarks: allSuites.reduce(
      (sum, suite) => sum + suite.benchmarks.length,
      0,
    ),
  };
}

export default allSuites;
