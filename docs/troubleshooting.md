# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with Memory-Agent MCP.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Memory Operations](#memory-operations)
- [Client-Specific Issues](#client-specific-issues)
- [Debug Mode](#debug-mode)
- [FAQ](#faq)

---

## Installation Issues

### Issue: Bun Not Found

**Symptom:**
```
command not found: bun
```

**Cause:** Bun is not installed or not in PATH.

**Solution:**
```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Restart your shell
source ~/.bashrc  # or ~/.zshrc

# Verify installation
bun --version
```

**Alternative:** Use Node.js instead
```bash
# Node.js >= 18.0.0 is also supported
node --version
```

---

### Issue: Dependencies Installation Failed

**Symptom:**
```
error: Failed to install dependencies
```

**Cause:** Network issues, lockfile conflicts, or permission problems.

**Solutions:**

**Option 1: Clean install**
```bash
rm -rf node_modules bun.lockb
bun install
```

**Option 2: Use npm instead**
```bash
npm install
```

**Option 3: Check permissions**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

---

### Issue: TypeScript Compilation Errors

**Symptom:**
```
error: TypeScript compilation failed
```

**Cause:** Type mismatches or missing dependencies.

**Solution:**
```bash
# Check TypeScript version
bunx tsc --version

# Reinstall dev dependencies
bun install --dev

# Run type check
bun run typecheck

# If still failing, clean and rebuild
rm -rf node_modules dist
bun install
bun run build
```

---

## Configuration Problems

### Issue: MCP Server Not Loading in Client

**Symptom:** AI assistant doesn't have access to memory tools.

**Diagnosis:**
```bash
# Check if server runs standalone
bun run src/index.ts

# Should see: "Memory-Agent MCP server started"
```

**Solutions:**

**1. Verify Configuration Path**
```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
type %APPDATA%\Claude\claude_desktop_config.json
```

**2. Check File Paths**
```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/ABSOLUTE/PATH/TO/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/YOUR/PROJECT"
      }
    }
  }
}
```

**3. Verify Command Accessibility**
```bash
# Test that bun is accessible
which bun

# Test server starts manually
MEMORY_PROJECT_ROOT=/path/to/project bun run src/index.ts
```

---

### Issue: Environment Variables Not Recognized

**Symptom:** Server uses default settings despite environment variables.

**Cause:** Variables not set correctly or not loaded.

**Solutions:**

**Option 1: Set in MCP config**
```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_MODE": "full",
        "MEMORY_PROJECT_ROOT": "/path/to/project",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

**Option 2: Use .env file**
```bash
# Create .env in project root
cat > .env << EOF
MEMORY_MODE=full
MEMORY_PROJECT_ROOT=/path/to/project
LOG_LEVEL=INFO
EOF

# Verify it loads
bun run src/index.ts
```

**Option 3: Set system-wide**
```bash
# Add to ~/.bashrc or ~/.zshrc
export MEMORY_MODE=full
export MEMORY_PROJECT_ROOT=/path/to/project
```

---

### Issue: Database Path Problems

**Symptom:**
```
Error: unable to open database file
```

**Cause:** Database directory doesn't exist or wrong permissions.

**Solutions:**

**1. Create directory**
```bash
mkdir -p .memory
chmod 755 .memory
```

**2. Check path**
```bash
# Verify MEMORY_DB_PATH
echo $MEMORY_DB_PATH

# Or use absolute path
MEMORY_DB_PATH=/absolute/path/to/memory.db
```

**3. Fix permissions**
```bash
# Fix ownership
chown -R $(whoami) .memory/

# Fix permissions
chmod 644 .memory/memory.db
```

---

## Runtime Errors

### Issue: Database Locked

**Symptom:**
```
Error: database is locked
```

**Cause:** Multiple processes accessing database or stale lock files.

**Solutions:**

**1. Remove lock files**
```bash
rm -f .memory/memory.db-wal
rm -f .memory/memory.db-shm
```

**2. Check for multiple instances**
```bash
# Find running instances
ps aux | grep memory-agent

# Kill if needed
pkill -f memory-agent-mcp
```

**3. Enable WAL mode properly**
```bash
# In configuration
MEMORY_DB_WAL=true
```

---

### Issue: Memory Store Fails

**Symptom:**
```
Error: Failed to store memory
```

**Diagnosis:**
```bash
# Enable debug logging
DEBUG=memory-agent:* bun run dev

# Check database
sqlite3 .memory/memory.db "SELECT COUNT(*) FROM memory_facts;"
```

**Solutions:**

**1. Validate input**
```typescript
// Ensure content is valid TOON format
memory_store({
  content: "key:value|key:value",  // Valid
  topic: "decision",
  importance: 0.5
})
```

**2. Check content length**
```typescript
// Max 10,000 characters
content.length <= 10000
```

**3. Verify database integrity**
```bash
sqlite3 .memory/memory.db "PRAGMA integrity_check;"
```

---

### Issue: Query Returns No Results

**Symptom:** Query returns empty array despite memories existing.

**Diagnosis:**
```bash
# Check if memories exist
sqlite3 .memory/memory.db "SELECT COUNT(*) FROM memory_facts;"

# View recent memories
sqlite3 .memory/memory.db "SELECT * FROM memory_facts ORDER BY created_at DESC LIMIT 5;"
```

**Solutions:**

**1. Use broader search terms**
```typescript
// Too specific
memory_query({ query: "postgresql database decision 2024-01-19" })

// Better
memory_query({ query: "database decision" })
```

**2. Check importance threshold**
```typescript
// Include low importance memories
memory_query({ 
  query: "database",
  min_importance: 0.0  // Default is 0.3
})
```

**3. Try Lite Mode keywords**
```typescript
// In Lite Mode, use exact keywords
memory_query({ query: "postgres postgresql database" })
```

**4. Increase limit**
```typescript
memory_query({ 
  query: "database",
  limit: 20  // Default is 10
})
```

---

### Issue: Embedding Model Not Loading (Full AI Mode)

**Symptom:**
```
Error: Failed to load embedding model
```

**Cause:** Model not downloaded or wrong path.

**Solutions:**

**1. Download models**
```bash
bun run models:download
```

**2. Check model path**
```bash
# Default location
ls -la ~/.memory-agent/models/

# Or custom path
MEMORY_MODEL_PATH=/path/to/models
```

**3. Verify model files**
```bash
# Should see model files
ls ~/.memory-agent/models/all-MiniLM-L6-v2/
```

**4. Fallback to Lite Mode**
```bash
# If models unavailable, use Lite Mode
MEMORY_MODE=lite
```

---

## Performance Issues

### Issue: Slow Query Performance

**Symptom:** Queries taking >500ms consistently.

**Diagnosis:**
```bash
# Enable performance logging
LOG_LEVEL=DEBUG
DEBUG=memory-agent:query

# Check database size
sqlite3 .memory/memory.db "SELECT COUNT(*) FROM memory_facts;"

# Check database file size
ls -lh .memory/memory.db
```

**Solutions:**

**1. Use Lite Mode**
```bash
MEMORY_MODE=lite
```

**2. Reduce result limit**
```typescript
memory_query({ 
  query: "search terms",
  limit: 5  // Instead of 10 or 20
})
```

**3. Add more specific queries**
```typescript
// Instead of broad search
memory_query({ query: "bug" })

// Use specific terms
memory_query({ query: "auth jwt timeout bug" })
```

**4. Run maintenance**
```bash
# Compress old memories
bun run memory compress

# Apply decay
bun run memory decay

# Vacuum database
sqlite3 .memory/memory.db "VACUUM;"
```

**5. Archive old memories**
```typescript
memory_review({
  action: "list_unreviewed",
  filters: { older_than_days: 90 }
})
```

---

### Issue: High Memory Usage

**Symptom:** Server consuming excessive RAM.

**Diagnosis:**
```bash
# Check memory usage
ps aux | grep memory-agent

# Monitor in real-time
top -pid $(pgrep -f memory-agent)
```

**Solutions:**

**1. Switch to Lite Mode**
```bash
MEMORY_MODE=lite
```

**2. Reduce cache size**
```bash
MEMORY_CACHE_SIZE=50  # Default is 100
```

**3. Disable embedding cache**
```bash
MEMORY_EMBEDDING_CACHE=false
```

**4. Limit database size**
```bash
MEMORY_MAX_MEMORIES=10000
```

---

### Issue: Slow Startup Time

**Symptom:** Server takes >10 seconds to start.

**Cause:** Large database or model loading (Full AI Mode).

**Solutions:**

**1. Use Lite Mode**
```bash
MEMORY_MODE=lite
# Startup: <1 second
```

**2. Optimize database**
```bash
# Vacuum database
sqlite3 .memory/memory.db "VACUUM;"

# Rebuild indexes
sqlite3 .memory/memory.db "REINDEX;"
```

**3. Archive old memories**
```typescript
// Export and archive old memories
memory_export({ older_than_days: 180 })
```

---

## Memory Operations

### Issue: Duplicate Memories

**Symptom:** Same memory stored multiple times.

**Cause:** No duplicate detection (by design) or repeated storage.

**Solutions:**

**1. Manual deduplication**
```typescript
// Query for existing
const existing = await memory_query({ query: "decision postgres" })

// Only store if not found
if (existing.results.length === 0) {
  await memory_store({ content: "...", topic: "decision" })
}
```

**2. Use memory review**
```typescript
memory_review({
  action: "list_unreviewed",
  filters: { topic: "decision" }
})
// Then delete duplicates
```

**3. Enable experimental duplicate detection**
```bash
MEMORY_EXPERIMENTAL=true
MEMORY_DUPLICATE_DETECTION=true
```

---

### Issue: Incorrect Importance Scores

**Symptom:** Memories have wrong importance values.

**Cause:** Manual scoring errors or decay miscalculation.

**Solutions:**

**1. Manually update importance**
```typescript
memory_review({
  action: "edit",
  memory_id: "mem_abc123",
  edits: { importance: 0.9 }
})
```

**2. Promote important memories**
```typescript
memory_review({
  action: "promote",
  memory_id: "mem_abc123"
})
// Sets importance to 1.0
```

**3. Demote less important**
```typescript
memory_review({
  action: "demote",
  memory_id: "mem_abc123"
})
// Multiplies importance by 0.5
```

---

### Issue: Memories Not Decaying

**Symptom:** Old memories still have high importance.

**Cause:** Decay not enabled or not run recently.

**Solutions:**

**1. Enable decay**
```bash
MEMORY_DECAY_ENABLED=true
```

**2. Run decay manually**
```typescript
memory_decay({
  dry_run: false
})
```

**3. Check decay settings**
```bash
MEMORY_DECAY_RATE=0.95
MEMORY_DECAY_INTERVAL=30  # days
```

---

## Client-Specific Issues

### Claude Desktop

**Issue: Server not appearing in Claude**

**Solution:**
1. Restart Claude Desktop completely
2. Check configuration file location
3. Verify JSON syntax is valid
4. Check Claude Desktop logs: `~/Library/Logs/Claude/`

**Issue: Tools not working**

**Solution:**
```bash
# Test server standalone
MEMORY_PROJECT_ROOT=/path/to/project bun run src/index.ts

# Check for errors in Claude Console
# Window -> Toggle Developer Tools
```

---

### Cursor IDE

**Issue: MCP server not recognized**

**Solution:**
1. Reload window: `Cmd+Shift+P` → "Reload Window"
2. Check `.cursor/mcp.json` exists
3. Verify JSON syntax
4. Restart Cursor

**Issue: Memory context not injected**

**Solution:**
1. Check system prompt is configured
2. Verify `.cursorrules` file exists
3. Ensure MEMORY_PROJECT_ROOT points to workspace

---

### Windsurf

**Issue: Connection failed**

**Solution:**
1. Check Windsurf settings
2. Verify server path is absolute
3. Check server starts manually
4. Restart Windsurf

---

### VS Code (Continue.dev)

**Issue: Continue.dev not loading MCP**

**Solution:**
1. Check `~/.continue/config.json`
2. Verify MCP server configuration
3. Reload VS Code window
4. Check Continue.dev output panel

---

## Debug Mode

### Enable Debug Logging

```bash
# General debug mode
DEBUG=memory-agent:*

# Specific modules
DEBUG=memory-agent:query,memory-agent:store

# MCP protocol logging
MCP_DEBUG=true

# Set log level
LOG_LEVEL=DEBUG
```

### Debug Output Location

```bash
# Console (default)
# Logs appear in terminal

# File logging
MEMORY_LOG_FILE=/var/log/memory-agent.log
MEMORY_LOG_FORMAT=json
```

### Useful Debug Commands

```bash
# Check server status
ps aux | grep memory-agent

# Monitor database
sqlite3 .memory/memory.db ".tables"
sqlite3 .memory/memory.db "SELECT COUNT(*) FROM memory_facts;"

# Check recent memories
sqlite3 .memory/memory.db "SELECT id, topic, created_at FROM memory_facts ORDER BY created_at DESC LIMIT 10;"

# Database integrity
sqlite3 .memory/memory.db "PRAGMA integrity_check;"

# Database stats
sqlite3 .memory/memory.db "PRAGMA database_list;"
sqlite3 .memory/memory.db "PRAGMA page_count;"
sqlite3 .memory/memory.db "PRAGMA page_size;"
```

### Manual Testing

```bash
# Start server interactively
bun run src/index.ts

# In another terminal, test tools
# (Use MCP client or direct tool calls)

# Check memory stats
# Call memory_stats tool

# Test query
# Call memory_query tool
```

---

## FAQ

### Q: How do I reset all memories?

**A:**
```bash
# Stop server first
pkill -f memory-agent

# Delete database
rm -rf .memory/memory.db*

# Restart server
bun run src/index.ts
```

### Q: Can I use this without an internet connection?

**A:** Yes! Memory-Agent MCP works completely offline. Only Full AI Mode requires initial model download (once).

### Q: How do I backup my memories?

**A:**
```typescript
// Export to JSON
memory_export({ 
  format: "json",
  output_path: "backup.json"
})

// Or copy database
cp .memory/memory.db backup/memory-$(date +%Y%m%d).db
```

### Q: Can I share memories between projects?

**A:** Yes, two options:

**Option 1: Shared database**
```bash
MEMORY_DB_PATH=/shared/location/memory.db
```

**Option 2: Export/Import**
```typescript
// Export from project A
const exported = memory_export({})

// Import to project B
memory_import({ data: exported })
```

### Q: Why is Lite Mode faster?

**A:** Lite Mode uses keyword matching (SQLite FTS) instead of vector embeddings. No AI model is loaded, reducing overhead significantly.

### Q: How do I migrate from Lite to Full AI Mode?

**A:**
```bash
# 1. Download models
bun run models:download

# 2. Change mode
MEMORY_MODE=full

# 3. Restart server

# 4. Existing memories will work
# New memories get embeddings
# Old memories get embeddings on next access
```

### Q: Can I use a different embedding model?

**A:** Yes:
```bash
# Set custom model path
MEMORY_MODEL_PATH=/path/to/custom/model

# Set embedding dimensions
MEMORY_EMBEDDING_DIM=768
```

### Q: How do I see what's stored in memory?

**A:**
```typescript
// Get statistics
memory_stats()

// Query all memories
memory_query({ query: "", limit: 1000 })

// Or check database directly
sqlite3 .memory/memory.db "SELECT * FROM memory_facts;"
```

### Q: Is my data sent to any external services?

**A:** No. All data stays local in SQLite. No network calls, no external APIs, complete privacy.

### Q: How do I move my database to another machine?

**A:**
```bash
# Option 1: Copy database file
scp .memory/memory.db user@remote:/path/to/project/.memory/

# Option 2: Export and import
# On source machine
memory_export({})

# On target machine
memory_import({ data: exported_data })
```

---

## Getting Help

If this guide doesn't solve your issue:

1. **Check Logs**: Enable debug mode and review logs
2. **Search Issues**: [GitHub Issues](https://github.com/memory-agent/memory-agent-mcp/issues)
3. **Ask Community**: [GitHub Discussions](https://github.com/memory-agent/memory-agent-mcp/discussions)
4. **Report Bug**: Open an issue with:
   - Error message
   - Steps to reproduce
   - Debug logs
   - Environment details

### Information to Include in Bug Reports

```markdown
**Environment:**
- OS: [e.g., macOS 14.0]
- Bun/Node Version: [e.g., bun 1.0.20]
- Memory-Agent Version: [e.g., 2.0.0]
- Mode: [Full AI / Lite]

**Configuration:**
- MEMORY_MODE: [value]
- MEMORY_PROJECT_ROOT: [value]
- Client: [Claude Desktop / Cursor / etc.]

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Logs:**
```
Paste relevant logs here
```

**Additional Context:**
Any other relevant information
```

---

## Related Documentation

- [Getting Started Guide](./getting-started.md)
- [Configuration Reference](./configuration.md)
- [Architecture Overview](./architecture.md)
- [API Reference](./api-reference.md)

---

**Last Updated:** 2025-01-19  
**Version:** 2.0.0