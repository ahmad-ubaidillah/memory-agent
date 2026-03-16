/**
 * JSON Reporter
 *
 * Generates JSON reports for benchmark results.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { BenchmarkReport, BenchmarkReporter } from "../types";

/**
 * JSON Reporter Implementation
 */
export class JsonReporter implements BenchmarkReporter {
  name = "json";

  /**
   * Generate JSON report
   */
  generate(report: BenchmarkReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Save JSON report to file
   */
  async save(report: BenchmarkReport, outputPath: string): Promise<void> {
    // Ensure directory exists
    const dir = join(outputPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Generate and save JSON
    const json = this.generate(report);
    writeFileSync(outputPath, json, "utf-8");

    console.log(`📄 JSON report saved to ${outputPath}`);
  }
}

/**
 * Generate a summary JSON report (lighter weight)
 */
export function generateSummaryJson(report: BenchmarkReport): string {
  const summary = {
    timestamp: report.timestamp,
    git: {
      commit: report.git.commit,
      branch: report.git.branch,
    },
    summary: report.summary,
    results: report.results.map((r) => ({
      suite: r.suite,
      name: r.name,
      avgMs: Math.round(r.avgMs * 100) / 100,
      p99Ms: Math.round(r.p99Ms * 100) / 100,
      status: r.status,
    })),
    targets: report.targets,
  };

  return JSON.stringify(summary, null, 2);
}

/**
 * Generate a detailed JSON report with all metrics
 */
export function generateDetailedJson(report: BenchmarkReport): string {
  const detailed = {
    ...report,
    results: report.results.map((r) => ({
      ...r,
      // Round all numeric values for readability
      avgMs: Math.round(r.avgMs * 100) / 100,
      minMs: Math.round(r.minMs * 100) / 100,
      maxMs: Math.round(r.maxMs * 100) / 100,
      p50Ms: Math.round(r.p50Ms * 100) / 100,
      p95Ms: Math.round(r.p95Ms * 100) / 100,
      p99Ms: Math.round(r.p99Ms * 100) / 100,
      memoryPeakMB: Math.round(r.memoryPeakMB * 100) / 100,
    })),
  };

  return JSON.stringify(detailed, null, 2);
}

/**
 * Generate a comparison JSON report (for regression detection)
 */
export function generateComparisonJson(
  current: BenchmarkReport,
  baseline: BenchmarkReport
): string {
  const comparisons = current.results.map((currentResult) => {
    const baselineResult = baseline.results.find(
      (r) => r.name === currentResult.name && r.suite === currentResult.suite
    );

    if (!baselineResult) {
      return {
        suite: currentResult.suite,
        name: currentResult.name,
        status: "new",
        current: {
          avgMs: Math.round(currentResult.avgMs * 100) / 100,
          p99Ms: Math.round(currentResult.p99Ms * 100) / 100,
        },
        baseline: null,
        change: null,
      };
    }

    const avgChange = ((currentResult.avgMs - baselineResult.avgMs) / baselineResult.avgMs) * 100;
    const p99Change = ((currentResult.p99Ms - baselineResult.p99Ms) / baselineResult.p99Ms) * 100;

    return {
      suite: currentResult.suite,
      name: currentResult.name,
      status: avgChange > 15 || p99Change > 15 ? "regression" :
              avgChange < -5 || p99Change < -5 ? "improvement" : "stable",
      current: {
        avgMs: Math.round(currentResult.avgMs * 100) / 100,
        p99Ms: Math.round(currentResult.p99Ms * 100) / 100,
      },
      baseline: {
        avgMs: Math.round(baselineResult.avgMs * 100) / 100,
        p99Ms: Math.round(baselineResult.p99Ms * 100) / 100,
      },
      change: {
        avgMs: Math.round(avgChange * 100) / 100,
        p99Ms: Math.round(p99Change * 100) / 100,
      },
    };
  });

  const report = {
    timestamp: current.timestamp,
    baselineTimestamp: baseline.timestamp,
    git: {
      current: {
        commit: current.git.commit,
        branch: current.git.branch,
      },
      baseline: {
        commit: baseline.git.commit,
        branch: baseline.git.branch,
      },
    },
    summary: {
      total: comparisons.length,
      regressions: comparisons.filter((c) => c.status === "regression").length,
      improvements: comparisons.filter((c) => c.status === "improvement").length,
      stable: comparisons.filter((c) => c.status === "stable").length,
      new: comparisons.filter((c) => c.status === "new").length,
    },
    comparisons,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Export a singleton instance
 */
export const jsonReporter = new JsonReporter();
