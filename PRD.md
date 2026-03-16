# Memory-Agent MCP Server - Product Requirements Document (PRD)

**Version:** 3.0  
**Status:** Draft  
**Type:** MCP (Model Context Protocol) Server  
**Last Updated:** 2025-01-19

---

## 📋 Executive Summary

**Memory-Agent MCP** is a universal memory management server implementing the Model Context Protocol (MCP). It provides persistent, semantic memory capabilities to any MCP-compatible AI assistant or IDE—including Claude Desktop, Cursor, Windsurf, Continue.dev, and VS Code extensions.

This server enables AI assistants to:
- **Remember** context across sessions and conversations
- **Retrieve** relevant information using semantic search
- **Compress** verbose content into compact formats
- **Share** knowledge between different AI instances
- **Operate** in both Full AI Mode and Zero-Dependency Lite Mode

---

## 🎯 What is Memory-Agent MCP?

Memory-Agent MCP is a **standalone MCP server** that provides intelligent memory services to any MCP client. It acts as a persistent brain for AI assistants, allowing them to store, retrieve, and synthesize knowledge across sessions.

### MCP Server Identity

```json
{
  "name": "memory-agent-mcp",
  "version": "2.0.0",
  "description": "Hybrid Memory Architecture with semantic retrieval, knowledge distillation, and Memory Interceptor",
  "capabilities": {
    "tools": true,
    "resources": true,
    "prompts": true,
    "middleware": true
  }
}
```

### Core Features

- ✅ **Universal Compatibility** - Works with any MCP-compatible client
- ✅ **Zero-Cloud Operation** - Runs entirely locally, no API keys required
- ✅ **Hybrid Intelligence** - Gracefully degrades from Full AI to Lite Mode
- ✅ **Cross-Session Memory** - Persists knowledge between conversations
- ✅ **Semantic Search** - Vector embeddings + keyword matching
- ✅ **Context Compression** - TOON format and Neural Seed encoding
- ✅ **Multi-Project Support** - Isolated memory spaces per project
- ✅ **Memory Interceptor** - Automatic context injection and learning extraction
- ✅ **Smart Decay** - Intelligent memory archival and garbage collection

---

## 🔥 Problem Statement

### Issues Memory-Agent MCP Solves

1. **AI Context Amnesia**
   - AI assistants forget everything after each conversation
   - No persistent memory of decisions, patterns, or learnings
   - Repeated explanations required for every session

2. **IDE Lock-in**
   - Memory systems tied to specific IDEs or platforms
   - No universal standard for AI memory
   - Switching tools means losing all context

3. **Token Budget Waste**
   - Full context re-loaded every conversation
   - API costs scale linearly with history
   - No intelligent compression or archival

4. **Cloud Dependency**
   - Most memory systems require cloud APIs
   - Privacy concerns with external data storage
   - Costs accumulate with usage

5. **No Fallback Mechanisms**
   - Systems fail completely when AI services unavailable
   - No graceful degradation
   - Binary reliability model

---

## 🛠️ MCP Server Architecture

### Server Components

```
┌─────────────────────────────────────────────────────────┐
│                  MCP Server Layer                       │
│  - Tool Definitions                                     │
│  - Resource Handlers                                    │
│  - Transport Protocol (stdio / HTTP)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Memory Engine (Core)                       │
│  - MemoryStore (SQLite + Vectors)                      │
│  - ContextEngine (Budget & Assembly)                   │
│  - QueryEngine (Expansion + Reranking)                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              AI Layer (Hybrid)                          │
│  - LlamaBridge (Local LLM)                             │
│  - LocalEmbedding (Vector Generation)                  │
│  - Heuristic Fallback (No Dependencies)                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Storage Layer                              │
│  - SQLite Database (.memory/memory.db)                 │
│  - Model Cache (~/.memory-agent/models/)               │
│  - Project Isolation                                   │
└─────────────────────────────────────────────────────────┘
```

### Hybrid Mode Design

#### Full AI Mode (Recommended)

```
Requirements:
- node-llama-cpp installed
- @xenova/transformers installed
- Model: qwen2.5-0.5b-instruct-q4_k_m.gguf (~500MB)
- Embedding: Xenova/bge-micro-v2

Capabilities:
✓ Semantic TOON distillation
✓ Query expansion (3 variations)
✓ Neural Seed compression
✓ Self-repair diagnostics
✓ 384-dimensional embeddings
```

#### Lite Mode (Zero Dependencies)

```
Requirements:
- None (pure JavaScript/TypeScript)

Capabilities:
✓ Heuristic TOON extraction
✓ Keyword tokenization
✓ Jaccard similarity matching
✓ WASM fallback operations
✓ Basic archival and compression
```

---

## 🔌 MCP Tools Specification

### Tool 1: `memory_store`

Store information in persistent memory.

```json
{
  "name": "memory_store",
  "description": "Store information in the project's persistent memory with optional importance scoring",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "The content to store"
      },
      "topic": {
        "type": "string",
        "description": "Category or tag for this memory",
        "default": "general"
      },
      "importance": {
        "type": "number",
        "description": "Importance score (0.0-10.0)",
        "default": 5.0
      },
      "metadata": {
        "type": "object",
        "description": "Optional metadata key-value pairs"
      }
    },
    "required": ["content"]
  }
}
```

**Example Usage:**
```json
{
  "content": "Decision: Using PostgreSQL for primary database due to JSONB support",
  "topic": "architecture",
  "importance": 8.5,
  "metadata": {
    "decision_date": "2025-01-18",
    "decided_by": "team"
  }
}
```

### Tool 2: `memory_query`

Retrieve relevant memories using semantic search.

```json
{
  "name": "memory_query",
  "description": "Search memory for relevant information using semantic similarity",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      },
      "limit": {
        "type": "number",
        "description": "Maximum results to return",
        "default": 10
      },
      "topic": {
        "type": "string",
        "description": "Filter by topic (optional)"
      },
      "min_importance": {
        "type": "number",
        "description": "Minimum importance score filter"
      }
    },
    "required": ["query"]
  }
}
```

**Example Response:**
```json
{
  "results": [
    {
      "id": 123,
      "content": "Decision: Using PostgreSQL for primary database...",
      "topic": "architecture",
      "score": 0.92,
      "importance": 8.5,
      "created_at": "2025-01-18T10:30:00Z"
    }
  ],
  "query_expansions": [
    "database architecture",
    "PostgreSQL design patterns",
    "data storage decisions"
  ]
}
```

### Tool 3: `memory_ingest`

Ingest documents into memory for future retrieval.

```json
{
  "name": "memory_ingest",
  "description": "Ingest a file or directory into memory for semantic retrieval",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "File or directory path to ingest"
      },
      "recursive": {
        "type": "boolean",
        "description": "Recursively ingest directories",
        "default": true
      },
      "file_types": {
        "type": "array",
        "items": { "type": "string" },
        "description": "File extensions to include (e.g., ['.md', '.ts'])",
        "default": [".md", ".txt", ".ts", ".js", ".py"]
      }
    },
    "required": ["path"]
  }
}
```

### Tool 4: `memory_compress`

Archive old memories and compress context.

```json
{
  "name": "memory_compress",
  "description": "Archive old memories and optimize storage to reduce token usage",
  "inputSchema": {
    "type": "object",
    "properties": {
      "older_than_days": {
        "type": "number",
        "description": "Archive memories older than N days",
        "default": 30
      },
      "consolidate": {
        "type": "boolean",
        "description": "Merge similar memories into super nodes",
        "default": true
      }
    }
  }
}
```

### Tool 5: `memory_stats`

Get memory usage statistics and health report.

```json
{
  "name": "memory_stats",
  "description": "Get statistics about memory usage, health, and optimization opportunities",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

**Example Response:**
```json
{
  "total_memories": 1247,
  "active_memories": 1089,
  "archived_memories": 158,
  "topics": {
    "architecture": 234,
    "api": 187,
    "bugs": 156,
    "decisions": 312
  },
  "storage_size_mb": 45.2,
  "oldest_memory": "2024-06-15T08:00:00Z",
  "health_score": 0.94,
  "recommendations": [
    "Consider compressing memories older than 60 days",
    "Topic 'bugs' has 23 quarantined entries"
  ]
}
```

### Tool 6: `memory_forget`

Remove specific memories or topics.

```json
{
  "name": "memory_forget",
  "description": "Remove memories by ID, topic, or age",
  "inputSchema": {
    "type": "object",
    "properties": {
      "memory_id": {
        "type": "number",
        "description": "Specific memory ID to remove"
      },
      "topic": {
        "type": "string",
        "description": "Remove all memories with this topic"
      },
      "older_than_days": {
        "type": "number",
        "description": "Remove memories older than N days"
      }
    }
  }
}
```

### Tool 7: `memory_export`

Export memories for backup or transfer.

```json
{
  "name": "memory_export",
  "description": "Export memories to a portable format",
  "inputSchema": {
    "type": "object",
    "properties": {
      "format": {
        "type": "string",
        "enum": ["json", "markdown", "csv"],
        "default": "json"
      },
      "topic": {
        "type": "string",
        "description": "Export only specific topic (optional)"
      },
      "include_archived": {
        "type": "boolean",
        "default": false
      }
    }
  }
}
```

### Tool 8: `memory_import`

Import memories from external source.

```json
{
  "name": "memory_import",
  "description": "Import memories from exported file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path to import file"
      },
      "merge_strategy": {
        "type": "string",
        "enum": ["replace", "append", "merge"],
        "default": "merge"
      }
    },
    "required": ["path"]
  }
}
```

---

## 🎯 VSCode Extension (Memory-Agent VSCode)

Besides the MCP server, we will also build a VSCode extension to provide a graphical interface for:
- Running SQL queries on memory database
- Visualizing stored memories
- AI-assisted decision making (relevance check, delete suggestions)

**Note:** No chat feature - the extension focuses on data visualization and management. LLM (Qwen2-0.5B) is used for TOON distillation and decision assistance.

### Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ SQL Runner  │  │ Local LLM   │  │ Memory Visualizer│   │
│  │   Panel     │  │   Chat      │  │    Panel        │   │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │
│         │                │                   │             │
│         └────────────────┼───────────────────┘             │
│                          ▼                                   │
│               ┌─────────────────────┐                       │
│               │   Webview Panel    │                       │
│               │   (React/Svelte)   │                       │
│               └──────────┬──────────┘                       │
│                          │                                   │
│                          ▼                                   │
│               ┌─────────────────────┐                       │
│               │   Extension Host   │                       │
│               │   (TypeScript)    │                       │
│               └──────────┬──────────┘                       │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   MCP      │  │   Ollama   │  │   SQLite   │            │
│  │  Server    │  │    API     │  │   Direct   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Feature 1: SQL Runner

Execute raw SQL queries on the memory database directly from VSCode.

| Component | Description |
|-----------|-------------|
| **Monaco Editor** | SQL syntax highlighting, auto-completion |
| **Query Results** | Table view with sorting, filtering |
| **Export** | CSV, JSON, Markdown export options |
| **History** | Query history with favorites |

**Commands:**
- `memory-vscode.runQuery` - Execute current SQL query
- `memory-vscode.formatQuery` - Format SQL query
- `memory-vscode.exportResults` - Export results to file

**UI Layout:**
```
┌────────────────────────────────────────────────┐
│ SQL Editor (Monaco)                           │
│ ┌──────────────────────────────────────────┐  │
│ │ SELECT * FROM memory_facts                │  │
│ │ WHERE topic = 'architecture'              │  │
│ │ ORDER BY importance_score DESC            │  │
│ └──────────────────────────────────────────┘  │
│ [▶ Run] [📋 Format] [💾 Save] [📤 Export]     │
├────────────────────────────────────────────────┤
│ Results (45 rows)                             │
│ ┌────┬────────────┬───────────┬────────┬────┐ │
│ │ ID │ Content    │ Topic    │ Score │Age │ │
│ ├────┼────────────┼───────────┼────────┼────┤ │
│ │ 1  │ Use Redis  │architec..│ 8.5   │2d  │ │
│ │ 2  │ JWT in he..│security..│ 7.2   │5d  │ │
│ └────┴────────────┴───────────┴────────┴────┘ │
└────────────────────────────────────────────────┘
```

### Feature 2: Decision Helper

AI-assisted decision making for memory management.

| Component | Description |
|-----------|-------------|
| **Relevance Check** | Analyze if memory is still relevant |
| **Delete Suggestions** | AI recommends memories to delete |
| **Importance Review** | Suggest importance score adjustments |
| **Merge Suggestions** | Find similar memories that could be merged |

**Configuration:**
```json
{
  "memory-vscode.llmModel": "qwen2.5-0.5b",
  "memory-vscode.autoSuggestDeletes": true,
  "memory-vscode.similarityThreshold": 0.85
}
```

**Commands:**
- `memory-vscode.analyzeMemory` - Analyze single memory
- `memory-vscode.suggestDeletes` - Get delete suggestions
- `memory-vscode.findDuplicates` - Find similar memories

**UI Layout:**
```
┌────────────────────────────────────────────────┐
│ 🤖 Decision Helper     [Analyze All] [Refresh]│
├────────────────────────────────────────────────┤
│ Suggestions (12)                              │
│ ┌────────────────────────────────────────────┐ │
│ │ 🗑️ Delete: "old debug log" (similar to #5)│ │
│ │    Reason: Duplicate content               │ │
│ │    [Keep] [Delete]                         │ │
│ ├────────────────────────────────────────────┤ │
│ │ ⚠️ Review: "JWT config"                    │ │
│ │    Reason: Content may be outdated         │ │
│ │    [View] [Ignore]                         │ │
│ ├────────────────────────────────────────────┤ │
│ │ 🔄 Merge: "auth middleware" & "auth-helper"│ │
│ │    Similarity: 92%                         │ │
│ │    [Merge] [Keep Separate]                 │ │
│ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Feature 3: Memory Visualizer

Visualize stored memories in various formats for better understanding.

| View Mode | Description |
|-----------|-------------|
| **Tree View** | Hierarchical view by topic/category |
| **Timeline** | Memories plotted on timeline with decay visualization |
| **Graph** | Knowledge graph showing relationships |
| **Statistics** | Dashboard with charts and metrics |

**Tree View Features:**
- Expand/collapse nodes
- Color-coded importance (red=high, yellow=medium, green=low)
- Search/filter memories
- Quick actions (edit, delete, archive)

**Timeline Features:**
- Zoomable timeline (day/week/month/year)
- Decay visualization (fading opacity for old memories)
- Access frequency indicators
- Click to view memory details

**Statistics Dashboard:**
- Total memories count
- Topic distribution (pie chart)
- Storage usage
- Memory health score
- Decay/archive statistics

**Commands:**
- `memory-vscode.openVisualizer` - Open memory visualizer
- `memory-vscode.refreshView` - Refresh current view
- `memory-vscode.toggleView` - Switch between views

**UI Layout:**
```
┌────────────────────────────────────────────────┐
│ 📊 Memory Visualizer    [🔍 Search] [⟳ Refresh]│
│ [Tree] [Timeline] [Graph] [Stats]             │
├──────────────────┬─────────────────────────────┤
│ Tree View        │ Memory Details             │
│ ▼ 📁 architecture│ ┌─────────────────────────┐ │
│   ▼ 📁 database  │ │ Title: Use PostgreSQL  │ │
│     ├─ ID: 1 ★★★  │ │ Topic: architecture    │ │
│     └─ ID: 2 ★★   │ │ Importance: 8.5        │ │
│   ▼ 📁 api        │ │ Created: 2025-01-18    │ │
│     └─ ID: 5 ★★★  │ │ Status: active         │ │
│ ▼ 📁 decisions   │ │                         │ │
│   └─ ID: 12 ★★★   │ │ [Edit] [Delete] [Archive]│
│ ▼ 📁 bugs         │ └─────────────────────────┘ │
│   └─ ID: 8 ★★     │                             │
└──────────────────┴─────────────────────────────┘
```

### VSCode Extension Commands

| Command | Description |
|---------|-------------|
| `memory-vscode.explore` | Open memory explorer panel |
| `memory-vscode.query` | Open SQL runner panel |
| `memory-vscode.llm` | Open local LLM chat |
| `memory-vscode.stats` | Open statistics dashboard |
| `memory-vscode.refresh` | Refresh all views |
| `memory-vscode.configure` | Open extension settings |

### Installation

```bash
# Install from VSCode Marketplace
# Or install from .vsix file
code --install-extension memory-agent.vsix
```

### Configuration

```json
{
  "memory-vscode.dbPath": "${workspaceFolder}/.memory/memory.db",
  "memory-vscode.ollamaEndpoint": "http://localhost:11434",
  "memory-vscode.defaultModel": "qwen2.5:0.5b",
  "memory-vscode.autoRefresh": true,
  "memory-vscode.refreshInterval": 30,
  "memory-vscode.theme": "auto"
}
```

### Package Structure

```
memory-agent-vscode/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── commands/             # VSCode commands
│   ├── views/                # Webview panels
│   │   ├── sqlRunner/
│   │   ├── decisionHelper/
│   │   └── visualizer/
│   ├── services/             # Backend services
│   │   ├── database.ts      # SQLite operations
│   │   ├── llm.ts          # Qwen2-0.5B inference
│   │   └── mcp.ts          # MCP server communication
│   └── utils/
├── webview/                  # React/Svelte UI
│   ├── App.tsx
│   ├── components/
│   └── styles/
└── icons/
```

### LLM Model: Qwen2-0.5B

The extension uses **Qwen2-0.5B** as the primary LLM model for:
- TOON distillation
- Decision assistance (relevance check, delete suggestions)

| Property | Value |
|----------|-------|
| **Model** | qwen2.5-0.5b-instruct-q4_k_m.gguf |
| **Size** | ~350-500MB |
| **RAM Usage** | ~500MB-1GB |
| **Inference Speed** | 30-80 tok/sec |
| **Setup** | Auto-download on first use |

---

## 🔮 Memory Interceptor Architecture

The Memory Interceptor is a middleware layer that enables automatic context injection and learning extraction, making the memory system seamless and always-on.

### Interceptor Pattern Overview

```
┌─────────────────────────────────────────────────────────┐
│  USER MESSAGE                                           │
│  "fix the auth bug"                                     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  🔮 PRE-PROCESSOR (memory_enhance_prompt)               │
│  1. Query relevant memories                             │
│  2. Build context block                                 │
│  3. Inject into prompt                                  │
│  Result: "fix the auth bug [CONTEXT: JWT expiry issue   │
│           in src/auth.ts from 2025-01-18...]"           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  AI PROCESSING (with enhanced context)                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  📝 POST-PROCESSOR (memory_auto_learn)                  │
│  1. Detect decision patterns                            │
│  2. Extract learnings (async, non-blocking)             │
│  3. Store important findings                            │
└─────────────────────────────────────────────────────────┘
```

### Decision Pattern Detection

The post-processor detects these patterns to identify learnings worth storing:

```typescript
const DECISION_PATTERNS = [
  /I (decided|chose|recommend) to/i,
  /Let's (change|switch|use)/i,
  /The (bug|issue|problem) (was|is) caused by/i,
  /Note that/i,
  /We should (use|implement|avoid)/i,
  /Important:/i
];
```

---

## 🛠️ Interceptor Tools Specification

### Tool 9: `memory_enhance_prompt`

Enhance user prompt with relevant memory context.

```json
{
  "name": "memory_enhance_prompt",
  "description": "Pre-processor: Enhance user prompts with relevant memory context for better AI understanding",
  "inputSchema": {
    "type": "object",
    "properties": {
      "user_message": {
        "type": "string",
        "description": "The user's original message to enhance"
      },
      "max_context": {
        "type": "number",
        "description": "Maximum number of memory contexts to include",
        "default": 3
      }
    },
    "required": ["user_message"]
  }
}
```

**Example Response:**
```json
{
  "enhanced_prompt": "[MEMORY_CONTEXT]:\n- JWT auth bug in src/auth.ts (2025-01-18)\n- Using PostgreSQL for database\n[END_CONTEXT]\n\nfix the auth bug",
  "context_found": true,
  "memories_used": ["mem_abc123", "mem_def456"]
}
```

### Tool 10: `memory_auto_learn`

Automatically extract and store learnings from conversation.

```json
{
  "name": "memory_auto_learn",
  "description": "Post-processor: Automatically extract and store learnings from AI conversations",
  "inputSchema": {
    "type": "object",
    "properties": {
      "conversation": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "role": { "type": "string", "enum": ["user", "assistant"] },
            "content": { "type": "string" }
          }
        },
        "description": "Array of conversation messages"
      },
      "auto_detect_importance": {
        "type": "boolean",
        "description": "Automatically detect if content is worth storing",
        "default": true
      }
    },
    "required": ["conversation"]
  }
}
```

**Example Response:**
```json
{
  "stored": true,
  "memory_id": "mem_xyz789",
  "content": "decision:use-redis|reason:caching|date:2025-01-19"
}
```

### Tool 11: `memory_decay`

Apply intelligent decay to manage memory quality.

```json
{
  "name": "memory_decay",
  "description": "Apply decay function to archive/delete old/unused memories",
  "inputSchema": {
    "type": "object",
    "properties": {
      "decay_factor": {
        "type": "number",
        "description": "Factor to decay importance scores",
        "default": 0.95
      },
      "archive_threshold": {
        "type": "number",
        "description": "Score below which memories are archived",
        "default": 0.2
      },
      "delete_threshold": {
        "type": "number",
        "description": "Score below which garbage memories are deleted",
        "default": 0.05
      },
      "garbage_age_days": {
        "type": "number",
        "description": "Age in days for garbage detection",
        "default": 30
      }
    }
  }
}
```

**Decay Algorithm:**
```
FOR each active memory:
  1. new_score = importance_score * decay_factor
  2. access_bonus = min(access_count * 0.01, 0.5)
  3. final_score = new_score + access_bonus
  
  4. IF final_score < archive_threshold:
     IF is_garbage(memory) AND final_score < delete_threshold:
       DELETE memory  // Never accessed, no important metadata
     ELSE:
       ARCHIVE memory  // Keep but exclude from normal queries
```

**Garbage Detection Criteria:**
- `access_count = 0` (never accessed)
- `age > garbage_age_days` (older than threshold)
- No important metadata (`decision_date`, `project`, or `critical` flag)

**Example Response:**
```json
{
  "success": true,
  "archived": 15,
  "deleted": 3,
  "kept": 182,
  "duration_ms": 234
}
```

### Tool 12: `memory_review`

Manually curate and manage memories.

```json
{
  "name": "memory_review",
  "description": "Review and manage stored memories",
  "inputSchema": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": ["list_unreviewed", "approve", "edit", "delete", "promote", "demote"],
        "description": "Action to perform"
      },
      "memory_id": {
        "type": "string",
        "description": "Memory ID for single-memory actions"
      },
      "filters": {
        "type": "object",
        "properties": {
          "topic": { "type": "string" },
          "min_importance": { "type": "number" },
          "max_importance": { "type": "number" },
          "status": { "type": "string", "enum": ["active", "archived", "pending"] },
          "older_than_days": { "type": "number" }
        }
      },
      "edits": {
        "type": "object",
        "properties": {
          "content": { "type": "string" },
          "topic": { "type": "string" },
          "importance": { "type": "number" },
          "metadata": { "type": "object" }
        }
      }
    },
    "required": ["action"]
  }
}
```

---

## 🔄 Implementation Approach

### Recommended Strategy: Hybrid MCP Server + System Prompt

We recommend **Approach 3 (Hybrid MCP Server)** combined with **Approach 2 (System Prompt)**:

```
Phase 1 (NOW): Hybrid MCP Server + System Prompt
├── Add new interceptor tools to memory-agent-mcp
├── Create a system prompt template
└── Test with Claude Desktop / Cursor

Phase 2 (LATER): Client Wrapper
├── Build IDE-specific wrappers for true interception
└── For power users who want fully automatic behavior
```

### System Prompt Template

```markdown
# Memory Protocol

You have access to persistent memory tools. Follow this protocol:

## Before Answering
1. If the user's query is ambiguous or lacks context, call `memory_query` first
2. Use retrieved memories to understand the user's project and recent work
3. Provide contextually relevant answers

## After Answering
1. If you made a decision, discovered a bug, or learned something important:
   - Call `memory_store` with:
     - topic: category (e.g., "decision", "bug", "architecture")
     - importance: 1-10
     - content: concise summary in TOON format

## TOON Format Example:
"decision:use-postgres|reason:better-json-support|date:2025-01-19|project:LumeAPI"
```

---

## 📚 MCP Resources Specification

### Resource 1: `memory://project/summary`

Provides a summary of the current project's memory state.

```json
{
  "uri": "memory://project/summary",
  "name": "Project Memory Summary",
  "description": "Overview of all memories in the current project",
  "mimeType": "application/json"
}
```

### Resource 2: `memory://project/topics`

List all topics with memory counts.

```json
{
  "uri": "memory://project/topics",
  "name": "Memory Topics",
  "description": "List of all topics and their memory counts",
  "mimeType": "application/json"
}
```

### Resource 3: `memory://project/recent`

Most recently accessed memories.

```json
{
  "uri": "memory://project/recent",
  "name": "Recent Memories",
  "description": "Last 20 accessed memories",
  "mimeType": "application/json"
}
```

---

## 🚀 Installation & Configuration

### Installation

```bash
# Install globally via npm
npm install -g @memory-agent/mcp-server

# Or install locally in project
npm install @memory-agent/mcp-server
```

### Configuration for Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "npx",
      "args": ["-y", "@memory-agent/mcp-server"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/path/to/your/project",
        "MEMORY_MODE": "hybrid"
      }
    }
  }
}
```

### Configuration for Cursor IDE

**Settings**: Cursor Settings → Features → Model Context Protocol

```json
{
  "mcp": {
    "servers": {
      "memory-agent": {
        "command": "npx",
        "args": ["-y", "@memory-agent/mcp-server"],
        "cwd": "${workspaceFolder}"
      }
    }
  }
}
```

### Configuration for Windsurf

**File**: `.windsurf/mcp_config.json`

```json
{
  "servers": {
    "memory-agent": {
      "command": "npx",
      "args": ["-y", "@memory-agent/mcp-server"],
      "env": {
        "MEMORY_MODE": "full"
      }
    }
  }
}
```

### Configuration for VS Code (Continue.dev)

**File**: `~/.continue/config.json`

```json
{
  "models": [...],
  "mcpServers": {
    "memory-agent": {
      "command": "npx",
      "args": ["-y", "@memory-agent/mcp-server"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMORY_PROJECT_ROOT` | Project root directory | Current working directory |
| `MEMORY_MODE` | Operation mode: `full`, `lite`, `hybrid` | `hybrid` |
| `MEMORY_DB_PATH` | Custom database path | `.memory/memory.db` |
| `MEMORY_MODEL_PATH` | Custom model directory | `~/.memory-agent/models/` |
| `MEMORY_MAX_RESULTS` | Default max query results | `10` |
| `MEMORY_AUTO_COMPRESS` | Auto-compress after days | `30` |
| `MEMORY_DEBUG` | Enable debug logging | `false` |

---

## 🔄 How Memory-Agent MCP Works

### Workflow Overview

```
┌──────────────────────────────────────────────────────────┐
│                 MCP CLIENT (IDE/AI)                      │
│  Claude Desktop / Cursor / Windsurf / VS Code           │
└──────────────────────────────────────────────────────────┘
                         │
                         │ MCP Protocol (JSON-RPC)
                         ↓
┌──────────────────────────────────────────────────────────┐
│              MEMORY-AGENT MCP SERVER                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Tool Handler                                       │ │
│  │  - memory_store                                     │ │
│  │  - memory_query                                     │ │
│  │  - memory_ingest                                    │ │
│  │  - memory_compress                                  │ │
│  │  - memory_stats                                     │ │
│  │  - memory_forget                                    │ │
│  │  - memory_export                                    │ │
│  │  - memory_import                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                         │                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Memory Engine                                      │ │
│  │  - MemoryStore (SQLite + Vectors)                  │ │
│  │  - QueryExpander (LLM-based)                       │ │
│  │  - ReRanker (Semantic scoring)                     │ │
│  │  - Chunker (Code/Text splitting)                   │ │
│  └────────────────────────────────────────────────────┘ │
│                         │                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  AI Layer (Hybrid)                                  │ │
│  │  ┌─────────────────┬──────────────────────────┐   │ │
│  │  │  Full AI Mode   │  Lite Mode               │   │ │
│  │  │  - LlamaBridge  │  - Heuristics            │   │ │
│  │  │  - LocalEmbed   │  - Tokenization          │   │ │
│  │  │  - Semantic     │  - Jaccard               │   │ │
│  │  └─────────────────┴──────────────────────────┘   │ │
│  └────────────────────────────────────────────────────┘ │
│                         │                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Storage Layer                                      │ │
│  │  - SQLite (.memory/memory.db)                      │ │
│  │  - Model Cache (~/.memory-agent/models/)           │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Step-by-Step: Memory Storage Flow

```
1. IDE calls memory_store tool
   │
   ├─→ Validate input (content, topic, importance)
   │
   ├─→ Detect mode (Full AI or Lite)
   │     │
   │     ├─→ Full AI:
   │     │     ├─→ LocalEmbedding.embed(content)
   │     │     │     └─→ [0.123, -0.456, ...] (384 dims)
   │     │     │
   │     │     └─→ LlamaBridge.distill(content)
   │     │           └─→ "topic:api|status:done|file:auth.ts"
   │     │
   │     └─→ Lite Mode:
   │           ├─→ tokenize(content)
   │           │     └─→ ["api", "auth", "token", "security"]
   │           │
   │           └─→ heuristicDistill(content)
   │                 └─→ "status:success|action:create"
   │
   ├─→ Calculate bin_id for partitioning
   │
   ├─→ Store in SQLite:
   │     INSERT INTO memory_facts (
   │       uri, topic, content_toon, content_raw,
   │       vector, bin_id, importance_score, created_at
   │     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
   │
   └─→ Return success with memory ID
```

### Step-by-Step: Memory Query Flow

```
1. IDE calls memory_query tool with "authentication patterns"
   │
   ├─→ QueryExpander.expand("authentication patterns")
   │     │
   │     ├─→ Full AI:
   │     │     └─→ LLM generates variations:
   │     │           - "auth middleware implementation"
   │     │           - "user login security flow"
   │     │           - "token validation patterns"
   │     │
   │     └─→ Lite Mode:
   │           └─→ Return original query only
   │
   ├─→ For each query variation:
   │     │
   │     ├─→ Generate embedding:
   │     │     Full AI → [0.234, -0.123, ...]
   │     │     Lite    → ["auth", "middleware", "security"]
   │     │
   │     ├─→ MemoryStore.findRelevant(embedding, limit)
   │     │     │
   │     │     ├─→ Calculate bin_id from embedding
   │     │     │
   │     │     ├─→ SELECT FROM memory_facts
   │     │     │     WHERE bin_id IN (adjacent_bins)
   │     │     │     AND status = 'active'
   │     │     │
   │     │     ├─→ For each candidate:
   │     │     │     ├─→ Cosine similarity (vectors)
   │     │     │     ├─→ Jaccard similarity (keywords)
   │     │     │     ├─→ Status multiplier
   │     │     │     ├─→ Recency boost
   │     │     │     └─→ Importance weighting
   │     │     │
   │     │     └─→ Return top scored candidates
   │     │
   │     └─→ ReRanker.rerank(query, candidates)
   │           └─→ Cross-similarity with raw content
   │
   ├─→ Merge and deduplicate results
   │
   └─→ Return ranked JSON response
```

---

## 💪 Strengths

### 1. Universal Compatibility
- ✅ Works with any MCP-compatible IDE or AI assistant
- ✅ Standard JSON-RPC protocol
- ✅ No vendor lock-in
- ✅ Easy to switch between tools

### 2. Zero-Cloud Architecture
- ✅ Runs entirely locally
- ✅ No API keys required
- ✅ Complete data privacy
- ✅ Zero recurring costs

### 3. Hybrid Resilience
- ✅ Graceful degradation from Full AI → Lite Mode
- ✅ Never completely fails
- ✅ Automatic fallback detection
- ✅ Consistent API regardless of mode

### 4. Token Efficiency
- ✅ TOON format: ~80% compression
- ✅ Neural Seeds: ~95% compression
- ✅ Smart archival prevents context bloat
- ✅ ~45% token savings in practice

### 5. Multi-Project Support
- ✅ Isolated memory spaces per project
- ✅ Cross-project export/import
- ✅ Topic-based organization
- ✅ Importance scoring

### 6. Self-Healing
- ✅ Automatic skill health monitoring
- ✅ Quarantine system for broken patterns
- ✅ Diagnostic suggestions
- ✅ Pattern-based failure detection

---

## ⚠️ Weaknesses

### 1. Initial Setup
- ❌ Requires MCP client configuration
- ❌ Model download for Full AI mode (~500MB)
- ❌ Documentation could be clearer
- ❌ No GUI configuration tool

### 2. Performance Limitations
- ❌ Local LLM slower than cloud APIs
- ❌ Embedding generation can be CPU-intensive
- ❌ SQLite not designed for massive scale
- ❌ No GPU acceleration on all platforms

### 3. Quality Trade-offs
- ❌ Lite Mode less accurate than Full AI
- ❌ Small model (0.5b) has limited reasoning
- ❌ TOON format loses nuance
- ❌ Keyword matching misses semantics

### 4. Feature Gaps
- ❌ No memory versioning/rollback
- ❌ No real-time collaboration
- ❌ No visual knowledge graph
- ❌ Limited analytics dashboard

### 5. Operational Complexity
- ❌ Multiple fallback paths increase debugging difficulty
- ❌ Mode switching can be confusing
- ❌ Bin partitioning requires tuning
- ❌ Importance scoring is subjective

---

## 🎪 Implementation Status

### Fully Implemented

| Feature | Status | Component |
|---------|--------|-----------|
| MCP Server Protocol | ✅ Complete | `mcp-server.ts` |
| Tool: memory_store | ✅ Complete | `tools/store.ts` |
| Tool: memory_query | ✅ Complete | `tools/query.ts` |
| Tool: memory_ingest | ✅ Complete | `tools/ingest.ts` |
| Tool: memory_compress | ✅ Complete | `tools/compress.ts` |
| Tool: memory_stats | ✅ Complete | `tools/stats.ts` |
| Tool: memory_forget | ✅ Complete | `tools/forget.ts` |
| Tool: memory_export | ✅ Complete | `tools/export.ts` |
| Tool: memory_import | ✅ Complete | `tools/import.ts` |
| SQLite Memory Store | ✅ Complete | `memory-store.ts` |
| LLM Bridge (Llama) | ✅ Complete | `llama-bridge.ts` |
| Local Embeddings | ✅ Complete | `local-embed.ts` |
| TOON Distillation | ✅ Complete | `llama-bridge.ts` |
| Heuristic Fallback | ✅ Complete | Multiple files |
| Query Expansion | ✅ Complete | `query-expander.ts` |
| Semantic Re-ranking | ✅ Complete | `reranker.ts` |
| Code/Text Chunking | ✅ Complete | `chunker.ts` |
| Context Compression | ✅ Complete | `compress.ts` |

### Database Schema

```sql
CREATE TABLE memory_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT UNIQUE NOT NULL,
  project_id TEXT NOT NULL,
  topic TEXT DEFAULT 'general',
  content_toon TEXT,
  content_seed TEXT,
  content_raw TEXT NOT NULL,
  vector BLOB,
  bin_id INTEGER,
  importance_score REAL DEFAULT 5.0,
  status TEXT DEFAULT 'active',
  metadata JSON,
  last_accessed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memory_bin ON memory_facts(bin_id);
CREATE INDEX idx_memory_project ON memory_facts(project_id);
CREATE INDEX idx_memory_topic ON memory_facts(topic);
CREATE INDEX idx_memory_status ON memory_facts(status);
CREATE INDEX idx_memory_importance ON memory_facts(importance_score);
```

---

## 🚧 Roadmap

### Phase 1: Core Stability (Q1 2025)
- [ ] Comprehensive test suite
- [ ] Error handling improvements
- [ ] Performance benchmarking
- [ ] Documentation completion
- [ ] npm package publication

### Phase 2: Enhanced Features (Q2 2025)
- [ ] Auto model download
- [ ] Memory versioning system
- [ ] Configuration GUI
- [ ] Batch operations API
- [ ] Real-time sync preview

### Phase 3: Scale & Performance (Q3 2025)
- [ ] Cross-project memory federation
- [ ] Advanced ML-based consolidation
- [ ] Memory analytics dashboard
- [ ] Distributed memory support
- [ ] Performance optimization

### Phase 4: Ecosystem (Q4 2025)
- [ ] Memory marketplace
- [ ] Plugin architecture
- [ ] Community templates
- [ ] Visual knowledge graph
- [ ] Natural language queries

---

## 🧪 Technical Challenges

### Challenge 1: Embedding Quality vs Speed

**Problem:** High-quality embeddings require API calls or heavy local models.

**Solution:** Hybrid approach with `bge-micro-v2` (fast, decent quality) and keyword fallback.

**Trade-off:** ~85% of cloud quality at 10x speed improvement.

### Challenge 2: Cross-IDE Compatibility

**Problem:** Different IDEs have different MCP implementations and quirks.

**Solution:** Strict MCP spec compliance + extensive testing matrix.

**Trade-off:** Some IDE-specific features may not be universally available.

### Challenge 3: Memory Isolation

**Problem:** Multiple projects need isolated memory spaces without interference.

**Solution:** Project-scoped database paths and project_id partitioning.

**Trade-off:** Slight storage overhead but complete isolation.

### Challenge 4: Model Distribution

**Problem:** Large model files (~500MB) create friction for new users.

**Solution:** Lazy loading with automatic download on first use.

**Trade-off:** Initial delay but seamless thereafter.

### Challenge 5: Context Window Management

**Problem:** Retrieved memories must fit within client's context window.

**Solution:** Configurable result limits + TOON compression + smart truncation.

**Trade-off:** May miss some relevant results but stays within budget.

---

## 📊 Performance Targets

| Metric | Target | Priority |
|--------|--------|----------|
| Tool Response Time (P50) | <100ms | High |
| Tool Response Time (P99) | <500ms | High |
| Memory Storage | <50ms | Medium |
| Semantic Query | <200ms | High |
| Document Ingestion | >50 chunks/sec | Medium |
| Compression Ratio | 60-80% | Medium |
| Memory Footprint | <200MB | Medium |
| Model Load Time | <3s (cached) | Low |
| Fallback Activation | <10ms | High |

---

## 📦 Package Structure

```
@memory-agent/mcp-server/
├── package.json
├── README.md
├── LICENSE
├── dist/
│   ├── index.js              # Main entry point
│   ├── mcp-server.js         # MCP protocol handler
│   ├── tools/
│   │   ├── store.js
│   │   ├── query.js
│   │   ├── ingest.js
│   │   ├── compress.js
│   │   ├── stats.js
│   │   ├── forget.js
│   │   ├── export.js
│   │   └── import.js
│   ├── memory/
│   │   ├── memory-store.js
│   │   ├── llama-bridge.js
│   │   ├── local-embed.js
│   │   ├── query-expander.js
│   │   ├── reranker.js
│   │   ├── chunker.js
│   │   └── compress.js
│   └── utils/
│       ├── tokenizer.js
│       └── logger.js
├── src/
│   └── [TypeScript sources]
├── models/
│   └── .gitkeep              # Models downloaded here
├── tests/
│   ├── unit/
│   └── integration/
└── docs/
    ├── API.md
    ├── CONFIGURATION.md
    └── EXAMPLES.md
```

---

## 🔐 Security Considerations

### Data Privacy
- All data stored locally by default
- No telemetry or analytics
- No external network calls (except optional model download)
- User controls all data

### Access Control
- Memory isolated per project
- No cross-project access without explicit export/import
- Environment variable based configuration
- No hardcoded secrets

### Input Validation
- All tool inputs validated against JSON schemas
- SQL injection protection via parameterized queries
- Path traversal prevention
- File type restrictions for ingestion

---

## 📚 References

### MCP Specification
- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/anthropics/mcp-typescript)

### Compatible Clients
- [Claude Desktop](https://claude.ai)
- [Cursor IDE](https://cursor.sh)
- [Windsurf](https://codeium.com/windsurf)
- [Continue.dev](https://continue.dev)

### Dependencies
- [node-llama-cpp](https://github.com/withcatai/node-llama-cpp)
- [@xenova/transformers](https://huggingface.co/docs/transformers.js)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

## 📝 Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - Standard for AI-IDE communication |
| **TOON** | Token-Oriented Object Notation - `key:val\|key:val` format |
| **Neural Seed** | Ultra-compressed 5-8 character knowledge representation |
| **Bin Partitioning** | Vector space division for fast retrieval |
| **Context Rot** | Performance degradation from bloated context |
| **Super Node** | Synthesized knowledge from multiple fragments |
| **Jaccard Similarity** | Set-based similarity: intersection / union |
| **Cosine Similarity** | Vector-based similarity metric |
| **Full AI Mode** | Operation with local LLM + embeddings |
| **Lite Mode** | Operation with heuristics only |

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development Setup
- Pull Request Process
- Testing Guidelines

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

**End of PRD**

*This document describes Memory-Agent as a standalone MCP server for universal IDE compatibility.*