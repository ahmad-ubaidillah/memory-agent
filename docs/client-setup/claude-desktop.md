# Claude Desktop Setup Guide

Complete guide to setting up Memory-Agent MCP with Claude Desktop.

## Prerequisites

Before you begin, ensure you have:

- **Claude Desktop** installed (latest version)
- **Bun** >= 1.0.0 OR **Node.js** >= 18.0.0
- **Memory-Agent MCP** cloned or installed
- macOS or Windows (Linux support coming soon)

---

## Installation

### Step 1: Install Memory-Agent MCP

**Option A: Clone from Repository (Recommended)**

```bash
# Clone the repository
git clone https://github.com/memory-agent/memory-agent-mcp.git
cd memory-agent-mcp

# Install dependencies
bun install

# Build the project (if needed)
bun run build
```

**Option B: NPM Package (Coming Soon)**

```bash
# Install globally
npm install -g @memory-agent/mcp-server
```

### Step 2: Verify Installation

```bash
# Test the server starts
bun run src/index.ts

# You should see: "Memory-Agent MCP server started"
# Press Ctrl+C to stop
```

---

## Configuration

### Step 1: Locate Configuration File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Create if doesn't exist:**
```bash
# macOS
mkdir -p ~/Library/Application\ Support/Claude
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"
New-Item -ItemType File -Force -Path "$env:APPDATA\Claude\claude_desktop_config.json"
```

### Step 2: Add Memory-Agent MCP Server

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/path/to/your/project",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

**Important:** Replace paths with your actual paths!

### Step 3: Configuration Options

#### Full AI Mode (Recommended)

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/Users/username/projects/myproject",
        "MEMORY_DB_PATH": ".memory/memory.db",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

#### Lite Mode (Faster, No Models)

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "lite",
        "MEMORY_PROJECT_ROOT": "/Users/username/projects/myproject",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

#### Using Node.js Instead of Bun

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "node",
      "args": ["/path/to/memory-agent-mcp/dist/index.js"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/Users/username/projects/myproject"
      }
    }
  }
}
```

### Step 4: Multiple Projects

To use Memory-Agent MCP with multiple projects:

```json
{
  "mcpServers": {
    "memory-project-a": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/Users/username/projects/project-a",
        "MEMORY_MODE": "full"
      }
    },
    "memory-project-b": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/Users/username/projects/project-b",
        "MEMORY_MODE": "lite"
      }
    }
  }
}
```

---

## System Prompt Setup (Recommended)

For automatic memory integration, configure Claude's system prompt.

### Step 1: Open Claude Desktop Settings

1. Open Claude Desktop
2. Go to **Claude** menu → **Settings** (or press `Cmd + ,`)
3. Navigate to **System Prompt** section

### Step 2: Add Memory Protocol

Copy the content from `prompts/system-prompt.md` (for Full AI Mode) or `prompts/system-prompt-lite.md` (for Lite Mode) and paste it into the System Prompt field.

**Quick Copy:**

```bash
# View the system prompt
cat /path/to/memory-agent-mcp/prompts/system-prompt.md

# Or copy to clipboard (macOS)
cat /path/to/memory-agent-mcp/prompts/system-prompt.md | pbcopy
```

### Step 3: Save Settings

Click **Save** to apply the system prompt.

---

## Restart Claude Desktop

**Important:** You must restart Claude Desktop for changes to take effect.

**macOS:**
1. Quit Claude Desktop (`Cmd + Q`)
2. Reopen Claude Desktop

**Windows:**
1. Close Claude Desktop completely
2. Reopen Claude Desktop

---

## Verify Installation

### Step 1: Check MCP Server Status

In Claude Desktop, start a new conversation and ask:

```
What MCP tools do you have available?
```

Claude should respond with a list of tools including:
- memory_store
- memory_query
- memory_forget
- memory_stats
- memory_enhance_prompt
- memory_auto_learn
- memory_decay
- memory_review
- memory_ingest
- memory_compress
- memory_export
- memory_import

### Step 2: Test Memory Storage

```
Please store this memory: I decided to use PostgreSQL for the database because of better JSON support.
```

Claude should call the `memory_store` tool and confirm the memory was stored.

### Step 3: Test Memory Retrieval

Start a **new conversation** and ask:

```
What database did I decide to use?
```

Claude should query memory and respond with the PostgreSQL decision.

### Step 4: Check Memory Stats

```
Show me memory statistics.
```

Claude should call `memory_stats` and show you the current state of your memory database.

---

## Testing Checklist

- [ ] Claude Desktop restarted after configuration
- [ ] MCP server appears in Claude (check available tools)
- [ ] Can store a memory manually
- [ ] Can query a memory manually
- [ ] System prompt configured (optional but recommended)
- [ ] Automatic memory retrieval works (with system prompt)
- [ ] Memory stats show correct information

---

## Usage Examples

### Manual Memory Operations

**Store a Decision:**
```
Store this memory: We decided to use Redis for caching with a 1-hour TTL for session data.
```

**Query Memories:**
```
Query memories about caching decisions.
```

**Review Memories:**
```
Show me all memories about database decisions.
```

### Automatic Memory (with System Prompt)

**Have a natural conversation:**

```
You: I'm thinking about using MongoDB or PostgreSQL for this project.

Claude: Both are excellent choices. PostgreSQL offers ACID compliance and excellent JSON support through JSONB, while MongoDB provides flexibility with its document-based model...

[Automatically stores: decision:database-discussion|options:postgres-mongodb|status:evaluating]
```

**Later, in a new conversation:**

```
You: What were we considering for the database?

Claude: [Queries memory] You were evaluating PostgreSQL and MongoDB for your project. PostgreSQL was noted for its ACID compliance and JSONB support...
```

---

## Troubleshooting

### Issue: MCP Server Not Loading

**Symptoms:**
- No memory tools available
- Claude doesn't recognize memory commands

**Solutions:**

1. **Check Configuration File**
```bash
# Verify file exists
ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Check JSON syntax
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
```

2. **Verify Paths**
```bash
# Test server starts manually
MEMORY_PROJECT_ROOT=/path/to/project bun run /path/to/memory-agent-mcp/src/index.ts
```

3. **Check Claude Desktop Logs**
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Look for error messages about the memory-agent server
```

4. **Restart Claude Desktop Completely**
   - Quit Claude Desktop (Cmd+Q)
   - Wait 5 seconds
   - Reopen Claude Desktop

### Issue: Database Errors

**Symptoms:**
- "Database locked" errors
- Memories not storing

**Solutions:**

```bash
# Remove database lock files
rm -f /path/to/project/.memory/memory.db-wal
rm -f /path/to/project/.memory/memory.db-shm

# Check database permissions
ls -la /path/to/project/.memory/

# Fix permissions if needed
chmod 644 /path/to/project/.memory/memory.db
```

### Issue: Models Not Loading (Full AI Mode)

**Symptoms:**
- "Failed to load embedding model" error
- Slow performance

**Solutions:**

```bash
# Download models
cd /path/to/memory-agent-mcp
bun run models:download

# Or use Lite Mode instead
# Change MEMORY_MODE to "lite" in config
```

### Issue: System Prompt Not Working

**Symptoms:**
- Claude not automatically storing/querying memories

**Solutions:**

1. Verify system prompt is saved in Claude Desktop settings
2. Restart Claude Desktop after saving
3. Test with explicit tool calls first
4. Check system prompt format (should be plain text, not code)

### Issue: Performance Issues

**Symptoms:**
- Slow responses
- Timeouts

**Solutions:**

```json
// Switch to Lite Mode in configuration
{
  "env": {
    "MEMORY_MODE": "lite",
    "MEMORY_CACHE_SIZE": "50"
  }
}
```

---

## Debug Mode

### Enable Debug Logging

Edit your configuration:

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/path/to/project",
        "LOG_LEVEL": "DEBUG",
        "DEBUG": "memory-agent:*"
      }
    }
  }
}
```

### View Logs

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp-server-memory-agent.log

# Or check Console.app for Claude Desktop logs
```

### Test Server Standalone

```bash
# Run server manually with debug output
DEBUG=memory-agent:* LOG_LEVEL=DEBUG \
  MEMORY_PROJECT_ROOT=/path/to/project \
  bun run /path/to/memory-agent-mcp/src/index.ts
```

---

## Best Practices

### 1. Project Organization

- Use separate memory databases for different projects
- Set MEMORY_PROJECT_ROOT to your project directory
- Keep memories focused and relevant

### 2. Memory Quality

- Store meaningful decisions, not casual conversation
- Use TOON format consistently: `key:value|key:value`
- Set appropriate importance scores (not everything is 1.0)

### 3. System Prompt

- Configure system prompt for automatic memory
- Review stored memories periodically
- Adjust importance scores as needed

### 4. Maintenance

- Run `memory_decay` periodically (weekly or monthly)
- Review and clean up old memories
- Export backups regularly

### 5. Performance

- Use Lite Mode for faster responses
- Limit query results to 3-5 typically
- Compress old memories quarterly

---

## Advanced Configuration

### Custom Database Location

```json
{
  "env": {
    "MEMORY_DB_PATH": "/custom/location/memory.db"
  }
}
```

### Hybrid Mode (Semantic + Keyword)

```json
{
  "env": {
    "MEMORY_MODE": "full",
    "MEMORY_FALLBACK_TO_KEYWORD": "true"
  }
}
```

### Performance Tuning

```json
{
  "env": {
    "MEMORY_CACHE_SIZE": "500",
    "MEMORY_DB_POOL_SIZE": "10",
    "MEMORY_MAX_RESULTS": "50"
  }
}
```

### Decay Configuration

```json
{
  "env": {
    "MEMORY_DECAY_ENABLED": "true",
    "MEMORY_DECAY_RATE": "0.95",
    "MEMORY_DECAY_INTERVAL": "30"
  }
}
```

---

## Uninstallation

### Remove MCP Server

1. Edit `claude_desktop_config.json`
2. Remove the "memory-agent" entry
3. Save the file
4. Restart Claude Desktop

### Remove Memory Database

```bash
# Delete database
rm -rf /path/to/project/.memory/

# Or export first
# Ask Claude: "Export all my memories to JSON"
# Save the output, then delete
```

### Remove System Prompt

1. Open Claude Desktop Settings
2. Clear the System Prompt field
3. Save settings

---

## Getting Help

### Documentation
- [Getting Started Guide](../getting-started.md)
- [API Reference](../api-reference.md)
- [Troubleshooting Guide](../troubleshooting.md)

### Community
- [GitHub Issues](https://github.com/memory-agent/memory-agent-mcp/issues)
- [GitHub Discussions](https://github.com/memory-agent/memory-agent-mcp/discussions)

### Logs Location
- macOS: `~/Library/Logs/Claude/`
- Windows: `%APPDATA%\Claude\logs\`

---

## FAQ

**Q: Can I use Memory-Agent MCP with multiple Claude accounts?**
A: Yes, but each account needs separate configuration.

**Q: Does Memory-Agent MCP work offline?**
A: Yes! All data is stored locally. Only Full AI Mode requires initial model download.

**Q: Can I sync memories across devices?**
A: Currently, manual export/import is required. Cloud sync is planned for future versions.

**Q: How much disk space does Memory-Agent MCP use?**
A: Lite Mode: ~10-50MB. Full AI Mode: ~500MB (includes embedding models).

**Q: Can I use both Full AI Mode and Lite Mode?**
A: Yes, configure separate MCP servers for each mode in your config file.

---

## Next Steps

Now that you have Memory-Agent MCP set up with Claude Desktop:

1. **Try the getting started tutorial** in the [Getting Started Guide](../getting-started.md)
2. **Learn all 12 tools** in the [API Reference](../api-reference.md)
3. **Optimize your workflow** with [Usage Examples](../examples/basic-usage.md)
4. **Join the community** on [GitHub Discussions](https://github.com/memory-agent/memory-agent-mcp/discussions)

---

**Last Updated:** 2025-01-19  
**Compatible with:** Claude Desktop 1.0+  
**Version:** 2.0.0