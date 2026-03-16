/**
 * Fixture Generator for Benchmarks
 *
 * Generates test data of various sizes for performance benchmarking.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { FixtureSize, FixtureConfig } from "../types";
import { FIXTURE_SIZES } from "../types";

/**
 * Generated memory fixture
 */
export interface GeneratedMemory {
  id: string;
  uri: string;
  topic: string;
  content_toon: string;
  content_raw: string;
  vector?: number[];
  bin_id: number;
  importance_score: number;
  status: "active" | "archived";
  access_count: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Content templates for different topics
 */
const CONTENT_TEMPLATES: Record<
  string,
  Array<{ template: string; keywords: string[] }>
> = {
  decision: [
    {
      template: "Decided to use {tech} for {purpose} because {reason}",
      keywords: ["decided", "chose", "selected"],
    },
    {
      template:
        "Architecture decision: {pattern} will be implemented for {benefit}",
      keywords: ["architecture", "pattern", "decision"],
    },
    {
      template: "Team agreed to {action} starting from {date}",
      keywords: ["agreed", "team", "decision"],
    },
    {
      template: "Selected {option} over {alternative} due to {factor}",
      keywords: ["selected", "chosen", "preference"],
    },
  ],
  bug: [
    {
      template: "Fixed {bug_type} in {component} caused by {root_cause}",
      keywords: ["bug", "fix", "issue"],
    },
    {
      template: "Resolved {severity} bug: {description}",
      keywords: ["resolved", "bug", "fixed"],
    },
    {
      template: "Issue in {module}: {problem} - fixed by {solution}",
      keywords: ["issue", "problem", "fix"],
    },
    {
      template: "Bug report: {bug_description} - Status: {status}",
      keywords: ["bug", "report", "issue"],
    },
  ],
  api: [
    {
      template: "API endpoint {method} {path} - {description}",
      keywords: ["api", "endpoint", "route"],
    },
    {
      template: "REST API: {endpoint} accepts {content_type}",
      keywords: ["rest", "api", "endpoint"],
    },
    {
      template: "GraphQL mutation {name} - {purpose}",
      keywords: ["graphql", "mutation", "api"],
    },
    {
      template: "API rate limit: {limit} requests per {window}",
      keywords: ["api", "rate", "limit"],
    },
  ],
  architecture: [
    {
      template: "System architecture uses {pattern} pattern for {reason}",
      keywords: ["architecture", "pattern", "system"],
    },
    {
      template: "Microservice {name} handles {responsibility}",
      keywords: ["microservice", "service", "architecture"],
    },
    {
      template: "Database schema: {table} with {columns} columns",
      keywords: ["database", "schema", "architecture"],
    },
    {
      template: "Infrastructure: {component} deployed on {platform}",
      keywords: ["infrastructure", "deployment", "architecture"],
    },
  ],
  general: [
    {
      template: "Team meeting on {date}: {topic} discussed",
      keywords: ["meeting", "team", "discussion"],
    },
    {
      template: "Note: {content}",
      keywords: ["note", "information", "general"],
    },
    {
      template: "Reminder: {reminder_text}",
      keywords: ["reminder", "todo", "general"],
    },
    {
      template: "General information about {subject}",
      keywords: ["information", "general", "note"],
    },
  ],
  testing: [
    {
      template: "Test suite for {component}: {test_count} tests",
      keywords: ["test", "testing", "suite"],
    },
    {
      template: "Unit test: {test_name} - {description}",
      keywords: ["unit", "test", "testing"],
    },
    {
      template: "Integration test covers {scenario}",
      keywords: ["integration", "test", "coverage"],
    },
    {
      template: "E2E test: {test_flow} flow validation",
      keywords: ["e2e", "test", "validation"],
    },
  ],
  performance: [
    {
      template:
        "Performance optimization: {optimization} improved {metric} by {percentage}%",
      keywords: ["performance", "optimization", "improvement"],
    },
    {
      template: "Benchmark results: {operation} takes {time}ms",
      keywords: ["benchmark", "performance", "metrics"],
    },
    {
      template: "Caching strategy: {cache_type} for {use_case}",
      keywords: ["caching", "performance", "optimization"],
    },
    {
      template: "Query optimization: {query} execution time reduced",
      keywords: ["query", "optimization", "performance"],
    },
  ],
  security: [
    {
      template: "Security patch: {vulnerability} fixed in {component}",
      keywords: ["security", "patch", "vulnerability"],
    },
    {
      template: "Authentication: {auth_method} implemented for {resource}",
      keywords: ["authentication", "security", "auth"],
    },
    {
      template: "Security audit: {finding} - Severity: {severity}",
      keywords: ["security", "audit", "vulnerability"],
    },
    {
      template: "Encryption: {algorithm} used for {data_type}",
      keywords: ["encryption", "security", "data"],
    },
  ],
  deployment: [
    {
      template: "Deployment: {service} v{version} deployed to {environment}",
      keywords: ["deployment", "release", "version"],
    },
    {
      template: "CI/CD pipeline: {stage} stage configuration",
      keywords: ["ci", "cd", "pipeline"],
    },
    {
      template: "Release notes v{version}: {changes}",
      keywords: ["release", "version", "deployment"],
    },
    {
      template: "Rollback: {service} rolled back to v{version}",
      keywords: ["rollback", "deployment", "version"],
    },
  ],
  monitoring: [
    {
      template: "Monitoring alert: {alert_name} - {condition}",
      keywords: ["monitoring", "alert", "observability"],
    },
    {
      template: "Metric: {metric_name} threshold set to {value}",
      keywords: ["metric", "monitoring", "threshold"],
    },
    {
      template: "Log aggregation: {log_type} logs centralized",
      keywords: ["logging", "monitoring", "aggregation"],
    },
    {
      template: "Dashboard: {dashboard_name} created for {purpose}",
      keywords: ["dashboard", "monitoring", "visualization"],
    },
  ],
};

/**
 * Random value generators
 */
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;
const randomElement = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date): Date => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
};

/**
 * Generate a random vector
 */
function generateVector(dimension: number = 384): number[] {
  const vector: number[] = [];
  for (let i = 0; i < dimension; i++) {
    vector.push(randomFloat(-1, 1));
  }

  // Normalize to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map((val) => val / (magnitude || 1));
}

/**
 * Generate random content based on topic
 */
function generateContent(
  topic: string,
  index: number,
): { toon: string; raw: string } {
  const templates = CONTENT_TEMPLATES[topic] || CONTENT_TEMPLATES.general;
  const selected = randomElement(templates);

  // Generate random values for placeholders
  const replacements: Record<string, string> = {
    "{tech}": randomElement([
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "Elasticsearch",
      "Kafka",
    ]),
    "{purpose}": randomElement([
      "data storage",
      "caching",
      "search",
      "messaging",
      "analytics",
    ]),
    "{reason}": randomElement([
      "better performance",
      "scalability",
      "cost efficiency",
      "reliability",
    ]),
    "{pattern}": randomElement([
      "MVC",
      "Microservices",
      "Event Sourcing",
      "CQRS",
      "Repository",
    ]),
    "{benefit}": randomElement([
      "improved scalability",
      "better maintainability",
      "faster development",
    ]),
    "{action}": randomElement([
      "implement new feature",
      "refactor codebase",
      "migrate database",
    ]),
    "{date}": new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    "{option}": randomElement([
      "Option A",
      "Option B",
      "React",
      "Vue",
      "Angular",
    ]),
    "{alternative}": randomElement([
      "Alternative X",
      "Alternative Y",
      "Svelte",
      "Solid",
    ]),
    "{factor}": randomElement([
      "performance",
      "developer experience",
      "community support",
    ]),
    "{bug_type}": randomElement([
      "null pointer",
      "race condition",
      "memory leak",
      "off-by-one",
    ]),
    "{component}": randomElement([
      "UserService",
      "PaymentModule",
      "AuthHandler",
      "DataProcessor",
    ]),
    "{root_cause}": randomElement([
      "invalid input",
      "missing validation",
      "concurrent access",
      "edge case",
    ]),
    "{severity}": randomElement(["Critical", "High", "Medium", "Low"]),
    "{description}": `Description for issue ${index}`,
    "{module}": randomElement([
      "Authentication",
      "Database",
      "API",
      "Frontend",
    ]),
    "{problem}": randomElement([
      "timeout",
      "connection failure",
      "validation error",
    ]),
    "{solution}": randomElement([
      "added retry logic",
      "fixed validation",
      "increased timeout",
    ]),
    "{bug_description}": `Bug ${index}: Unexpected behavior in production`,
    "{status}": randomElement(["Open", "In Progress", "Fixed", "Closed"]),
    "{method}": randomElement(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    "{path}": randomElement([
      "/api/users",
      "/api/products",
      "/api/orders",
      "/api/auth",
    ]),
    "{endpoint}": randomElement(["/users", "/products", "/orders", "/search"]),
    "{content_type}": randomElement(["JSON", "XML", "FormData", "binary"]),
    "{name}": randomElement([
      "createUser",
      "updateProduct",
      "deleteOrder",
      "searchItems",
    ]),
    "{limit}": String(randomInt(10, 1000)),
    "{window}": randomElement(["minute", "hour", "day"]),
    "{table}": randomElement(["users", "products", "orders", "sessions"]),
    "{columns}": String(randomInt(5, 20)),
    "{component_infra}": randomElement([
      "API Gateway",
      "Load Balancer",
      "Database Cluster",
    ]),
    "{platform}": randomElement(["AWS", "GCP", "Azure", "Kubernetes"]),
    "{topic_meeting}": randomElement([
      "Sprint Planning",
      "Architecture Review",
      "Bug Triage",
    ]),
    "{content}": `Meeting content ${index} - discussed various topics`,
    "{reminder_text}": `Remember to ${randomElement(["review PR", "update docs", "test feature"])}`,
    "{subject}": randomElement([
      "project status",
      "team updates",
      "technical decisions",
    ]),
    "{test_count}": String(randomInt(10, 100)),
    "{test_name}": randomElement([
      "shouldCreateUser",
      "shouldUpdateProduct",
      "shouldDeleteOrder",
    ]),
    "{scenario}": randomElement([
      "user registration",
      "payment processing",
      "data export",
    ]),
    "{test_flow}": randomElement(["checkout", "login", "search"]),
    "{optimization}": randomElement([
      "query indexing",
      "caching",
      "code refactoring",
    ]),
    "{metric}": randomElement(["response time", "throughput", "memory usage"]),
    "{percentage}": String(randomInt(10, 80)),
    "{operation}": randomElement(["insert", "query", "update", "delete"]),
    "{time}": String(randomInt(1, 500)),
    "{cache_type}": randomElement(["Redis", "in-memory", "CDN", "browser"]),
    "{use_case}": randomElement([
      "session storage",
      "API responses",
      "static assets",
    ]),
    "{query}": randomElement([
      "SELECT * FROM users",
      "complex join query",
      "aggregation pipeline",
    ]),
    "{vulnerability}": randomElement([
      "SQL injection",
      "XSS",
      "CSRF",
      "auth bypass",
    ]),
    "{auth_method}": randomElement([
      "JWT",
      "OAuth2",
      "API keys",
      "session-based",
    ]),
    "{resource}": randomElement(["user data", "admin panel", "API endpoints"]),
    "{finding}": randomElement([
      "Outdated dependency",
      "Weak password policy",
      "Missing HTTPS",
    ]),
    "{algorithm}": randomElement(["AES-256", "RSA", "bcrypt", "SHA-256"]),
    "{data_type}": randomElement([
      "passwords",
      "PII",
      "payment data",
      "API keys",
    ]),
    "{service}": randomElement([
      "api-service",
      "worker-service",
      "web-app",
      "admin-panel",
    ]),
    "{version}": `${randomInt(1, 5)}.${randomInt(0, 9)}.${randomInt(0, 99)}`,
    "{environment}": randomElement(["production", "staging", "development"]),
    "{stage}": randomElement(["build", "test", "deploy", "monitor"]),
    "{changes}": randomElement([
      "bug fixes",
      "new features",
      "performance improvements",
    ]),
    "{alert_name}": randomElement([
      "HighCPU",
      "MemoryUsage",
      "ErrorRate",
      "Latency",
    ]),
    "{condition}": randomElement(["> 80%", "> 90%", "< 100ms", "< 1%"]),
    "{metric_name}": randomElement([
      "cpu_usage",
      "memory_usage",
      "request_rate",
      "error_rate",
    ]),
    "{value}": randomElement(["80%", "100ms", "1000 req/s", "1%"]),
    "{log_type}": randomElement(["application", "access", "error", "audit"]),
    "{dashboard_name}": randomElement([
      "System Overview",
      "API Metrics",
      "Error Tracking",
    ]),
  };

  // Replace placeholders
  let raw = selected.template;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    raw = raw.replace(placeholder, replacement);
  }

  // Generate TOON format
  const toonParts: string[] = [];

  // Add topic
  toonParts.push(`topic:${topic}`);

  // Add keywords from template
  selected.keywords.forEach((keyword, i) => {
    if (i < 3) {
      toonParts.push(
        `${keyword}:${raw.toLowerCase().includes(keyword) ? "true" : "false"}`,
      );
    }
  });

  // Add index
  toonParts.push(`id:${index}`);

  // Add random bin
  toonParts.push(`bin:${randomInt(1, 10)}`);

  const toon = toonParts.join("|");

  return { toon, raw };
}

/**
 * Generate metadata
 */
function generateMetadata(topic: string): Record<string, unknown> {
  const baseMetadata: Record<string, unknown> = {
    source: randomElement(["user", "ai", "system"]),
    tags: [topic, randomElement(["important", "recent", "verified"])],
    version: randomInt(1, 5),
  };

  // Add topic-specific metadata
  switch (topic) {
    case "decision":
      baseMetadata.decision_date = new Date().toISOString().split("T")[0];
      baseMetadata.decided_by = randomElement(["team", "lead", "architect"]);
      baseMetadata.critical = Math.random() > 0.7;
      break;
    case "bug":
      baseMetadata.severity = randomElement([
        "critical",
        "high",
        "medium",
        "low",
      ]);
      baseMetadata.status = randomElement([
        "open",
        "in-progress",
        "fixed",
        "closed",
      ]);
      break;
    case "api":
      baseMetadata.endpoint = `/api/${randomElement(["users", "products", "orders"])}`;
      baseMetadata.method = randomElement(["GET", "POST", "PUT", "DELETE"]);
      break;
  }

  return baseMetadata;
}

/**
 * Generate a single memory
 */
function generateMemory(index: number, config: FixtureConfig): GeneratedMemory {
  const topic = randomElement(config.topics);
  const content = generateContent(topic, index);
  const importance = randomFloat(0.1, 1.0);
  const createdDate = randomDate(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    new Date(),
  );
  const isArchived = Math.random() < 0.1; // 10% archived

  const memory: GeneratedMemory = {
    id: `mem_bench_${String(index).padStart(6, "0")}_${Date.now()}`,
    uri: `memory://project/fact/mem_bench_${index}`,
    topic,
    content_toon: content.toon,
    content_raw: content.raw,
    bin_id: randomInt(1, 10),
    importance_score: Math.round(importance * 100) / 100,
    status: isArchived ? "archived" : "active",
    access_count: randomInt(0, 100),
    created_at: createdDate.toISOString(),
    updated_at: new Date(
      createdDate.getTime() + randomInt(0, 30) * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };

  // Add vector if configured
  if (config.includeVectors) {
    memory.vector = generateVector(384);
  }

  // Add metadata if configured
  if (config.includeMetadata) {
    memory.metadata = generateMetadata(topic);
  }

  // Add archived_at if archived
  if (isArchived) {
    memory.archived_at = new Date(
      createdDate.getTime() + randomInt(1, 60) * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  return memory;
}

/**
 * Generate fixture dataset
 */
export function generateFixture(size: FixtureSize): GeneratedMemory[] {
  const config = FIXTURE_SIZES[size];
  const memories: GeneratedMemory[] = [];

  console.log(
    `\n🔨 Generating ${size} fixture (${config.count} memories)...\n`,
  );

  for (let i = 0; i < config.count; i++) {
    memories.push(generateMemory(i, config));

    // Progress indicator
    if ((i + 1) % 100 === 0 || i === config.count - 1) {
      const progress = (((i + 1) / config.count) * 100).toFixed(1);
      process.stdout.write(
        `\r   Progress: ${progress}% (${i + 1}/${config.count})`,
      );
    }
  }

  console.log("\n\n✅ Fixture generation complete!\n");

  return memories;
}

/**
 * Save fixture to JSON file
 */
export function saveFixture(
  memories: GeneratedMemory[],
  size: FixtureSize,
  outputDir?: string,
): string {
  const dir = outputDir || join(__dirname);

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filename = `${size}.json`;
  const filepath = join(dir, filename);

  const data = {
    size,
    count: memories.length,
    generated_at: new Date().toISOString(),
    memories,
  };

  writeFileSync(filepath, JSON.stringify(data, null, 2));

  console.log(`💾 Saved ${size} fixture to ${filepath}`);

  return filepath;
}

/**
 * Generate and save all fixture sizes
 */
export async function generateAllFixtures(outputDir?: string): Promise<void> {
  const sizes: FixtureSize[] = ["small", "medium", "large"];

  console.log("\n🚀 Generating all benchmark fixtures...\n");
  console.log("=".repeat(60));

  for (const size of sizes) {
    const memories = generateFixture(size);
    saveFixture(memories, size, outputDir);
  }

  console.log("\n✅ All fixtures generated successfully!\n");
  console.log("=".repeat(60));
  console.log("\nFixture Summary:");
  console.log(`  - small.json:  ${FIXTURE_SIZES.small.count} memories`);
  console.log(`  - medium.json: ${FIXTURE_SIZES.medium.count} memories`);
  console.log(`  - large.json:  ${FIXTURE_SIZES.large.count} memories`);
  console.log(
    `  - (xlarge: ${FIXTURE_SIZES.xlarge.count} memories - optional, not generated by default)`,
  );
  console.log("");
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let size: FixtureSize | "all" = "all";
  let outputDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--size" && args[i + 1]) {
      size = args[i + 1] as FixtureSize | "all";
      i++;
    } else if (arg === "--output" && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Benchmark Fixture Generator

Usage: tsx generate.ts [options]

Options:
  --size <size>    Fixture size: small, medium, large, xlarge, or all (default: all)
  --output <dir>   Output directory (default: current directory)
  --help, -h       Show this help message

Sizes:
  small:  ${FIXTURE_SIZES.small.count} memories
  medium: ${FIXTURE_SIZES.medium.count} memories
  large:  ${FIXTURE_SIZES.large.count} memories
  xlarge: ${FIXTURE_SIZES.xlarge.count} memories (optional)
`);
      process.exit(0);
    }
  }

  try {
    if (size === "all") {
      await generateAllFixtures(outputDir);
    } else {
      const memories = generateFixture(size);
      saveFixture(memories, size, outputDir);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error generating fixtures:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { main as generateFixtures };
