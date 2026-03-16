# Configuration Reference

This guide covers all configuration options for Memory-Agent MCP server.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Operation Modes](#operation-modes)
- [Database Configuration](#database-configuration)
- [Memory Settings](#memory-settings)
- [Performance Tuning](#performance-tuning)
- [Logging Configuration](#logging-configuration)
- [Project Isolation](#project-isolation)
- [Advanced Options](#advanced-options)

---

## Environment Variables

Configure Memory-Agent MCP using environment variables:

### Core Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_MODE` | Operation mode (`full` or `lite`) | `full` | `MEMORY_MODE=lite` |
| `MEMORY_PROJECT_ROOT` | Project root directory | `process.cwd()` | `MEMORY_PROJECT_ROOT=/path/to/project` |
| `MEMORY_DB_PATH` | Database file path | `.memory/memory.db` | `MEMORY_DB_PATH=/custom/path.db` |
| `MEMORY_DB_POOL_SIZE` | Database connection pool size | `5` | `MEMORY_DB_POOL_SIZE=10` |

### Logging Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging level | `INFO` | `LOG_LEVEL=DEBUG` |
| `DEBUG` | Enable debug mode | `false` | `DEBUG=true` |
| `MCP_DEBUG` | Enable MCP protocol logging | `false` | `MCP_DEBUG=true` |
| `MEMORY_LOG_FILE` | Log file path | (console only) | `MEMORY_LOG_FILE=/var/log/memory-agent.log` |

### Mode-Specific Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_MODEL_PATH` | Path to embeddings model | `~/.memory-agent/models/` | `MEMORY_MODEL_PATH=/models/` |
| `MEMORY_EMBEDDING_DIM` | Embedding dimensions | `384` | `MEMORY_EMBEDDING_DIM=768` |
| `MEMORY_FALLBACK_TO_KEYWORD` | Fallback to keyword search | `true` | `MEMORY_FALLBACK_TO_KEYWORD=false` |

### Performance Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MEMORY_CACHE_SIZE` | Query cache size (items) | `100` | `MEMORY_CACHE_SIZE=500` |
| `MEMORY_QUERY_TIMEOUT` | Query timeout (ms) | `5000` | `MEMORY_QUERY_TIMEOUT=10000` |
| `MEMORY_MAX_RESULTS` | Maximum query results | `100` | `MEMORY_MAX_RESULTS=50` |

---

## Operation Modes

Memory-Agent MCP supports two operation modes:

### Full AI Mode

**Use when:** You want semantic search and advanced AI capabilities.

**Requirements:**
- ~500MB disk space for models
- 2GB+ RAM recommended
- First-run model download (one-time)

**Features:**
- ✅ Semantic/conceptual search
- ✅ Vector embeddings
- ✅ Intelligent context matching
- ✅ Advanced pattern detection

**Configuration:**
```bash
MEMORY_MODE=full
MEMORY_MODEL_PATH=~/.memory-agent/models/
MEMORY_EMBEDDING_DIM=384
```

**Model Download:**
```bash
# Models are downloaded automatically on first run
# Or manually:
bun run models:download
```

**Supported Models:**
- `all-MiniLM-L6-v2` (default) - 384 dimensions, fast, efficient
- `all-mpnet-base-v2` - 768 dimensions, higher quality
- Custom models via `MEMORY_MODEL_PATH`

### Lite Mode

**Use when:** You want fast, lightweight memory with minimal dependencies.

**Requirements:**
- No model downloads
- <100MB disk space
- Minimal RAM overhead

**Features:**
- ✅ Keyword-based search
- ✅ Fast startup (<1 second)
- ✅ Zero external dependencies
- ✅ Perfect for simple projects

**Configuration:**
```bash
MEMORY_MODE=lite
```

**Search Behavior:**
- Uses SQLite FTS (Full-Text Search)
- Exact keyword matching
- Case-insensitive search
- Boolean operators supported

### Hybrid Mode

**Use when:** You want semantic search with keyword fallback.

**Configuration:**
```bash
MEMORY_MODE=full
MEMORY_FALLBACK_TO_KEYWORD=true
```

**Behavior:**
1. Try semantic search first
2. If no results or low confidence, fall back to keyword search
3. Combine results from both methods

---

## Database Configuration

### Database Location

**Default Location:**
```
<project-root>/.memory/memory.db
```

**Custom Location:**
```bash
MEMORY_DB_PATH=/custom/path/to/memory.db
```

**Project-Isolated Database:**
```bash
MEMORY_PROJECT_ROOT=/path/to/project
MEMORY_DB_PATH=.memory/memory.db  # Relative to project root
```

### Database Schema

Memory-Agent MCP creates these tables automatically:

```sql
-- Main memory storage
CREATE TABLE memory_facts (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  content_toon TEXT,
  embedding BLOB,
  importance_score REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_accessed_at TEXT,
  metadata TEXT
);

-- Full-text search index (Lite Mode)
CREATE VIRTUAL TABLE memory_fts USING fts5(
  content,
  content_toon,
  topic
);

-- Memory metadata
CREATE TABLE memory_metadata (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### Database Optimization

**WAL Mode (Write-Ahead Logging):**
```bash
# Enabled by default for better performance
MEMORY_DB_WAL=true
```

**Connection Pooling:**
```bash
# Adjust pool size based on load
MEMORY_DB_POOL_SIZE=10  # Default: 5
```

**Vacuum Schedule:**
```bash
# Auto-vacuum interval (hours)
MEMORY_DB_VACUUM_INTERVAL=24
```

### Database Backup

**Manual Backup:**
```bash
# Using memory_export tool
# Or direct SQLite backup:
cp .memory/memory.db .memory/memory.db.backup
```

**Automatic Backups:**
```bash
# Enable auto-backup
MEMORY_BACKUP_ENABLED=true
MEMORY_BACKUP_INTERVAL=24  # hours
MEMORY_BACKUP_PATH=.memory/backups/
MEMORY_BACKUP_MAX_COUNT=10
```

---

## Memory Settings

### Importance Scoring

Memories are scored from 0.0 to 1.0:

```
1.0  - Critical (architecture decisions, security issues)
0.9  - Very High (breaking changes, major bugs)
0.8  - High (important patterns, key configurations)
0.7  - Above Average (notable decisions, useful context)
0.6  - Normal Plus (helpful information)
0.5  - Normal (standard information)
0.4  - Below Average (minor details)
0.3  - Low (occasional reference)
0.2  - Very Low (rarely needed)
0.1  - Trivial (minimal value)
```

**Default Importance:**
```bash
MEMORY_DEFAULT_IMPORTANCE=0.5
```

### Decay Settings

Memories that aren't accessed gradually decay in importance:

**Enable/Disable Decay:**
```bash
MEMORY_DECAY_ENABLED=true  # Default: true
```

**Decay Rate:**
```bash
# Multiplier applied per interval (0.0-1.0)
MEMORY_DECAY_RATE=0.95  # Default: 0.95
```

**Decay Interval:**
```bash
# How often to apply decay (days)
MEMORY_DECAY_INTERVAL=30  # Default: 30
```

**Decay Threshold:**
```bash
# Delete memories below this importance
MEMORY_DECAY_THRESHOLD=0.1  # Default: 0.1
```

**Decay Exemption:**
```bash
# Memories with importance >= this value never decay
MEMORY_DECAY_EXEMPTION_THRESHOLD=0.8  # Default: 0.8
```

### Access Tracking

**Enable Access Tracking:**
```bash
MEMORY_TRACK_ACCESS=true  # Default: true
```

**Access Boost:**
```bash
# Boost importance when memory is accessed
MEMORY_ACCESS_BOOST=0.05  # Default: 0.05
```

**Max Access Count:**
```bash
# Cap access count to prevent unlimited boosting
MEMORY_MAX_ACCESS_COUNT=100  # Default: 100
```

---

## Performance Tuning

### Query Performance

**Query Timeout:**
```bash
# Maximum query time (milliseconds)
MEMORY_QUERY_TIMEOUT=5000  # Default: 5000
```

**Result Limit:**
```bash
# Maximum results per query
MEMORY_MAX_RESULTS=100  # Default: 100
```

**Cache Size:**
```bash
# Number of queries to cache
MEMORY_CACHE_SIZE=100  # Default: 100
MEMORY_CACHE_TTL=3600  # Cache TTL (seconds)
```

**Parallel Queries:**
```bash
# Enable parallel query execution
MEMORY_PARALLEL_QUERIES=true  # Default: true
MEMORY_MAX_PARALLEL=4  # Max parallel queries
```

### Embedding Performance (Full AI Mode)

**Batch Size:**
```bash
# Embeddings batch size
MEMORY_EMBEDDING_BATCH_SIZE=32  # Default: 32
```

**Cache Embeddings:**
```bash
# Cache computed embeddings
MEMORY_EMBEDDING_CACHE=true  # Default: true
```

**Precompute Embeddings:**
```bash
# Precompute embeddings on storage
MEMORY_PRECOMPUTE_EMBEDDINGS=true  # Default: true
```

### Memory Limits

**Max Memory Size:**
```bash
# Maximum memory content length (characters)
MEMORY_MAX_CONTENT_LENGTH=10000  # Default: 10000
```

**Max Total Memories:**
```bash
# Maximum number of memories (0 = unlimited)
MEMORY_MAX_MEMORIES=10000  # Default: 0
```

**Auto-Compress:**
```bash
# Auto-compress old memories
MEMORY_AUTO_COMPRESS=true  # Default: false
MEMORY_COMPRESS_AFTER_DAYS=90  # Default: 90
```

---

## Logging Configuration

### Log Levels

Available log levels (in order of verbosity):
- `ERROR` - Only errors
- `WARN` - Errors and warnings
- `INFO` - General information (default)
- `DEBUG` - Detailed debugging information

**Set Log Level:**
```bash
LOG_LEVEL=DEBUG
```

### Log Output

**Console Logging:**
```bash
# Logs to console (default)
MEMORY_LOG_FILE=
```

**File Logging:**
```bash
# Log to file
MEMORY_LOG_FILE=/var/log/memory-agent.log
MEMORY_LOG_MAX_SIZE=10M  # Max file size
MEMORY_LOG_MAX_FILES=5   # Max number of files
```

**Structured Logging:**
```bash
# JSON format logs
MEMORY_LOG_FORMAT=json  # Default: text
```

### Debug Mode

**Enable Debug Mode:**
```bash
DEBUG=memory-agent:*
```

**MCP Protocol Debug:**
```bash
MCP_DEBUG=true
```

**Specific Module Debug:**
```bash
DEBUG=memory-agent:query,memory-agent:store
```

---

## Project Isolation

### Single Project Setup

**Default:**
```bash
# Uses current directory as project root
MEMORY_PROJECT_ROOT (auto-detected)
```

**Explicit:**
```bash
MEMORY_PROJECT_ROOT=/path/to/your/project
MEMORY_DB_PATH=.memory/memory.db
```

### Multi-Project Setup

**Option 1: Separate Databases**
```bash
# Project A
MEMORY_PROJECT_ROOT=/projects/project-a
MEMORY_DB_PATH=.memory/memory.db

# Project B (different config)
MEMORY_PROJECT_ROOT=/projects/project-b
MEMORY_DB_PATH=.memory/memory.db
```

**Option 2: Shared Database with Project Tags**
```bash
# Use single database
MEMORY_DB_PATH=/shared/memory.db

# Store memories with project metadata:
memory_store({
  content: "...",
  metadata: { project: "project-a" }
})
```

### Workspace Configuration

**VS Code Workspace:**
```json
// project-a.code-workspace
{
  "settings": {
    "memory-agent.projectRoot": "${workspaceFolder}",
    "memory-agent.dbPath": ".memory/memory.db"
  }
}
```

**Claude Desktop Multi-Project:**
```json
{
  "mcpServers": {
    "memory-project-a": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/projects/project-a"
      }
    },
    "memory-project-b": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/projects/project-b"
      }
    }
  }
}
```

---

## Advanced Options

### Security

**Input Validation:**
```bash
# Strict input validation
MEMORY_STRICT_VALIDATION=true  # Default: true
```

**SQL Injection Protection:**
```bash
# Always enabled, cannot be disabled
# Uses parameterized queries throughout
```

**Memory Sanitization:**
```bash
# Sanitize stored content
MEMORY_SANITIZE_CONTENT=true  # Default: true
```

### Experimental Features

**Enable Experimental:**
```bash
MEMORY_EXPERIMENTAL=true
```

**Experimental Features:**
```bash
# Auto-categorization using AI
MEMORY_AUTO_CATEGORIZE=true  # Experimental

# Duplicate detection
MEMORY_DUPLICATE_DETECTION=true  # Experimental

# Smart summarization
MEMORY_SMART_SUMMARY=true  # Experimental
```

### Custom Plugins

**Plugin Directory:**
```bash
MEMORY_PLUGINS_DIR=/path/to/plugins
```

**Load Plugins:**
```bash
MEMORY_PLUGINS=plugin-a,plugin-b
```

### API Customization

**Custom Port:**
```bash
# For HTTP API mode (if enabled)
MEMORY_API_PORT=3000
```

**CORS Settings:**
```bash
MEMORY_API_CORS=true
MEMORY_API_CORS_ORIGINS=*
```

---

## Configuration Files

### Using .env File

Create `.env` file in project root:

```bash
# .env
MEMORY_MODE=full
MEMORY_PROJECT_ROOT=/path/to/project
LOG_LEVEL=INFO
DEBUG=false
```

Load automatically:
```bash
# Memory-Agent MCP loads .env automatically
bun run src/index.ts
```

### Using Configuration File

Create `memory-agent.config.json`:

```json
{
  "mode": "full",
  "projectRoot": "/path/to/project",
  "database": {
    "path": ".memory/memory.db",
    "poolSize": 5
  },
  "logging": {
    "level": "INFO",
    "file": "/var/log/memory-agent.log"
  },
  "memory": {
    "defaultImportance": 0.5,
    "decayEnabled": true,
    "decayRate": 0.95
  }
}
```

Load configuration:
```bash
MEMORY_CONFIG_FILE=memory-agent.config.json
```

---

## Configuration Best Practices

### Development
```bash
MEMORY_MODE=lite
LOG_LEVEL=DEBUG
DEBUG=true
```

### Production
```bash
MEMORY_MODE=full
LOG_LEVEL=INFO
DEBUG=false
MEMORY_CACHE_SIZE=500
MEMORY_DB_POOL_SIZE=10
```

### Resource-Constrained
```bash
MEMORY_MODE=lite
MEMORY_CACHE_SIZE=50
MEMORY_MAX_RESULTS=50
MEMORY_DB_POOL_SIZE=2
```

### High-Performance
```bash
MEMORY_MODE=full
MEMORY_CACHE_SIZE=1000
MEMORY_DB_POOL_SIZE=20
MEMORY_PARALLEL_QUERIES=true
MEMORY_MAX_PARALLEL=8
```

---

## Troubleshooting Configuration

### Common Issues

**Database Locked:**
```bash
# Check for multiple instances
# Use WAL mode
MEMORY_DB_WAL=true
```

**Slow Queries:**
```bash
# Increase cache
MEMORY_CACHE_SIZE=500
# Reduce max results
MEMORY_MAX_RESULTS=50
# Use Lite Mode
MEMORY_MODE=lite
```

**High Memory Usage:**
```bash
# Use Lite Mode
MEMORY_MODE=lite
# Reduce cache
MEMORY_CACHE_SIZE=50
# Enable auto-compress
MEMORY_AUTO_COMPRESS=true
```

**Models Not Loading:**
```bash
# Check model path
MEMORY_MODEL_PATH=~/.memory-agent/models/
# Re-download models
bun run models:download
```

---

## Environment-Specific Examples

### Claude Desktop Config

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/Users/username/projects/myproject",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Cursor IDE Config

```json
{
  "mcp": {
    "servers": {
      "memory-agent": {
        "command": "bun",
        "args": ["run", "memory-agent-mcp/src/index.ts"],
        "env": {
          "MEMORY_MODE": "full",
          "MEMORY_PROJECT_ROOT": "${workspaceFolder}"
        }
      }
    }
  }
}
```

### Docker Configuration

```dockerfile
ENV MEMORY_MODE=full
ENV MEMORY_PROJECT_ROOT=/app
ENV MEMORY_DB_PATH=/data/memory.db
ENV LOG_LEVEL=INFO
```

---

## Configuration Validation

### Check Configuration

```bash
# Validate current configuration
bun run config:validate

# Show effective configuration
bun run config:show
```

### Test Configuration

```bash
# Test database connection
bun run config:test-db

# Test model loading (Full AI Mode)
bun run config:test-models
```

---

## See Also

- [Getting Started Guide](./getting-started.md)
- [Architecture Overview](./architecture.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Client Setup Guides](./client-setup/)

---

**Last Updated:** 2025-01-19  
**Version:** 2.0.0