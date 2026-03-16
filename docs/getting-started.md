# Getting Started with Memory-Agent MCP

Welcome to Memory-Agent MCP! This guide will get you up and running in under 5 minutes with persistent memory for your AI assistant.

## What is Memory-Agent MCP?

Memory-Agent MCP is a Model Context Protocol (MCP) server that gives AI assistants (like Claude, Cursor, Windsurf) persistent, intelligent memory across conversations and sessions.

### Key Benefits

- 🧠 **Persistent Memory**: Remember decisions, patterns, and learnings across sessions
- 🔍 **Smart Retrieval**: Find relevant context when you need it
- 🤖 **Auto-Learning**: Automatically extract and store valuable information
- 🔄 **Memory Lifecycle**: Automatic decay and cleanup of old memories
- 🛡️ **Privacy First**: All data stored locally in SQLite
- ⚡ **Two Modes**: Full AI (semantic search) or Lite (keyword search)

---

## Prerequisites

Before you begin, ensure you have:

- **Bun** >= 1.0.0 (recommended) OR **Node.js** >= 18.0.0
- An MCP-compatible client (Claude Desktop, Cursor, Windsurf, VS Code with Continue.dev)
- ~500MB disk space (for Full AI Mode) OR minimal space (for Lite Mode)

---

## Installation

### Option 1: Clone and Build (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/memory-agent/memory-agent-mcp.git
cd memory-agent-mcp

# Install dependencies
bun install

# Build the project
bun run build
```

### Option 2: NPM Package (Coming Soon)

```bash
# Install globally
npm install -g @memory-agent/mcp-server

# Or use with npx (no installation required)
npx @memory-agent/mcp-server
```

---

## Choose Your Mode

Memory-Agent MCP offers two modes to balance capability and resource usage:

### Full AI Mode (Recommended)
- ✅ Semantic search (understands intent, not just keywords)
- ✅ Advanced pattern detection
- ✅ Rich context understanding
- ❌ Requires ~500MB for embedding models
- **Best for**: Complex projects, long-term use, maximum intelligence

### Lite Mode
- ✅ Fast startup and minimal resources
- ✅ Zero external dependencies
- ✅ Keyword-based search
- ❌ Less sophisticated search
- **Best for**: Quick projects, resource-constrained environments

---

## First-Time Setup

### Step 1: Configure Your MCP Client

Choose your client below for specific instructions:

#### Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Memory-Agent MCP server:

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

#### Cursor IDE

Create or edit `.cursor/mcp.json` in your project root:

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

#### Windsurf

Add to your Windsurf settings:

```json
{
  "memory": {
    "mcpServer": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full"
      }
    }
  }
}
```

#### VS Code (Continue.dev)

Edit `~/.continue/config.json`:

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

### Step 2: Set Up System Prompt (Optional but Recommended)

For automatic memory integration, add the system prompt template to your AI client:

1. Navigate to the `prompts/` directory
2. Choose your template:
   - `system-prompt.md` for Full AI Mode
   - `system-prompt-lite.md` for Lite Mode
3. Copy the content into your client's system prompt configuration

**Example for Claude Desktop:**
1. Open Claude Desktop
2. Go to Settings → System Prompt
3. Paste the contents of `prompts/system-prompt.md`

This enables the AI to automatically query and store memories!

### Step 3: Restart Your Client

Restart your MCP client to load the Memory-Agent server:

- **Claude Desktop**: Quit and reopen
- **Cursor**: Reload window (Cmd+Shift+P → "Reload Window")
- **Windsurf**: Restart application
- **VS Code**: Reload window

---

## Basic Concepts

Before you start, understand these core concepts:

### Memory
A piece of information stored in the system. Each memory has:
- **Content**: The actual information (stored in TOON format)
- **Topic**: Category (decision, bug, pattern, architecture, api, config, general)
- **Importance**: Score from 0.0 to 1.0 (how critical is this memory?)
- **Access Count**: How many times it's been retrieved
- **Timestamps**: When it was created and last accessed

### TOON Format
Token-Oriented Object Notation - a structured format for efficient storage:
```
key:value|key:value|key:value
```

**Example:**
```
decision:use-postgres|reason:better-json|date:2025-01-19|impact:high
```

### Topics
Categories for organizing memories:
- **decision**: Technology/architecture choices
- **bug**: Issues discovered or fixed
- **pattern**: Code patterns or conventions
- **architecture**: System design decisions
- **api**: API design and endpoints
- **config**: Configuration choices
- **general**: Other useful information

### Importance Scoring
Rate memories from 0.0 to 1.0:
- **0.9-1.0**: Critical (architecture decisions, security issues)
- **0.7-0.8**: High (important bugs, key patterns)
- **0.5-0.6**: Normal (standard information)
- **0.3-0.4**: Low (minor details)
- **0.1-0.2**: Trivial (rarely needed)

### Memory Lifecycle
1. **Store**: Create new memories with `memory_store`
2. **Query**: Retrieve relevant memories with `memory_query`
3. **Access**: Each retrieval increments access count
4. **Decay**: Unused memories lose importance over time
5. **Archive/Delete**: Low importance memories may be removed

---

## Quick Start Tutorial

### Your First Memory

**Option A: With System Prompt (Automatic)**

Just have a conversation with your AI assistant:

```
You: I've decided to use PostgreSQL for the database because we need better JSON support.

AI: Great choice! PostgreSQL's JSONB support is excellent for...
[AI automatically stores this decision in memory]
```

**Option B: Manual (Direct Tool Call)**

Manually store a memory:

```
You: Please store this memory: I decided to use PostgreSQL for the database.

AI: [Calls memory_store tool]
✓ Memory stored successfully!
Memory ID: mem_abc123
Topic: decision
Importance: 0.5
```

### Retrieve Your Memory

**Option A: With System Prompt (Automatic)**

Start a new conversation and ask an ambiguous question:

```
You: What database are we using?

AI: [Queries memory for "database decision"]
Based on your previous decision, you're using PostgreSQL for better JSON support.
```

**Option B: Manual (Direct Tool Call)**

Manually query memories:

```
You: Query memories about the database decision.

AI: [Calls memory_query tool]
Found 1 memory:
- decision:use-postgres|reason:better-json|date:2025-01-19
  Importance: 0.5, Accessed: 2 times
```

### Verify It's Working

Check your memory statistics:

```
You: Show me memory statistics.

AI: [Calls memory_stats tool]
Memory Statistics:
- Total memories: 1
- By topic: decision (1)
- Average importance: 0.5
- Database size: 12 KB
```

---

## Next Steps

Now that you have Memory-Agent MCP running:

1. **📖 Read the Full Documentation**
   - [Configuration Guide](./configuration.md) - Customize your setup
   - [API Reference](./api-reference.md) - All 12 tools documented
   - [Architecture](./architecture.md) - How it works under the hood

2. **🔧 Configure for Your Workflow**
   - [Client Setup Guides](./client-setup/) - Detailed setup for each client
   - [System Prompt Templates](../prompts/) - Enable automatic memory

3. **📚 Learn Best Practices**
   - [Basic Usage Examples](./examples/basic-usage.md) - Common patterns
   - [Advanced Patterns](./examples/advanced-patterns.md) - Power user tips
   - [Memory Workflows](./examples/memory-workflows.md) - Effective memory management

4. **🚀 Start Using It**
   - Have conversations with your AI assistant
   - Let it automatically store important decisions
   - Query memory when you need context
   - Review and manage memories with `memory_review`

---

## Common Issues

### Server Not Loading

**Symptom**: AI doesn't seem to have memory tools available

**Solutions**:
1. Verify the server path in your MCP client config
2. Check that Bun/Node is installed and accessible
3. Restart your MCP client completely
4. Check client logs for error messages

### Memories Not Being Stored

**Symptom**: AI conversations but nothing in memory

**Solutions**:
1. Ensure system prompt is configured (see Step 2)
2. Manually test with: "Store a memory: test memory"
3. Check database file exists: `.memory/memory.db`
4. Verify MEMORY_PROJECT_ROOT is set correctly

### Search Not Finding Results

**Symptom**: Query returns empty results

**Solutions**:
1. Verify memories exist with `memory_stats`
2. Use more specific search terms (especially in Lite Mode)
3. Try different keywords related to your memory
4. Check if memories have low importance (may be filtered)

### Performance Issues

**Symptom**: Slow queries or responses

**Solutions**:
1. Switch to Lite Mode for faster performance
2. Reduce query limit (default is 10, try 3-5)
3. Run `memory_decay` to clean up old memories
4. Check database size with `memory_stats`

For more troubleshooting help, see the [Troubleshooting Guide](./troubleshooting.md).

---

## Getting Help

- **📖 Documentation**: [Full documentation index](../README.md)
- **🐛 Issues**: [GitHub Issues](https://github.com/memory-agent/memory-agent-mcp/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/memory-agent/memory-agent-mcp/discussions)
- **📧 Email**: support@memory-agent.dev

---

## What's Next?

- **5 minutes**: You're here! ✅
- **15 minutes**: [Configure advanced options](./configuration.md)
- **30 minutes**: [Learn all 12 tools](./api-reference.md)
- **1 hour**: [Master advanced patterns](./examples/advanced-patterns.md)

Welcome to persistent memory for AI assistants! 🎉