# System Prompt Templates

This directory contains system prompt templates for Memory-Agent MCP that enable automatic memory integration with AI assistants.

## Available Templates

### 1. `system-prompt.md` (Full AI Mode)
**Use when:** You have Full AI Mode enabled with vector embeddings and semantic search capabilities.

**Features:**
- Semantic search (concept-based queries)
- Advanced pattern detection
- Rich context understanding
- Best for complex projects with lots of context

**Requirements:**
- Full AI Mode enabled
- Vector embeddings model downloaded
- More memory/resources available

### 2. `system-prompt-lite.md` (Lite Mode)
**Use when:** You want lightweight, zero-dependency memory with keyword-based search.

**Features:**
- Keyword-based search (exact term matching)
- Lightweight and fast
- Zero external dependencies
- Best for simpler projects or resource-constrained environments

**Requirements:**
- Lite Mode enabled
- No model downloads required
- Minimal resource usage

---

## How to Use

### Step 1: Choose Your Template

- **Use `system-prompt.md`** if you want semantic search and have resources for embeddings
- **Use `system-prompt-lite.md`** if you want fast, lightweight keyword search

### Step 2: Configure Your MCP Client

Copy the template content into your MCP client's system prompt configuration.

---

## Client Configuration Examples

### Claude Desktop

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
**File:** `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "node",
      "args": ["/path/to/memory-agent-mcp/dist/index.js"],
      "env": {
        "MEMORY_MODE": "full"
      }
    }
  }
}
```

**System Prompt Location:**
1. Open Claude Desktop
2. Go to Settings → System Prompt
3. Paste the contents of `system-prompt.md` or `system-prompt-lite.md`

### Cursor IDE

**Configuration File:** `.cursorrules` in your project root

```
# Include the system prompt content here
```

**Or in Cursor Settings:**
1. Open Settings → General → System Prompt
2. Paste the template content

**MCP Server Config:** `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Windsurf

**Configuration:** Windsurf settings

```json
{
  "memory": {
    "systemPrompt": "path/to/system-prompt.md",
    "mcpServer": {
      "command": "bun",
      "args": ["run", "memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full"
      }
    }
  }
}
```

### VS Code (Continue.dev)

**Config File:** `~/.continue/config.json`

```json
{
  "models": [...],
  "systemMessage": "PASTE_SYSTEM_PROMPT_CONTENT_HERE",
  "mcpServers": {
    "memory-agent": {
      "command": "node",
      "args": ["/path/to/memory-agent-mcp/dist/index.js"],
      "env": {
        "MEMORY_MODE": "full"
      }
    }
  }
}
```

---

## Mode Selection Guide

### Choose Full AI Mode When:
- ✅ You want semantic/conceptual search
- ✅ You have sufficient disk space (~500MB for models)
- ✅ You're working on complex projects with lots of context
- ✅ You want the AI to understand intent, not just keywords

### Choose Lite Mode When:
- ✅ You want fast startup and minimal resources
- ✅ You're working on simpler projects
- ✅ You prefer exact keyword matching
- ✅ You have limited disk space or memory

---

## Environment Variables

Configure Memory-Agent MCP behavior:

```bash
# Mode selection
MEMORY_MODE=full          # or 'lite'

# Project root (auto-detected if not set)
MEMORY_PROJECT_ROOT=/path/to/your/project

# Database location (default: .memory/memory.db)
MEMORY_DB_PATH=/custom/path/memory.db

# Log level
MEMORY_LOG_LEVEL=info     # debug, info, warn, error
```

---

## How It Works

### Query Protocol (Before Answering)
1. User asks an ambiguous question: "fix the bug"
2. AI queries memory: `memory_query({ query: "recent bugs", limit: 3 })`
3. AI receives context about recent bugs
4. AI provides informed response using that context
5. User never knows memory was queried

### Storage Protocol (After Answering)
1. AI makes a decision: "Let's use PostgreSQL"
2. AI stores the decision: `memory_store({ content: "decision:use-postgres|...", topic: "decision", importance: 0.9 })`
3. Future sessions can retrieve this decision
4. Memory persists across sessions and conversations

---

## TOON Format Reference

**Token-Oriented Object Notation** - Efficient structured storage:

```
key:value|key:value|key:value
```

### Common Keys:
- `decision` - What was decided
- `reason` - Why it was decided
- `file` - File location
- `line` - Line number
- `status` - Current status
- `date` - Date (YYYY-MM-DD)
- `severity` - Issue severity
- `impact` - Impact level

### Examples:
```
decision:use-postgres|reason:better-json|date:2025-01-19|impact:high
bug:jwt-timeout|file:auth.ts|line:45|status:fixed|severity:high
pattern:repository|location:src/repo/*.ts|convention:active-record
config:database|type:postgres|host:localhost|port:5432
```

---

## Topic Categories

| Topic | Usage | Example |
|-------|-------|---------|
| `decision` | Technology/architecture choices | "decision:use-postgres\|..." |
| `bug` | Issues found or fixed | "bug:auth-timeout\|..." |
| `pattern` | Code patterns/conventions | "pattern:repository\|..." |
| `architecture` | System design | "architecture:microservices\|..." |
| `api` | API design/endpoints | "api:user-endpoints\|..." |
| `config` | Configuration choices | "config:database\|..." |
| `general` | Other information | "info:project-name\|..." |

---

## Importance Scoring

Score memories from 0.0 to 1.0:

- **0.9-1.0 (Critical)**: Architecture decisions, security issues, breaking changes
- **0.7-0.8 (High)**: Important bugs, key patterns, critical config
- **0.5-0.6 (Normal)**: Standard decisions, typical information
- **0.3-0.4 (Low)**: Minor details, occasional reference
- **0.1-0.2 (Trivial)**: Rarely needed, minimal impact

**Tips:**
- Not everything is critical (avoid over-scoring)
- Consider long-term value
- Trivial memories may be auto-deleted

---

## Troubleshooting

### AI Not Querying Memory
**Symptoms:** AI doesn't retrieve context for ambiguous queries

**Solutions:**
1. Verify system prompt is properly configured
2. Check that memories exist (call `memory_query` manually)
3. Ensure search terms match stored content
4. Try more specific search terms (especially in Lite Mode)

### AI Not Storing Memories
**Symptoms:** Important decisions aren't being saved

**Solutions:**
1. Verify system prompt is loaded
2. Check if the information meets storage criteria
3. Manually store a test memory to verify functionality
4. Review importance scoring (too low = may not be prioritized)

### Too Many Irrelevant Memories
**Symptoms:** Memory queries return noise

**Solutions:**
1. Lower the importance threshold for queries
2. Use more specific search terms
3. Review and clean up low-quality memories
4. Adjust the `limit` parameter in queries

### Poor Search Results (Lite Mode)
**Symptoms:** Keyword search doesn't find relevant memories

**Solutions:**
1. Use exact keywords that appear in stored content
2. Try multiple related terms
3. Include file names, function names, or technical terms
4. Consider upgrading to Full AI Mode for semantic search

### Performance Issues
**Symptoms:** Slow queries or responses

**Solutions:**
1. Use Lite Mode for faster performance
2. Reduce the `limit` parameter in queries
3. Archive old, unneeded memories
4. Run memory decay to clean up low-importance items

---

## Testing Your Setup

### Test Query Protocol
```
1. Store a test memory:
   User: "Remember that I decided to use PostgreSQL for the database"
   AI should call: memory_store(...)

2. Start a new conversation

3. Query with ambiguous reference:
   User: "What database am I using?"
   AI should call: memory_query({ query: "database decision" })
   AI should respond with: "You're using PostgreSQL..."
```

### Test Storage Protocol
```
1. Make a decision:
   User: "Should I use Redis or Memcached for caching?"
   AI responds with recommendation

2. Check if stored:
   User: "What did we decide about caching?"
   AI should retrieve the previous decision
```

---

## Best Practices

### For Users
- Let the AI know when something is important
- Use consistent terminology
- Don't manually clear memory unless necessary
- Review memories occasionally with `memory_review`

### For AI Assistants
- Query memory when context is genuinely needed
- Store only what's truly useful long-term
- Use consistent TOON format
- Score importance realistically
- Never mention the memory system to users

---

## Advanced Configuration

### Hybrid Mode
You can combine Full AI Mode for semantic understanding with keyword fallback:

```bash
MEMORY_MODE=full
MEMORY_FALLBACK_TO_KEYWORD=true
```

### Custom Decay Settings
Adjust how quickly memories fade:

```bash
MEMORY_DECAY_ENABLED=true
MEMORY_DECAY_THRESHOLD=0.1
MEMORY_DECAY_INTERVAL_DAYS=30
```

### Project Isolation
Separate memories per project:

```bash
MEMORY_PROJECT_ROOT=/path/to/project
MEMORY_DB_PATH=.memory/memory.db  # Relative to project root
```

---

## Examples

### Example 1: Multi-Turn Conversation with Memory

**Turn 1:**
```
User: "I'm thinking about using PostgreSQL or MongoDB for this project"
AI: [Analyzes options] "I recommend PostgreSQL because..."
[AI stores: decision:use-postgres|reason:better-json|date:2025-01-19]
```

**Turn 2 (New Session):**
```
User: "Create the database schema"
AI: [Queries memory for "database schema decision"]
[Retrieves: decision to use PostgreSQL]
AI: "I'll create a PostgreSQL schema for you..."
```

### Example 2: Bug Tracking with Memory

**Session 1:**
```
User: "There's an error in the authentication"
AI: [Diagnoses] "The JWT token is expiring too quickly..."
[AI stores: bug:jwt-timeout|file:auth.ts|line:45|status:identified]
```

**Session 2 (Week Later):**
```
User: "What was that auth bug we found?"
AI: [Queries memory for "auth bug"]
[Retrieves: bug details]
AI: "We found a JWT timeout issue in auth.ts at line 45..."
```

---

## Support

- **Documentation:** [Link to full docs]
- **Issues:** [GitHub Issues]
- **Examples:** [Examples directory]

---

## Version

- Template Version: 2.0.0
- Last Updated: 2025-01-19
- Compatible with: Memory-Agent MCP v2.0.0+