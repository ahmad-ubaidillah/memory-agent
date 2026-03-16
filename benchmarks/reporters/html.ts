/**
 * HTML Reporter
 *
 * Generates HTML reports with charts and tables for benchmark results.
 */

import type { BenchmarkReporter, BenchmarkReport } from "../types";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * HTML Reporter Implementation
 */
export class HTMLReporter implements BenchmarkReporter {
  name = "html";

  /**
   * Generate HTML report
   */
  generate(report: BenchmarkReport): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memory-Agent MCP Benchmark Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
        }

        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .metadata {
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
            margin-top: 20px;
            font-size: 0.9em;
            opacity: 0.9;
        }

        .metadata-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .card.success {
            border-left: 4px solid #10b981;
        }

        .card.error {
            border-left: 4px solid #ef4444;
        }

        .card.warning {
            border-left: 4px solid #f59e0b;
        }

        .card.info {
            border-left: 4px solid #3b82f6;
        }

        .card-title {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }

        .card-value {
            font-size: 2.5em;
            font-weight: bold;
        }

        .card.success .card-value {
            color: #10b981;
        }

        .card.error .card-value {
            color: #ef4444;
        }

        .card.warning .card-value {
            color: #f59e0b;
        }

        .card.info .card-value {
            color: #3b82f6;
        }

        .section {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        h2 {
            font-size: 1.5em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }

        .targets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }

        .target-item {
            padding: 15px;
            border-radius: 8px;
            background: #f9fafb;
            border-left: 3px solid;
        }

        .target-item.pass {
            border-color: #10b981;
            background: #f0fdf4;
        }

        .target-item.fail {
            border-color: #ef4444;
            background: #fef2f2;
        }

        .target-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .target-name {
            font-weight: 600;
        }

        .target-status {
            font-size: 1.5em;
        }

        .target-details {
            display: flex;
            gap: 20px;
            font-size: 0.9em;
            color: #666;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        thead {
            background: #f9fafb;
        }

        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }

        th {
            font-weight: 600;
            color: #374151;
        }

        tbody tr:hover {
            background: #f9fafb;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
        }

        .status-badge.pass {
            background: #d1fae5;
            color: #065f46;
        }

        .status-badge.fail {
            background: #fee2e2;
            color: #991b1b;
        }

        .status-badge.warning {
            background: #fef3c7;
            color: #92400e;
        }

        .metric-good {
            color: #10b981;
            font-weight: 500;
        }

        .metric-warning {
            color: #f59e0b;
            font-weight: 500;
        }

        .metric-bad {
            color: #ef4444;
            font-weight: 500;
        }

        .chart-container {
            position: relative;
            height: 400px;
            margin-top: 20px;
        }

        .env-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .env-item {
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
        }

        .env-label {
            font-size: 0.85em;
            color: #666;
            margin-bottom: 5px;
        }

        .env-value {
            font-weight: 600;
            font-size: 1.1em;
        }

        .suite-group {
            margin-bottom: 30px;
        }

        .suite-title {
            font-size: 1.2em;
            font-weight: 600;
            margin-bottom: 15px;
            padding: 10px;
            background: #f3f4f6;
            border-radius: 6px;
        }

        .progress-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #3b82f6);
            transition: width 0.3s ease;
        }

        footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            h1 {
                font-size: 1.8em;
            }

            .metadata {
                flex-direction: column;
                gap: 10px;
            }

            table {
                font-size: 0.9em;
            }

            th, td {
                padding: 8px 10px;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>🚀 Memory-Agent MCP Benchmark Report</h1>
            <div class="metadata">
                <div class="metadata-item">
                    <span>📅</span>
                    <span>${new Date(report.timestamp).toLocaleString()}</span>
                </div>
                <div class="metadata-item">
                    <span>🌿</span>
                    <span>Branch: ${report.git.branch}</span>
                </div>
                <div class="metadata-item">
                    <span>📝</span>
                    <span>Commit: ${report.git.commit.substring(0, 7)}</span>
                </div>
                <div class="metadata-item">
                    <span>⏱️</span>
                    <span>Duration: ${(report.summary.totalDurationMs / 1000).toFixed(2)}s</span>
                </div>
            </div>
        </div>
    </header>

    <div class="container">
        <!-- Summary Cards -->
        <div class="summary-cards">
            <div class="card success">
                <div class="card-title">✅ Passed</div>
                <div class="card-value">${report.summary.passed}</div>
            </div>
            <div class="card error">
                <div class="card-title">❌ Failed</div>
                <div class="card-value">${report.summary.failed}</div>
            </div>
            <div class="card warning">
                <div class="card-title">⚠️ Warnings</div>
                <div class="card-value">${report.summary.warnings}</div>
            </div>
            <div class="card info">
                <div class="card-title">📊 Total Benchmarks</div>
                <div class="card-value">${report.summary.total}</div>
            </div>
        </div>

        ${report.summary.regressions > 0 ? `
        <div class="card error" style="margin-bottom: 30px;">
            <div class="card-title">📉 Performance Regressions Detected</div>
            <div class="card-value">${report.summary.regressions}</div>
        </div>
        ` : ''}

        <!-- Performance Targets -->
        ${report.targets.length > 0 ? `
        <div class="section">
            <h2>🎯 Performance Targets</h2>
            <div class="targets-grid">
                ${report.targets.map(target => `
                    <div class="target-item ${target.status}">
                        <div class="target-header">
                            <span class="target-name">${target.operation}</span>
                            <span class="target-status">${target.status === 'pass' ? '✅' : '❌'}</span>
                        </div>
                        <div class="target-details">
                            <span>Target: ${target.target}</span>
                            <span>Actual: ${target.actual}ms</span>
                            <span>Margin: ${target.margin > 0 ? '+' : ''}${target.margin}%</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Environment Information -->
        <div class="section">
            <h2>🖥️ Environment</h2>
            <div class="env-grid">
                <div class="env-item">
                    <div class="env-label">Node Version</div>
                    <div class="env-value">${report.environment.node}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Bun Version</div>
                    <div class="env-value">${report.environment.bun}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Platform</div>
                    <div class="env-value">${report.environment.platform} (${report.environment.arch})</div>
                </div>
                <div class="env-item">
                    <div class="env-label">CPU Cores</div>
                    <div class="env-value">${report.environment.cpus}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Memory (MB)</div>
                    <div class="env-value">${report.environment.memory}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Git Branch</div>
                    <div class="env-value">${report.git.branch}</div>
                </div>
            </div>
        </div>

        <!-- Detailed Results -->
        <div class="section">
            <h2>📋 Detailed Results</h2>
            ${this.groupBySuite(report.results).map(suiteGroup => `
                <div class="suite-group">
                    <div class="suite-title">📦 ${suiteGroup.suite}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Benchmark</th>
                                <th>Status</th>
                                <th>Avg (ms)</th>
                                <th>P50 (ms)</th>
                                <th>P95 (ms)</th>
                                <th>P99 (ms)</th>
                                <th>Min (ms)</th>
                                <th>Max (ms)</th>
                                <th>Memory (MB)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${suiteGroup.results.map(result => `
                                <tr>
                                    <td>
                                        <strong>${result.name}</strong>
                                        ${result.description ? `<br><small style="color: #666;">${result.description}</small>` : ''}
                                    </td>
                                    <td>
                                        <span class="status-badge ${result.status}">${result.status}</span>
                                    </td>
                                    <td class="${this.getMetricClass(result.avgMs, result.target)}">${result.avgMs.toFixed(2)}</td>
                                    <td class="${this.getMetricClass(result.p50Ms, result.target)}">${result.p50Ms.toFixed(2)}</td>
                                    <td class="${this.getMetricClass(result.p95Ms, result.target)}">${result.p95Ms.toFixed(2)}</td>
                                    <td class="${this.getMetricClass(result.p99Ms, result.target)}">${result.p99Ms.toFixed(2)}</td>
                                    <td>${result.minMs.toFixed(2)}</td>
                                    <td>${result.maxMs.toFixed(2)}</td>
                                    <td>${result.memoryPeakMB.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        <!-- Performance Distribution Chart -->
        <div class="section">
            <h2>📊 Performance Distribution</h2>
            <div class="chart-container">
                <svg width="100%" height="100%" id="distributionChart"></svg>
            </div>
        </div>
    </div>

    <footer>
        <p>Generated by Memory-Agent MCP Benchmark Suite</p>
        <p>${report.timestamp}</p>
    </footer>

    <script>
        // Simple SVG chart rendering
        const results = ${JSON.stringify(report.results)};

        function renderDistributionChart() {
            const svg = document.getElementById('distributionChart');
            const width = svg.clientWidth;
            const height = svg.clientHeight;
            const padding = 50;

            // Clear existing content
            svg.innerHTML = '';

            // Get p99 values for distribution
            const p99Values = results.map(r => r.p99Ms).sort((a, b) => a - b);
            const maxP99 = Math.max(...p99Values);
            const minP99 = Math.min(...p99Values);

            // Create bars
            const barWidth = (width - padding * 2) / results.length - 2;

            p99Values.forEach((value, index) => {
                const barHeight = (value / maxP99) * (height - padding * 2);
                const x = padding + index * (barWidth + 2);
                const y = height - padding - barHeight;

                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', barWidth);
                rect.setAttribute('height', barHeight);
                rect.setAttribute('fill', value < 100 ? '#10b981' : value < 200 ? '#f59e0b' : '#ef4444');
                rect.setAttribute('rx', '2');

                // Add tooltip
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                title.textContent = \`\${results[index].name}: \${value.toFixed(2)}ms\`;
                rect.appendChild(title);

                svg.appendChild(rect);
            });

            // Add axes
            const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            xAxis.setAttribute('x1', padding);
            xAxis.setAttribute('y1', height - padding);
            xAxis.setAttribute('x2', width - padding);
            xAxis.setAttribute('y2', height - padding);
            xAxis.setAttribute('stroke', '#e5e7eb');
            xAxis.setAttribute('stroke-width', '2');
            svg.appendChild(xAxis);

            const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            yAxis.setAttribute('x1', padding);
            yAxis.setAttribute('y1', padding);
            yAxis.setAttribute('x2', padding);
            yAxis.setAttribute('y2', height - padding);
            yAxis.setAttribute('stroke', '#e5e7eb');
            yAxis.setAttribute('stroke-width', '2');
            svg.appendChild(yAxis);

            // Add labels
            const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            yLabel.setAttribute('x', padding - 10);
            yLabel.setAttribute('y', padding);
            yLabel.setAttribute('text-anchor', 'end');
            yLabel.setAttribute('fill', '#666');
            yLabel.textContent = 'P99 (ms)';
            svg.appendChild(yLabel);

            const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            xLabel.setAttribute('x', width / 2);
            xLabel.setAttribute('y', height - 10);
            xLabel.setAttribute('text-anchor', 'middle');
            xLabel.setAttribute('fill', '#666');
            xLabel.textContent = 'Benchmarks';
            svg.appendChild(xLabel);
        }

        // Render chart on load and resize
        window.addEventListener('load', renderDistributionChart);
        window.addEventListener('resize', renderDistributionChart);
    </script>
</body>
</html>`;
  }

  /**
   * Save HTML report to file
   */
  async save(report: BenchmarkReport, path: string): Promise<void> {
    const html = this.generate(report);
    writeFileSync(join(path, 'benchmark-report.html'), html);
  }

  /**
   * Group results by suite
   */
  private groupBySuite(results: BenchmarkReport['results']): Array<{
    suite: string;
    results: BenchmarkReport['results'];
  }> {
    const groups = new Map<string, BenchmarkReport['results']>();

    for (const result of results) {
      if (!groups.has(result.suite)) {
        groups.set(result.suite, []);
      }
      groups.get(result.suite)!.push(result);
    }

    return Array.from(groups.entries()).map(([suite, results]) => ({
      suite,
      results,
    }));
  }

  /**
   * Get CSS class for metric based on value
   */
  private getMetricClass(value: number, target?: { value: number }): string {
    if (!target) {
      if (value < 50) return 'metric-good';
      if (value < 200) return 'metric-warning';
      return 'metric-bad';
    }

    if (value <= target.value * 0.8) return 'metric-good';
    if (value <= target.value) return 'metric-warning';
    return 'metric-bad';
  }
}

export const htmlReporter = new HTMLReporter();
