/**
 * Test Fixtures: Sample Memories
 *
 * Provides sample memory data for testing across unit and integration tests.
 */

import type {
  ConversationMessage,
  MemoryFact,
  MemoryQueryResult,
  MemoryStoreInput,
} from "../../src/types/memory";

/**
 * Sample memory facts for testing
 */
export const SAMPLE_MEMORIES: MemoryFact[] = [
  {
    id: "mem_001",
    uri: "memory://project/fact/mem_001",
    topic: "decision",
    content_toon: "decision:use-postgres|reason:better-json|date:2025-01-18",
    content_raw:
      "Decided to use PostgreSQL instead of MongoDB for better JSON support and ACID compliance",
    bin_id: 1,
    importance_score: 0.9,
    status: "active",
    access_count: 5,
    created_at: new Date("2025-01-18T10:00:00Z"),
    updated_at: new Date("2025-01-18T10:00:00Z"),
    metadata: {
      decision_date: "2025-01-18",
      decided_by: "team-lead",
      critical: true,
    },
  },
  {
    id: "mem_002",
    uri: "memory://project/fact/mem_002",
    topic: "api",
    content_toon: "endpoint:/api/users|method:POST|auth:required",
    content_raw:
      "API endpoint for user registration requires authentication and validates email format",
    bin_id: 2,
    importance_score: 0.7,
    status: "active",
    access_count: 12,
    created_at: new Date("2025-01-17T14:30:00Z"),
    updated_at: new Date("2025-01-19T09:15:00Z"),
    metadata: {
      tags: ["api", "authentication", "users"],
      source: "user",
    },
  },
  {
    id: "mem_003",
    uri: "memory://project/fact/mem_003",
    topic: "bug",
    content_toon: "bug:null-pointer|location:UserService|status:fixed",
    content_raw: "Fixed null pointer exception in UserService when user profile is incomplete",
    bin_id: 3,
    importance_score: 0.8,
    status: "active",
    access_count: 8,
    created_at: new Date("2025-01-16T08:45:00Z"),
    updated_at: new Date("2025-01-16T16:20:00Z"),
    metadata: {
      source: "ai",
      tags: ["bug", "null-pointer", "UserService"],
    },
  },
  {
    id: "mem_004",
    uri: "memory://project/fact/mem_004",
    topic: "architecture",
    content_toon: "pattern:microservices|trade-off:complexity|benefit:scalability",
    content_raw:
      "Chose microservices architecture for better scalability, accepting increased complexity",
    bin_id: 1,
    importance_score: 0.85,
    status: "active",
    access_count: 3,
    created_at: new Date("2025-01-15T11:00:00Z"),
    updated_at: new Date("2025-01-15T11:00:00Z"),
    metadata: {
      decision_date: "2025-01-15",
      decided_by: "architect",
      critical: true,
    },
  },
  {
    id: "mem_005",
    uri: "memory://project/fact/mem_005",
    topic: "general",
    content_toon: "note:team-standup|time:9am|frequency:daily",
    content_raw: "Daily team standup meetings at 9am to discuss progress and blockers",
    bin_id: 4,
    importance_score: 0.4,
    status: "active",
    access_count: 20,
    created_at: new Date("2025-01-10T09:00:00Z"),
    updated_at: new Date("2025-01-19T09:00:00Z"),
    metadata: {
      source: "user",
    },
  },
  {
    id: "mem_006",
    uri: "memory://project/fact/mem_006",
    topic: "decision",
    content_toon: "decision:use-redis|purpose:caching|reason:performance",
    content_raw: "Decided to implement Redis for caching to improve API response times",
    bin_id: 1,
    importance_score: 0.75,
    status: "archived",
    access_count: 2,
    created_at: new Date("2024-12-01T10:00:00Z"),
    updated_at: new Date("2024-12-01T10:00:00Z"),
    archived_at: new Date("2025-01-10T00:00:00Z"),
    metadata: {
      decision_date: "2024-12-01",
      decided_by: "team",
    },
  },
];

/**
 * Sample memory store inputs for testing
 */
export const SAMPLE_STORE_INPUTS: MemoryStoreInput[] = [
  {
    content: "This is a test memory with default values",
  },
  {
    content: "Important decision to use TypeScript for type safety",
    topic: "decision",
    importance: 0.9,
  },
  {
    content: "API rate limit set to 100 requests per minute",
    topic: "api",
    importance: 0.6,
    metadata: {
      endpoint: "/api/*",
      limit: 100,
      window: "1m",
    },
  },
  {
    content: "Bug in authentication flow allows bypass",
    topic: "bug",
    importance: 1.0,
    metadata: {
      severity: "critical",
      status: "open",
    },
  },
];

/**
 * Sample conversations for auto-learn testing
 */
export const SAMPLE_CONVERSATIONS: Array<{
  id: string;
  messages: ConversationMessage[];
  shouldLearn: boolean;
  reason?: string;
}> = [
  {
    id: "conv_001",
    messages: [
      { role: "user", content: "Should we use PostgreSQL or MongoDB?" },
      {
        role: "assistant",
        content: "I decided to use PostgreSQL for better JSON support and ACID compliance.",
      },
    ],
    shouldLearn: true,
    reason: "Contains decision pattern",
  },
  {
    id: "conv_002",
    messages: [
      { role: "user", content: "What's the weather like?" },
      { role: "assistant", content: "I don't have access to real-time weather data." },
    ],
    shouldLearn: false,
    reason: "Casual conversation without valuable information",
  },
  {
    id: "conv_003",
    messages: [
      { role: "user", content: "The null pointer bug is in the UserService" },
      {
        role: "assistant",
        content:
          "I found the bug - it's caused by incomplete user profiles. I recommend adding a null check.",
      },
    ],
    shouldLearn: true,
    reason: "Contains bug information and solution",
  },
  {
    id: "conv_004",
    messages: [
      { role: "user", content: "Can you help me write a function?" },
      { role: "assistant", content: "Of course! What should the function do?" },
      { role: "user", content: "It should validate email addresses" },
      {
        role: "assistant",
        content: "Here's a function that validates email addresses using regex...",
      },
    ],
    shouldLearn: false,
    reason: "Generic coding task without project-specific context",
  },
  {
    id: "conv_005",
    messages: [
      { role: "user", content: "I'm changing the authentication library to Passport.js" },
      {
        role: "assistant",
        content: "Understood. Let's switch to Passport.js for better authentication strategies.",
      },
    ],
    shouldLearn: true,
    reason: "Contains technology choice decision",
  },
];

/**
 * Sample query results for testing
 */
export const SAMPLE_QUERY_RESULTS: MemoryQueryResult[] = [
  {
    id: "mem_001",
    content:
      "Decided to use PostgreSQL instead of MongoDB for better JSON support and ACID compliance",
    topic: "decision",
    score: 0.95,
    importance: 0.9,
    created_at: "2025-01-18T10:00:00Z",
    metadata: {
      decision_date: "2025-01-18",
      decided_by: "team-lead",
    },
  },
  {
    id: "mem_003",
    content: "Fixed null pointer exception in UserService when user profile is incomplete",
    topic: "bug",
    score: 0.88,
    importance: 0.8,
    created_at: "2025-01-16T08:45:00Z",
  },
  {
    id: "mem_004",
    content:
      "Chose microservices architecture for better scalability, accepting increased complexity",
    topic: "architecture",
    score: 0.82,
    importance: 0.85,
    created_at: "2025-01-15T11:00:00Z",
  },
];

/**
 * Generate a test memory with custom overrides
 */
export function createTestMemory(overrides: Partial<MemoryFact> = {}): MemoryFact {
  const id = overrides.id || `mem_test_${Date.now()}`;
  const timestamp = new Date();

  return {
    id,
    uri: `memory://project/fact/${id}`,
    topic: "test",
    content_toon: "test:data",
    content_raw: "Test memory content",
    bin_id: 1,
    importance_score: 0.5,
    status: "active",
    access_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

/**
 * Generate multiple test memories
 */
export function createTestMemories(
  count: number,
  overrides: Partial<MemoryFact> = {}
): MemoryFact[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMemory({
      id: `mem_test_${i}_${Date.now()}`,
      content_raw: `Test memory ${i + 1}`,
      ...overrides,
    })
  );
}

/**
 * Create a test store input
 */
export function createTestStoreInput(overrides: Partial<MemoryStoreInput> = {}): MemoryStoreInput {
  return {
    content: "Test memory content",
    topic: "test",
    importance: 0.5,
    ...overrides,
  };
}

/**
 * Sample TOON format strings for testing
 */
export const SAMPLE_TOON_STRINGS = {
  simple: "status:active",
  multiple: "decision:use-postgres|reason:better-json|date:2025-01-18",
  withNumbers: "count:42|progress:75|score:0.95",
  empty: "",
  singleField: "key:value",
  withSpaces: " key : value | another : test ",
};
