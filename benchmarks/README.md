# Memory-Agent MCP Benchmark Suite

Comprehensive performance benchmarking infrastructure for Memory-Agent MCP operations.

## 🎯 Overview

This benchmark suite measures and validates the performance of all Memory-Agent MCP operations against defined targets from the PRD. It provides:

- **Automated benchmarking** of all core operations
- **Performance regression detection** by comparing against baselines
- **Multiple reporting formats** (console, JSON, HTML)
- **Scalability testing** with datasets from 100 to 100K memories
- **Memory profiling** to track resource usage

## 🚀 Quick Start

### Run All Benchmarks

```bash
bun run bench
```

### Run Specific Suite

```bash
bun run bench:tools      # Tool benchmarks only
bun run bench:core       # Core operation benchmarks only
bun run bench:scale      # Scalability benchmarks only
```

### Generate Fixtures

```bash
bun run bench:fixtures   # Generate test data (100, 1K, 10K memories)
```

### Compare Against Baseline

```bash
bun run bench:compare    # Compare current results against baseline
```

## 📊 Performance Targets

| Operation | Target | Description |
|-----------|--------|-------------|
| `memory_store` | P99 < 10ms | Store operation latency |
| `memory_query` (100 memories) | P99 < 50ms | Query with small dataset |
| `memory_query` (10K memories) | P99 < 200ms | Query with large dataset |
| `embedding_generation` | Avg < 100ms | Vector embedding creation |
| `memory_decay` (10K memories) | Max < 5s | Decay operation on large dataset |
| **Overall P99** | < 500ms | End-to-end response time |

## 🏗️ Structure

```
benchmarks/
├── README.md                    # This file
├── runner.ts                    # Main benchmark runner
├── types.ts                     # Type definitions
├── reporters/                   # Report generators
│   ├── console.ts              # Console output with colors
│   ├── json.ts                 # JSON export
│   └── html.ts                 # HTML report with charts
├── suites/                      # Benchmark suites
│   ├── tools/                  # MCP tool benchmarks
│   │   ├── store.bench.ts      # memory_store benchmarks
│   │   ├── query.bench.ts      # memory_query benchmarks
│   │   ├── ingest.bench.ts     # memory_ingest benchmarks
│   │   ├── compress.bench.ts   # memory_compress benchmarks
│   │   ├── stats.bench.ts      # memory_stats benchmarks
│   │   ├── forget.bench.ts     # memory_forget benchmarks
│   │   ├── export.bench.ts     # memory_export benchmarks
│   │   └── import.bench.ts     # memory_import benchmarks
│   ├── core/                   # Core operation benchmarks
│   │   ├── database.bench.ts   # SQLite CRUD operations
│   │   ├── embeddings.bench.ts # Vector embedding generation
│   │   └── vector-search.bench.ts # Similarity search
│   └── scalability/            # Scalability tests
│       ├── small.bench.ts      # 100 memories
│       ├── medium.bench.ts     # 1K memories
│       └── large.bench.ts      # 10K memories
├── fixtures/                    # Test data
│   ├── generate.ts             # Fixture generator
│   ├── small.json              # 100 memories
│   ├── medium.json             # 1K memories
│   └── large.json              # 10K memories
└── results/                     # Benchmark results
    ├── baseline.json           # Baseline measurements
    ├── latest.json             # Latest run results
    └── history/                # Historical results
```

## 📈 Benchmark Suites

### 1. Tool Benchmarks (`suites/tools/`)

Benchmarks for MCP tool operations:

- **store.bench.ts**: Memory storage with various content sizes
- **query.bench.ts**: Query operations with different filters
- **ingest.bench.ts**: File/directory ingestion performance
- **compress.bench.ts**: Memory compression ratio and speed
- **stats.bench.ts**: Statistics calculation performance
- **forget.bench.ts**: Deletion operations
- **export.bench.ts**: Export to various formats
- **import.bench.ts**: Import from external sources

### 2. Core Benchmarks (`suites/core/`)

Benchmarks for internal operations:

- **database.bench.ts**: SQLite CRUD operations, indexing, transactions
- **embeddings.bench.ts**: Vector embedding generation (Full AI mode)
- **vector-search.bench.ts**: Similarity search performance

### 3. Scalability Benchmarks (`suites/scalability/`)

Performance tests with different dataset sizes:

- **small.bench.ts**: 100 memories (fast feedback)
- **medium.bench.ts**: 1,000 memories (typical usage)
- **large.bench.ts**: 10,000 memories (stress test)

## 🔧 Configuration

### Command-Line Options

```bash
bun run bench [options]

Options:
  --suite <name>        Run specific suite (tools, core, scalability)
  --iterations <n>      Number of iterations per benchmark (default: 100)
  --warmup <n>          Warmup iterations (default: 10)
  --compare <file>      Compare against baseline file
  --output <formats>    Output formats: console,json,html (default: console,json)
  --verbose             Enable verbose output
  --fail-on-regression  Exit with error on performance regression
```

### Programmatic Configuration

```typescript
import { BenchmarkRunner } from "./runner";

const runner = new BenchmarkRunner({
  iterations: 100,
  warmupIterations: 10,
  timeout: 30000,
  memoryProfiling: true,
  verbose: true,
  regressionThreshold: 15, // 15%
  outputFormat: ['console', 'json', 'html'],
  outputDir: 'benchmarks/results',
  saveHistory: true,
  failOnRegression: false,
});
```

## 📋 Understanding Results

### Console Report

```
📦 memory_store
   Benchmark                   Avg      P50      P95      P99   Status    Memory
────────────────────────────────────────────────────────────────────────────────
   store_small_content        2.34ms   2.10ms   4.50ms   8.20ms    ✅      12.3MB
   store_large_content        8.12ms   7.80ms  12.40ms  18.90ms    ⚠️      15.7MB
```

### Status Indicators

- ✅ **Pass**: Meets performance target
- ⚠️ **Warning**: Within 90% of target
- ❌ **Fail**: Exceeds performance target

### Metrics Explained

- **Avg**: Average response time
- **P50**: 50th percentile (median)
- **P95**: 95th percentile (95% of requests faster than this)
- **P99**: 99th percentile (target metric for most operations)
- **Memory**: Peak memory usage during operation

## 🎯 Performance Targets Validation

The benchmark suite automatically validates results against PRD targets:

```
🎯 Performance Targets:
  ✅ memory_store: actual 8.20ms vs target p99 < 10ms (margin: +18%)
  ✅ memory_query_100: actual 42.50ms vs target p99 < 50ms (margin: +15%)
  ❌ memory_query_10k: actual 250ms vs target p99 < 200ms (margin: -25%)
```

### Margin Calculation

- **Positive margin**: Performance is better than target (good)
- **Negative margin**: Performance is worse than target (bad)

## 📉 Regression Detection

### Setting a Baseline

```bash
# Run benchmarks and save as baseline
bun run bench
cp benchmarks/results/latest.json benchmarks/results/baseline.json
```

### Comparing Against Baseline

```bash
bun run bench --compare baseline.json
```

### Regression Threshold

Default: 15% (configurable)

Regressions are flagged when:
- Current P99 > Baseline P99 * 1.15

Severity levels:
- **Minor**: 15-30% slower
- **Major**: 30-50% slower
- **Critical**: >50% slower

## 🔨 Adding New Benchmarks

### 1. Create Benchmark File

```typescript
// benchmarks/suites/tools/my-tool.bench.ts

import type { BenchmarkSuite } from "../../types";
import { PERFORMANCE_TARGETS } from "../../types";

export const myToolBenchmarkSuite: BenchmarkSuite = {
  name: "my_tool",
  description: "Benchmarks for my custom tool",
  category: "tools",

  async setup() {
    // Initialize resources
  },

  async teardown() {
    // Cleanup resources
  },

  benchmarks: [
    {
      name: "my_operation",
      description: "Description of the operation",
      iterations: 100,
      warmupIterations: 10,
      target: PERFORMANCE_TARGETS.find(t => t.operation === "my_operation"),
      run: async () => {
        // Your benchmark code here
        await myTool.operation();
      },
    },
  ],
};

export default myToolBenchmarkSuite;
```

### 2. Register in Runner

```typescript
// benchmarks/suites/index.ts

import myToolBenchmarkSuite from "./tools/my-tool.bench";

export const allSuites = [
  // ... other suites
  myToolBenchmarkSuite,
];
```

### 3. Run Your Benchmark

```bash
bun run bench --suite my_tool
```

## 🧪 Test Data Generation

### Generate Fixtures

```bash
# Generate all fixture sizes
bun run bench:fixtures

# Generate specific size
tsx benchmarks/fixtures/generate.ts --size small
tsx benchmarks/fixtures/generate.ts --size medium
tsx benchmarks/fixtures/generate.ts --size large
```

### Fixture Sizes

| Size | Count | Topics | Use Case |
|------|-------|--------|----------|
| Small | 100 | 4 | Quick feedback, CI/CD |
| Medium | 1,000 | 6 | Typical usage testing |
| Large | 10,000 | 8 | Stress testing |
| XLarge | 100,000 | 10 | Extreme scale testing |

### Custom Fixtures

```typescript
import { generateFixture, saveFixture } from "./fixtures/generate";

// Generate custom size
const memories = generateFixture("large");
saveFixture(memories, "large", "./custom-fixtures");
```

## 📊 Reports

### JSON Report

```json
{
  "timestamp": "2025-01-19T10:30:00Z",
  "git": {
    "commit": "abc123",
    "branch": "main"
  },
  "results": [
    {
      "suite": "memory_store",
      "name": "store_small_content",
      "avgMs": 2.34,
      "p99Ms": 8.20,
      "status": "pass"
    }
  ],
  "summary": {
    "total": 24,
    "passed": 23,
    "failed": 1
  }
}
```

### HTML Report

Open `benchmarks/results/benchmark-report.html` in a browser for:
- Visual charts and graphs
- Interactive result exploration
- Performance distribution visualization
- Trend analysis

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Performance Benchmarks

on: [pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - run: bun install
      
      - run: bun run bench:fixtures
      
      - run: bun run bench --output=json
      
      - name: Check for regressions
        run: |
          if [ -f benchmarks/results/baseline.json ]; then
            bun run bench --compare baseline.json --fail-on-regression
          fi
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmarks/results/
```

### Baseline Management

```bash
# Update baseline after performance improvements
bun run bench
cp benchmarks/results/latest.json benchmarks/results/baseline.json
git add benchmarks/results/baseline.json
git commit -m "chore: update performance baseline"
```

## 🐛 Troubleshooting

### High Variance in Results

**Cause**: System load, garbage collection, thermal throttling

**Solutions**:
- Close background applications
- Run on dedicated machine
- Increase warmup iterations
- Use median instead of average

### Slow Benchmark Execution

**Cause**: Large datasets, many iterations

**Solutions**:
- Reduce iteration count: `--iterations 50`
- Run specific suite: `--suite tools`
- Use smaller fixtures

### Memory Leaks Detected

**Cause**: Unclosed resources, accumulating data

**Solutions**:
- Check teardown functions
- Monitor memory profiling data
- Use `--memory-profiling` flag

### Inconsistent Results Across Runs

**Cause**: JIT compilation, caching, system state

**Solutions**:
- Increase warmup iterations
- Run multiple times and average
- Clear system cache between runs

## 📚 Best Practices

### 1. Benchmark Isolation

- Each benchmark should be independent
- Clean up resources in teardown
- Don't share state between benchmarks

### 2. Realistic Data

- Use production-like data distributions
- Include edge cases (large content, complex metadata)
- Vary input sizes

### 3. Meaningful Metrics

- Focus on P99 for user experience
- Track memory usage for scalability
- Monitor for performance drift

### 4. Regular Execution

- Run on every PR (quick suite)
- Run full suite on merge to main
- Track historical trends

### 5. Baseline Management

- Update baseline after intentional improvements
- Document baseline changes in commits
- Tag baselines with release versions

## 📖 References

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [PRD Performance Requirements](../PRD.md#performance-targets)
- [QA Agent Testing Strategy](../.agents/agent/qa-agent.md)

## 🤝 Contributing

When adding new features:

1. **Add corresponding benchmarks** for new operations
2. **Define performance targets** in `types.ts`
3. **Update fixtures** if new data patterns needed
4. **Document expected performance** in code comments
5. **Run benchmarks** before submitting PR

## 📝 Notes

- Benchmarks run in isolation with fresh databases
- Memory profiling adds ~10% overhead
- First run may be slower (JIT compilation)
- Results vary by system specs (CPU, RAM, SSD)

---

**Last Updated**: 2025-01-19  
**Maintainer**: QA Agent