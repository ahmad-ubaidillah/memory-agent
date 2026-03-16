/**
 * Core memory types for Memory-Agent MCP Server
 *
 * This module defines all types related to memory storage, retrieval, and management.
 */

/**
 * Memory entry stored in the database
 */
export interface MemoryFact {
  /** Unique identifier (e.g., "mem_abc123") */
  id: string;

  /** URI for resource access (e.g., "memory://project/fact/mem_abc123") */
  uri: string;

  /** Topic category (e.g., "decision", "api", "bug", "architecture") */
  topic: string;

  /** TOON format: "key:val|key:val" - distilled essence of the memory */
  content_toon: string;

  /** Original raw content */
  content_raw: string;

  /** 384-dimensional embedding vector (optional in Lite Mode) */
  vector?: number[] | undefined;

  /** Partition ID for fast retrieval */
  bin_id: number;

  /** Importance score: 0.0 (low) to 1.0 (high) */
  importance_score: number;

  /** Current status of the memory */
  status: MemoryStatus;

  /** Number of times this memory has been accessed */
  access_count: number;

  /** When the memory was created */
  created_at: Date;

  /** When the memory was last updated */
  updated_at: Date;

  /** When the memory was archived (if applicable) */
  archived_at?: Date | undefined;

  /** Optional metadata */
  metadata?: MemoryMetadata | undefined;
}

/**
 * Memory status lifecycle
 */
export type MemoryStatus = "active" | "archived" | "pending";

/**
 * Optional metadata for memories
 */
export interface MemoryMetadata {
  /** Date when a decision was made */
  decision_date?: string;

  /** Who made the decision */
  decided_by?: string;

  /** Project identifier */
  project?: string;

  /** Whether this is a critical memory */
  critical?: boolean;

  /** Tags for categorization */
  tags?: string[];

  /** Source of the memory */
  source?: "user" | "ai" | "ingested";

  /** Any additional custom fields */
  [key: string]: unknown;
}

/**
 * Query result with relevance scoring
 */
export interface MemoryQueryResult {
  /** Memory ID */
  id: string;

  /** Memory content (raw or TOON depending on mode) */
  content: string;

  /** Topic category */
  topic: string;

  /** Relevance score: 0.0 - 1.0 */
  score: number;

  /** Importance score: 0.0 - 1.0 */
  importance: number;

  /** When the memory was created */
  created_at: string;

  /** Optional metadata */
  metadata?: MemoryMetadata;
}

/**
 * Tool input: Store a new memory
 */
export interface MemoryStoreInput {
  /** Memory content to store */
  content: string;

  /** Topic category (default: "general") */
  topic?: string;

  /** Importance score 0.0-1.0 (default: 0.5) */
  importance?: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool input: Query memories
 */
export interface MemoryQueryInput {
  /** Search query */
  query: string;

  /** Maximum number of results (default: 10) */
  limit?: number;

  /** Filter by topic */
  topic?: string;

  /** Minimum importance filter */
  min_importance?: number;
}

/**
 * Tool input: Ingest files
 */
export interface MemoryIngestInput {
  /** File or directory path */
  path: string;

  /** Recursively ingest directories */
  recursive?: boolean;

  /** File types to include (e.g., [".md", ".txt"]) */
  file_types?: string[];
}

/**
 * Tool input: Compress old memories
 */
export interface MemoryCompressInput {
  /** Compress memories older than N days (default: 30) */
  older_than_days?: number;

  /** Consolidate similar memories (default: false) */
  consolidate?: boolean;
}

/**
 * Tool input: Forget memories
 */
export interface MemoryForgetInput {
  /** Specific memory ID to forget */
  memory_id?: string;

  /** Forget all memories in a topic */
  topic?: string;

  /** Forget memories older than N days */
  older_than_days?: number;
}

/**
 * Tool input: Export memories
 */
export interface MemoryExportInput {
  /** Export format (default: "json") */
  format?: "json" | "markdown" | "csv";

  /** Filter by topic */
  topic?: string;

  /** Include archived memories */
  include_archived?: boolean;
}

/**
 * Tool input: Import memories
 */
export interface MemoryImportInput {
  /** Path to import file */
  path: string;

  /** Merge strategy (default: "skip") */
  merge_strategy?: "skip" | "overwrite" | "merge";
}

/**
 * Interceptor types
 */

/**
 * Pre-processor result: Enhanced prompt with context
 */
export interface EnhancedPrompt {
  /** Original prompt enhanced with relevant memories */
  enhanced_prompt: string;

  /** Whether relevant context was found */
  context_found: boolean;

  /** Memory IDs used for enhancement */
  memories_used: string[];
}

/**
 * Post-processor result: Auto-learned memory
 */
export interface AutoLearnResult {
  /** Whether a memory was stored */
  stored: boolean;

  /** Reason for decision (if not stored) */
  reason?: string;

  /** Memory ID (if stored) */
  memory_id?: string;

  /** Content that was stored (if stored) */
  content?: string;
}

/**
 * Decay configuration
 */
export interface DecayConfig {
  /** Decay factor applied to importance (default: 0.95) */
  decay_factor: number;

  /** Archive memories below this threshold (default: 0.2) */
  archive_threshold: number;

  /** Delete memories below this threshold (default: 0.05) */
  delete_threshold: number;

  /** Delete garbage memories older than N days (default: 30) */
  garbage_age_days: number;
}

/**
 * Conversation message for auto-learn
 */
export interface ConversationMessage {
  /** Message role */
  role: "user" | "assistant";

  /** Message content */
  content: string;
}

/**
 * Review action types
 */
export type ReviewAction = "list" | "edit" | "archive" | "delete" | "restore";

/**
 * Tool input: Review memories
 */
export interface MemoryReviewInput {
  /** Action to perform */
  action: ReviewAction;

  /** Specific memory ID (for edit/delete/restore) */
  memory_id?: string;

  /** Filters for listing */
  filters?: {
    topic?: string;
    min_importance?: number;
    max_importance?: number;
    status?: MemoryStatus;
    older_than_days?: number;
  };

  /** Edits to apply (for edit action) */
  edits?: {
    content?: string;
    topic?: string;
    importance?: number;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Statistics about memory store
 */
export interface MemoryStats {
  /** Total number of memories */
  total_memories: number;

  /** Number of active memories */
  active_memories: number;

  /** Number of archived memories */
  archived_memories: number;

  /** Memories by topic */
  topics: Record<string, number>;

  /** Storage size in MB */
  storage_size_mb: number;

  /** Oldest memory date */
  oldest_memory: string;

  /** Health score (0-100) */
  health_score: number;

  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * TOON format utilities
 */
export type TOONPair = [string, string];

/**
 * Database row type for memory_facts table
 */
export interface MemoryRow {
  id: string;
  uri: string;
  topic: string;
  content_toon: string;
  content_raw: string;
  vector: Buffer | null;
  bin_id: number;
  importance_score: number;
  status: string;
  access_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  metadata: string | null;
}
