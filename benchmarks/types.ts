/**
 * Benchmark Types and Interfaces
 *
 * Defines all types and interfaces for the Memory-Agent MCP benchmarking infrastructure.
 */

/**
 * Individual benchmark result
 */
export interface BenchmarkResult {
  name: string;
  suite: string;
  description?: string;
  operations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  memoryPeakMB: number;
  timestamp: string;
  status: 'pass' | 'fail' | 'warning';
  target?: PerformanceTarget;
  deviation?: number; // Percentage deviation from baseline
}

/**
 * Performance targets from PRD
 */
export interface PerformanceTarget {
  operation: string;
  metric: 'p99' | 'p95' | 'avg' | 'max';
  value: number; // in milliseconds
  description?: string;
}

/**
 * Benchmark suite interface
 */
export interface BenchmarkSuite {
  name: string;
  description: string;
  category: 'tools' | 'core' | 'scalability';
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  benchmarks: BenchmarkCase[];
}

/**
 * Individual benchmark case
 */
export interface BenchmarkCase {
  name: string;
  description?: string;
  iterations?: number;
  warmupIterations?: number;
  timeout?: number; // milliseconds
  target?: PerformanceTarget;
  run: () => Promise<void> | void;
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /** Default number of iterations per benchmark */
  iterations: number;
  /** Number of warmup iterations (not counted) */
  warmupIterations: number;
  /** Timeout for each benchmark in milliseconds */
  timeout: number;
  /** Enable memory profiling */
  memoryProfiling: boolean;
  /** Generate detailed reports */
  verbose: boolean;
  /** Suite filter (run only matching suites) */
  suiteFilter?: string;
  /** Compare against baseline */
  compareBaseline?: string;
  /** Regression threshold (percentage) */
  regressionThreshold: number;
  /** Output format */
  outputFormat: ('console' | 'json' | 'html')[];
  /** Output directory */
  outputDir: string;
  /** Save results to history */
  saveHistory: boolean;
  /** Fail on regression */
  failOnRegression: boolean;
}

/**
 * Full benchmark report
 */
export interface BenchmarkReport {
  timestamp: string;
  git: {
    commit: string;
    branch: string;
    author?: string;
    message?: string;
  };
  environment: {
    node: string;
    bun: string;
    platform: string;
    arch: string;
    cpus: number;
    memory: number;
  };
  config: BenchmarkConfig;
  results: BenchmarkResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    regressions: number;
    totalDurationMs: number;
  };
  targets: TargetValidation[];
}

/**
 * Target validation result
 */
export interface TargetValidation {
  operation: string;
  target: string;
  actual: number;
  status: 'pass' | 'fail';
  margin: number; // percentage below target
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Benchmark metrics collected during execution
 */
export interface BenchmarkMetrics {
  times: number[];
  memorySnapshots: MemorySnapshot[];
  errors: Error[];
}

/**
 * Regression detection result
 */
export interface RegressionResult {
  benchmark: string;
  baseline: number;
  current: number;
  deviation: number; // percentage
  isRegression: boolean;
  severity: 'none' | 'minor' | 'major' | 'critical';
}

/**
 * Historical benchmark entry
 */
export interface HistoricalEntry {
  timestamp: string;
  commit: string;
  results: Array<{
    name: string;
    suite: string;
    avgMs: number;
    p99Ms: number;
    status: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Reporter interface
 */
export interface BenchmarkReporter {
  name: string;
  generate(report: BenchmarkReport): Promise<string> | string;
  save?(report: BenchmarkReport, path: string): Promise<void>;
}

/**
 * Fixture data sizes
 */
export type FixtureSize = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * Fixture configuration
 */
export interface FixtureConfig {
  size: FixtureSize;
  count: number;
  topics: string[];
  includeVectors: boolean;
  includeMetadata: boolean;
}

/**
 * Performance targets from PRD (MEM-007)
 */
export const PERFORMANCE_TARGETS: PerformanceTarget[] = [
  {
    operation: 'memory_store',
    metric: 'p99',
    value: 10,
    description: 'P99 response time <10ms',
  },
  {
    operation: 'memory_query_100',
    metric: 'p99',
    value: 50,
    description: 'P99 query time with 100 memories <50ms',
  },
  {
    operation: 'memory_query_10k',
    metric: 'p99',
    value: 200,
    description: 'P99 query time with 10K memories <200ms',
  },
  {
    operation: 'embedding_generation',
    metric: 'avg',
    value: 100,
    description: 'Embedding generation <100ms',
  },
  {
    operation: 'memory_decay_10k',
    metric: 'max',
    value: 5000,
    description: 'Decay operation on 10K memories <5s',
  },
  {
    operation: 'overall',
    metric: 'p99',
    value: 500,
    description: 'Overall P99 response time <500ms',
  },
];

/**
 * Default benchmark configuration
 */
export const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 100,
  warmupIterations: 10,
  timeout: 30000,
  memoryProfiling: true,
  verbose: false,
  regressionThreshold: 15, // 15% regression threshold
  outputFormat: ['console', 'json'],
  outputDir: 'benchmarks/results',
  saveHistory: true,
  failOnRegression: false,
};

/**
 * Fixture size configurations
 */
export const FIXTURE_SIZES: Record<FixtureSize, FixtureConfig> = {
  small: {
    size: 'small',
    count: 100,
    topics: ['decision', 'bug', 'api', 'general'],
    includeVectors: true,
    includeMetadata: true,
  },
  medium: {
    size: 'medium',
    count: 1000,
    topics: ['decision', 'bug', 'api', 'architecture', 'general', 'testing'],
    includeVectors: true,
    includeMetadata: true,
  },
  large: {
    size: 'large',
    count: 10000,
    topics: ['decision', 'bug', 'api', 'architecture', 'general', 'testing', 'performance', 'security'],
    includeVectors: true,
    includeMetadata: true,
  },
  xlarge: {
    size: 'xlarge',
    count: 100000,
    topics: ['decision', 'bug', 'api', 'architecture', 'general', 'testing', 'performance', 'security', 'deployment', 'monitoring'],
    includeVectors: true,
    includeMetadata: true,
  },
};
