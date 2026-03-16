# Memory-Agent MCP Architecture

## System Overview

Memory-Agent MCP is a Model Context Protocol (MCP) server that provides persistent, intelligent memory capabilities to AI coding assistants. It operates as a middleware layer between MCP clients (Claude Desktop, Cursor, Windsurf, etc.) and a local SQLite database, with optional AI-powered semantic search capabilities.

### Core Design Principles

1. **Universal Compatibility**: Works with any MCP-compliant client
2. **Hybrid Operation**: Functions with or without AI models (Full AI / Lite Mode)
3. **Zero Configuration**: Minimal setup required, sensible defaults
4. **Performance First**: Sub-100ms response times for most operations
5. **Privacy Focused**: All data stored locally, no external services required

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client Layer                         │
│  (Claude Desktop, Cursor, Windsurf, VS Code, Custom Clients)   │
└────────────────────────┬────────────────────────────────────────┘
                         │ MCP Protocol (JSON-RPC)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Memory-Agent MCP Server                      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   MCP Tools  │  │ Interceptors │  │    Core      │         │
│  │  (12 tools)  │  │  (Pre/Post)  │  │   Logic      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Embedder   │  │   Distiller  │  │    Utils     │         │
│  │  (Optional)  │  │              │  │  (Logger,    │         │
│  │              │  │              │  │   TOON, ID)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SQLite Database (.memory/memory.db)          │  │
│  │                                                            │  │
│  │  • memory_facts table (core storage)                      │  │
│  │  • Vector embeddings (Full AI Mode)                       │  │
│  │  • Metadata and indexes                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. MCP Server Layer (`src/server.ts`, `src/index.ts`)

**Responsibility**: Handles MCP protocol communication

**Components**:
- **Protocol Handler**: Manages JSON-RPC message parsing and routing
- **Tool Registry**: Registers and exposes 12 MCP tools
- **Resource Handler**: Manages MCP resources (if any)
- **Session Manager**: Handles client connections and lifecycle

**Key Features**:
- Stdio-based communication (MCP standard)
- Automatic tool discovery and registration
- Error handling and response formatting
- Graceful shutdown handling

---

### 2. MCP Tools Layer (`src/tools/`)

**Responsibility**: Implements the 12 MCP tools that clients can call

#### Core Tools

| Tool | File | Purpose |
|------|------|---------|
| `memory_store` | `store.ts` | Store new memories with TOON format |
| `memory_query` | `query.ts` | Query memories (semantic or keyword) |
| `memory_forget` | `forget.ts` | Delete specific memories |
| `memory_stats` | `stats.ts` | Get memory statistics |

#### Interceptor Tools

| Tool | File | Purpose |
|------|------|---------|
| `memory_enhance_prompt` | `enhance-prompt.ts` | Pre-process prompts with context |
| `memory_auto_learn` | `auto-learn.ts` | Auto-extract learnings from conversations |
| `memory_decay` | `decay.ts` | Apply time-based importance decay |
| `memory_review` | `review.ts` | Review and manage memories |

#### Utility Tools

| Tool | File | Purpose |
|------|------|---------|
| `memory_ingest` | `ingest.ts` | Ingest files into memory |
| `memory_compress` | `compress.ts` | Compress old memories |
| `memory_export` | `export.ts` | Export memories to JSON |
| `memory_import` | `import.ts` | Import memories from JSON |

**Tool Implementation Pattern**:
```typescript
export async function memoryStore(input: unknown): Promise<MCPToolResponse> {
  // 1. Validate input with Zod schema
  const parsed = StoreSchema.safeParse(input);
  if (!parsed.success) {
    return createErrorResponse(parsed.error);
  }
  
  // 2. Process with core logic
  const result = await core.store(parsed.data);
  
  // 3. Return formatted response
  return createSuccessResponse(result);
}
```

---

### 3. Interceptor Layer (`src/interceptor/`)

**Responsibility**: Pre/post-process conversations for automatic memory integration

#### Pre-Processor (`pre-processor.ts`)

**Purpose**: Enhance user prompts with relevant memory context

**Flow**:
```
User Message → Pattern Detection → Memory Query → Context Injection → Enhanced Prompt
```

**Components**:
- **Pattern Detector**: Identifies ambiguous queries needing context
- **Query Builder**: Constructs relevant search queries
- **Context Injector**: Adds memory context to prompts

**Example**:
```
Input:  "fix the bug"
Query:  memory_query("recent bugs issues errors")
Output: "[CONTEXT: Recent bug in auth.ts JWT timeout...]\nfix the bug"
```

#### Post-Processor (`post-processor.ts`)

**Purpose**: Extract and store learnings from AI responses

**Flow**:
```
AI Response → Pattern Detection → Learning Extraction → Memory Storage
```

**Components**:
- **Decision Detector**: Identifies decisions, conclusions, learnings
- **Content Extractor**: Extracts structured information
- **Importance Scorer**: Assigns relevance scores

**Detected Patterns**:
- "I decided to..." → Decision memory
- "The bug was caused by..." → Bug memory
- "We should use..." → Recommendation memory
- "Note that..." → Important information

#### Pattern Detector (`pattern-detector.ts`)

**Purpose**: Identify patterns requiring memory operations

**Pattern Types**:
```typescript
enum PatternType {
  AMBIGUOUS_QUERY = "ambiguous_query",    // Needs context
  DECISION_MADE = "decision_made",        // Store decision
  BUG_IDENTIFIED = "bug_identified",      // Store bug
  PATTERN_FOUND = "pattern_found",        // Store pattern
  LEARNING = "learning"                   // Store learning
}
```

---

### 4. Core Logic Layer (`src/core/`)

**Responsibility**: Business logic for memory operations

#### Memory Store (`memory-store.ts`)

**Functions**:
- `store()`: Store new memory with validation
- `validate()`: Validate TOON format and constraints
- `score()`: Calculate initial importance score
- `index()`: Update search indexes

#### Embedder (`embedder.ts`) - *Full AI Mode Only*

**Purpose**: Generate vector embeddings for semantic search

**Implementation**:
- Uses `node-llama-cpp` or `@xenova/transformers`
- Generates embeddings locally (no API calls)
- Stores vectors in SQLite with memory_facts

**Models**:
- Default: all-MiniLM-L6-v2 (fast, efficient)
- Alternative: Custom models supported

#### Distiller (`distiller.ts`)

**Purpose**: Compress and summarize old memories

**Functions**:
- `distill()`: Compress multiple memories into summary
- `merge()`: Merge similar memories
- `archive()`: Move low-importance memories to archive

---

### 5. Data Layer

#### Database Schema

**Table: `memory_facts`**

```sql
CREATE TABLE memory_facts (
  id TEXT PRIMARY KEY,                    -- UUID
  topic TEXT NOT NULL,                    -- Category
  content_toon TEXT NOT NULL,             -- TOON format content
  embedding BLOB,                         -- Vector embedding (optional)
  importance_score REAL DEFAULT 0.5,      -- 0.0 to 1.0
  access_count INTEGER DEFAULT 0,         -- Times retrieved
  created_at TEXT NOT NULL,               -- ISO timestamp
  updated_at TEXT NOT NULL,               -- ISO timestamp
  last_accessed_at TEXT,                  -- Last retrieval time
  metadata TEXT,                          -- JSON metadata
  
  -- Indexes
  INDEX idx_topic (topic),
  INDEX idx_importance (importance_score),
  INDEX idx_created (created_at),
  INDEX idx_last_accessed (last_accessed_at)
);
```

**Field Descriptions**:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | TEXT | Unique identifier (UUID) |
| `topic` | TEXT | Category (decision, bug, pattern, etc.) |
| `content_toon` | TEXT | Content in TOON format |
| `embedding` | BLOB | Vector embedding (Full AI Mode) |
| `importance_score` | REAL | Relevance score (0.0-1.0) |
| `access_count` | INTEGER | Number of times retrieved |
| `created_at` | TEXT | Creation timestamp |
| `updated_at` | TEXT | Last modification timestamp |
| `last_accessed_at` | TEXT | Last retrieval timestamp |
| `metadata` | TEXT | Additional JSON metadata |

#### Database Operations

**Storage**:
```sql
INSERT INTO memory_facts (id, topic, content_toon, importance_score, ...)
VALUES (?, ?, ?, ?, ...);
```

**Query (Keyword Mode)**:
```sql
SELECT * FROM memory_facts
WHERE content_toon LIKE ? OR topic LIKE ?
ORDER BY importance_score DESC
LIMIT ?;
```

**Query (Semantic Mode)**:
```sql
SELECT * FROM memory_facts
WHERE vector_search(embedding, ?) > ?
ORDER BY similarity DESC
LIMIT ?;
```

---

## Memory Lifecycle

### 1. Creation Phase

```
User/AI Decision → TOON Formatting → Validation → Importance Scoring → Storage
```

**Steps**:
1. **Input**: Raw content from user or AI
2. **Formatting**: Convert to TOON format (key:value|key:value)
3. **Validation**: Check format, length, required fields
4. **Scoring**: Calculate initial importance (0.0-1.0)
5. **Embedding**: Generate vector (Full AI Mode only)
6. **Storage**: Insert into database with metadata

### 2. Active Phase

```
Query → Search → Retrieval → Access Update → Return
```

**Steps**:
1. **Query**: User/AI queries for context
2. **Search**: Keyword or semantic search
3. **Retrieval**: Get matching memories
4. **Access Update**: Increment access_count, update last_accessed_at
5. **Return**: Return results to caller

### 3. Decay Phase

```
Time Passage → Decay Calculation → Score Reduction → Archive/Delete
```

**Decay Formula**:
```typescript
newScore = currentScore * Math.pow(decayFactor, daysSinceLastAccess)
```

**Parameters**:
- `decayFactor`: 0.995 (configurable)
- `threshold`: 0.1 (memories below this are candidates for deletion)

### 4. Archive Phase

```
Low Importance → Review → Archive or Delete
```

**Criteria for Archival**:
- Importance score < 0.1
- Not accessed in 30+ days
- Marked as "review needed"

---

## Hybrid Mode Architecture

Memory-Agent MCP operates in two modes:

### Full AI Mode

**Requirements**:
- Embedding model downloaded (~500MB)
- More RAM and CPU resources
- Optional: GPU for faster embeddings

**Features**:
- ✅ Semantic search (concept-based)
- ✅ Vector embeddings
- ✅ Similarity matching
- ✅ Context-aware retrieval
- ✅ Advanced pattern detection

**Performance**:
- Storage: 50-150ms (includes embedding generation)
- Query: 20-100ms (vector similarity search)
- Memory: 200-500MB (model loaded)

**Use Cases**:
- Large codebases with lots of context
- Complex projects with many decisions
- Teams with extensive memory history

### Lite Mode

**Requirements**:
- No external dependencies
- Minimal resources
- Fast startup

**Features**:
- ✅ Keyword-based search
- ✅ Fast performance
- ✅ Zero configuration
- ❌ No semantic understanding
- ❌ No embeddings

**Performance**:
- Storage: 5-20ms (no embedding generation)
- Query: 5-30ms (keyword search)
- Memory: 20-50MB (minimal overhead)

**Use Cases**:
- Quick prototypes
- Small projects
- Resource-constrained environments
- Simple use cases

### Mode Selection Logic

```typescript
function determineMode(): "full" | "lite" {
  // 1. Check environment variable
  if (process.env.MEMORY_MODE === "lite") return "lite";
  if (process.env.MEMORY_MODE === "full") return "full";
  
  // 2. Check if embedding model available
  if (embeddingModelExists()) return "full";
  
  // 3. Default to lite
  return "lite";
}
```

---

## Data Flow Diagrams

### Memory Storage Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ "Remember: decided to use PostgreSQL"
     ▼
┌──────────────┐
│  MCP Client  │
└────┬─────────┘
     │ memory_store({content, topic, importance})
     ▼
┌──────────────────┐
│  MCP Tool Layer  │
│  (store.ts)      │
└────┬─────────────┘
     │ Validate & Format
     ▼
┌──────────────────┐
│   Core Logic     │
│ (memory-store.ts)│
└────┬─────────────┘
     │ TOON Format: "decision:use-postgres|..."
     ▼
┌──────────────────┐
│    Embedder      │ ← Full AI Mode only
│ (embedder.ts)    │
└────┬─────────────┘
     │ Generate vector embedding
     ▼
┌──────────────────┐
│  SQLite Database │
│  (memory_facts)  │
└──────────────────┘
     │
     ▼ Success Response
```

### Memory Query Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ "What database are we using?"
     ▼
┌──────────────┐
│  MCP Client  │
└────┬─────────┘
     │ memory_query({query: "database", limit: 5})
     ▼
┌──────────────────┐
│  MCP Tool Layer  │
│  (query.ts)      │
└────┬─────────────┘
     │ Parse query
     ▼
┌──────────────────┐
│   Core Logic     │
│ (memory-store.ts)│
└────┬─────────────┘
     │
     ├─ Lite Mode ───→ Keyword Search
     │                        │
     └─ Full AI Mode → Semantic Search
                              │
                              ▼
                    ┌──────────────────┐
                    │  SQLite Database │
                    │  (memory_facts)  │
                    └────────┬─────────┘
                             │
                             ▼ Results + Update access_count
```

### Interceptor Flow (Pre-Processing)

```
┌──────────┐
│   User   │
└────┬─────┘
     │ "fix the bug"
     ▼
┌──────────────────┐
│  MCP Client      │
│  (Auto-mode)     │
└────┬─────────────┘
     │ memory_enhance_prompt({user_message: "fix the bug"})
     ▼
┌──────────────────┐
│ Pre-Processor    │
│ (pre-processor)  │
└────┬─────────────┘
     │
     ├─→ Pattern Detection (ambiguous query?)
     │
     ├─→ Query Memory: "recent bugs"
     │
     └─→ Inject Context
          │
          ▼
     "[CONTEXT: Bug in auth.ts...]\nfix the bug"
```

---

## Performance Characteristics

### Response Time Targets

| Operation | P50 Target | P99 Target | Max Acceptable |
|-----------|------------|------------|----------------|
| memory_store (Lite) | 10ms | 30ms | 50ms |
| memory_store (Full) | 50ms | 150ms | 200ms |
| memory_query (Lite) | 15ms | 50ms | 100ms |
| memory_query (Full) | 30ms | 100ms | 150ms |
| memory_forget | 5ms | 20ms | 50ms |
| memory_stats | 5ms | 15ms | 30ms |
| Interceptor (Pre) | 20ms | 50ms | 100ms |
| Interceptor (Post) | Async | Async | N/A |

### Resource Usage

**Lite Mode**:
- RAM: 20-50MB
- CPU: Minimal
- Disk: Database only (~1-10MB)
- Startup: <100ms

**Full AI Mode**:
- RAM: 200-500MB (model loaded)
- CPU: Moderate (embedding generation)
- Disk: Database + Model (~500MB)
- Startup: 2-5 seconds (model loading)

### Scalability

**Database Size**:
- Tested up to 100,000 memories
- Query performance degrades gracefully
- Recommend archival at 50,000+ memories

**Concurrent Operations**:
- SQLite handles concurrent reads
- Writes are serialized (SQLite limitation)
- MCP protocol is sequential (one request at a time)

---

## Security & Privacy

### Data Storage

**Local Only**:
- All data stored in local SQLite database
- No external services or APIs
- No network communication required
- User has full control over data

**File Permissions**:
```
.memory/
├── memory.db       # 0600 (owner read/write only)
├── memory.db-wal   # 0600
└── memory.db-shm   # 0600
```

### Input Validation

**TOON Format Validation**:
```typescript
const TOONSchema = z.string()
  .max(10000, "Content too long")
  .regex(/^([a-z]+:[^|]+\|)*[a-z]+:[^|]+$/, "Invalid TOON format");
```

**SQL Injection Prevention**:
- All queries use parameterized statements
- No string concatenation in SQL
- Input sanitized before database operations

### Memory Content

**Sensitive Data**:
- AI should be instructed not to store sensitive data
- No encryption (by design - local only)
- User can delete memories at any time
- Export includes all data (user can review)

---

## Error Handling

### Error Types (`src/errors/types.ts`)

```typescript
type MemoryError = 
  | { type: "VALIDATION_ERROR"; message: string; field?: string }
  | { type: "DATABASE_ERROR"; message: string; query?: string }
  | { type: "NOT_FOUND"; message: string; id?: string }
  | { type: "EMBEDDING_ERROR"; message: string }
  | { type: "RATE_LIMIT"; message: string; retryAfter?: number }
  | { type: "INTERNAL_ERROR"; message: string; stack?: string };
```

### Error Handling Strategy

1. **Validation Errors**: Return immediately with clear message
2. **Database Errors**: Log details, return generic message to client
3. **Embedding Errors**: Fall back to keyword mode (Full AI Mode only)
4. **Rate Limiting**: Not applicable (local only)
5. **Internal Errors**: Log with stack trace, return generic error

---

## Extensibility

### Adding New Tools

1. Create new file in `src/tools/new-tool.ts`
2. Implement tool function following pattern
3. Register in `src/server.ts`
4. Add tests in `tests/unit/tools/new-tool.test.ts`
5. Update documentation

### Adding New Patterns

1. Add pattern to `src/interceptor/pattern-detector.ts`
2. Implement detection logic
3. Add tests for pattern detection
4. Update system prompt documentation

### Adding New Topics

1. Update topic enum in `src/types/memory.ts`
2. Update documentation
3. Update system prompt templates

---

## Monitoring & Observability

### Logging

**Log Levels**:
- `ERROR`: Failures requiring attention
- `WARN`: Unexpected but handled situations
- `INFO`: Normal operations (default)
- `DEBUG`: Detailed operation flow

**Structured Logging**:
```typescript
logger.info("Memory stored", {
  id: memory.id,
  topic: memory.topic,
  importance: memory.importance_score,
  mode: "full"
});
```

### Metrics

**Tracked Metrics**:
- Total memories stored
- Query count and latency
- Cache hit rate
- Error rates by type
- Memory usage over time

### Health Checks

```typescript
async function healthCheck(): Promise<HealthStatus> {
  return {
    database: await checkDatabase(),
    embedding: await checkEmbeddingModel(), // Full AI Mode
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
}
```

---

## Deployment Considerations

### Production Setup

**Environment Variables**:
```bash
MEMORY_MODE=full
MEMORY_PROJECT_ROOT=/path/to/project
MEMORY_DB_PATH=/secure/location/memory.db
LOG_LEVEL=info
```

**Resource Requirements**:
- **Lite Mode**: 1 CPU, 256MB RAM, 100MB disk
- **Full AI Mode**: 2 CPU, 1GB RAM, 1GB disk

### Backup Strategy

**Database Backup**:
```bash
# SQLite backup (safe while running)
sqlite3 .memory/memory.db ".backup 'backup.db'"

# Or simple file copy (stop server first)
cp .memory/memory.db backup/memory-$(date +%Y%m%d).db
```

**Export/Import**:
```typescript
// Export all memories
const exported = await memory_export({ format: "json" });

// Import memories
await memory_import({ data: exported, merge: true });
```

---

## Future Architecture Considerations

### Planned Improvements

1. **Vector Index Optimization**: Use HNSW or IVF for faster similarity search
2. **Memory Partitioning**: Separate databases per project or time period
3. **Distributed Storage**: Sync memories across devices (optional cloud)
4. **Plugin System**: Allow custom embedders, distillers, and tools
5. **Multi-tenancy**: Support multiple isolated memory spaces

### Scalability Path

**Phase 1** (Current):
- Single SQLite database
- Local-only operation
- Single-user focus

**Phase 2** (Future):
- Optimized vector indexes
- Optional cloud sync
- Multi-project support

**Phase 3** (Future):
- Distributed storage options
- Team collaboration features
- Advanced analytics

---

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Vector Embeddings Guide](https://huggingface.co/docs/transformers/main_classes/output)
- [TOON Format Specification](../prompts/README.md)

---

**Last Updated**: 2025-01-19  
**Version**: 2.0.0  
**Maintained By**: Memory-Agent Team