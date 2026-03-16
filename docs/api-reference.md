# Memory-Agent MCP API Reference

Complete reference for all 12 MCP tools provided by Memory-Agent MCP.

## Table of Contents

- [Core Tools](#core-tools)
  - [memory_store](#memory_store)
  - [memory_query](#memory_query)
  - [memory_forget](#memory_forget)
  - [memory_stats](#memory_stats)
- [Interceptor Tools](#interceptor-tools)
  - [memory_enhance_prompt](#memory_enhance_prompt)
  - [memory_auto_learn](#memory_auto_learn)
  - [memory_decay](#memory_decay)
  - [memory_review](#memory_review)
- [Utility Tools](#utility-tools)
  - [memory_ingest](#memory_ingest)
  - [memory_compress](#memory_compress)
  - [memory_export](#memory_export)
  - [memory_import](#memory_import)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Response Format

All tools return responses in MCP standard format:

### Success Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": true, \"data\": {...}}"
    }
  ]
}
```

### Error Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": false, \"error\": \"Error message\"}"
    }
  ],
  "isError": true
}
```

---

## Core Tools

### memory_store

Store a new memory in the database with TOON format content.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `content` | string | Yes | - | Memory content in TOON format (key:value\|key:value) |
| `topic` | string | No | `"general"` | Category: decision, bug, pattern, architecture, api, config, general |
| `importance` | number | No | `0.5` | Importance score (0.0-1.0) |
| `metadata` | object | No | `{}` | Additional metadata as JSON object |

#### Input Schema

```json
{
  "content": "decision:use-postgres|reason:better-json|date:2025-01-19",
  "topic": "decision",
  "importance": 0.8,
  "metadata": {
    "project": "my-app",
    "decided_by": "team-lead"
  }
}
```

#### Success Response

```json
{
  "success": true,
  "memory_id": "mem_abc123def456",
  "topic": "decision",
  "importance": 0.8,
  "created_at": "2025-01-19T10:30:00Z",
  "message": "Memory stored successfully"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Content exceeds maximum length of 10000 characters",
  "field": "content"
}
```

#### Examples

**Store a Decision**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:use-redis|reason:caching-layer|date:2025-01-19|impact:high",
    "topic": "decision",
    "importance": 0.9
  }
}
```

**Store a Bug**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "bug:auth-timeout|file:src/auth.ts|line:45|status:fixed|severity:high",
    "topic": "bug",
    "importance": 0.8,
    "metadata": {
      "resolved_by": "john",
      "pull_request": 123
    }
  }
}
```

**Store a Pattern**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:repository|location:src/repo/*.ts|usage:data-access|convention:active-record",
    "topic": "pattern",
    "importance": 0.6
  }
}
```

#### Best Practices

- Use TOON format consistently: `key:value|key:value|key:value`
- Keep content under 1000 characters for better searchability
- Choose appropriate importance scores (not everything is 1.0)
- Use meaningful topic categories
- Include relevant metadata (dates, files, status)
- Avoid storing sensitive information

---

### memory_query

Query memories using semantic search (Full AI Mode) or keyword search (Lite Mode).

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query (keywords or natural language) |
| `limit` | number | No | `10` | Maximum number of results (1-100) |
| `topic` | string | No | - | Filter by topic category |
| `min_importance` | number | No | `0.0` | Minimum importance score filter |
| `max_importance` | number | No | `1.0` | Maximum importance score filter |

#### Input Schema

```json
{
  "query": "database decision postgresql",
  "limit": 5,
  "topic": "decision",
  "min_importance": 0.5
}
```

#### Success Response

```json
{
  "success": true,
  "results": [
    {
      "id": "mem_abc123",
      "topic": "decision",
      "content_toon": "decision:use-postgres|reason:better-json|date:2025-01-19",
      "importance_score": 0.8,
      "access_count": 5,
      "created_at": "2025-01-19T10:30:00Z",
      "last_accessed_at": "2025-01-20T14:22:00Z",
      "similarity": 0.92
    }
  ],
  "count": 1,
  "mode": "semantic",
  "query_time_ms": 45
}
```

#### Examples

**Query by Keywords**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "authentication bug timeout",
    "limit": 5
  }
}
```

**Query Specific Topic**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "database configuration",
    "topic": "config",
    "limit": 3
  }
}
```

**Query High-Importance Memories**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "architecture design",
    "min_importance": 0.8,
    "limit": 10
  }
}
```

#### Search Modes

**Full AI Mode (Semantic)**
- Understands intent and concepts
- Can find "database" when querying "data storage"
- Better for complex queries
- Uses vector embeddings

**Lite Mode (Keyword)**
- Exact keyword matching
- Faster performance
- Use specific terms
- Case-insensitive

#### Best Practices

- Use specific keywords in Lite Mode
- Limit results to what you need (3-5 typically)
- Filter by topic for focused results
- Use min_importance to filter noise
- Combine multiple related terms

---

### memory_forget

Delete a specific memory or multiple memories by criteria.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `memory_id` | string | Conditional | - | ID of memory to delete |
| `topic` | string | No | - | Delete all memories in topic (if no memory_id) |
| `older_than_days` | number | No | - | Delete memories older than N days |
| `importance_below` | number | No | - | Delete memories with importance below threshold |

#### Input Schema

**Delete by ID**
```json
{
  "memory_id": "mem_abc123def456"
}
```

**Delete by Criteria**
```json
{
  "topic": "general",
  "older_than_days": 90,
  "importance_below": 0.3
}
```

#### Success Response

```json
{
  "success": true,
  "deleted_count": 1,
  "memory_id": "mem_abc123def456",
  "message": "Memory deleted successfully"
}
```

#### Examples

**Delete Single Memory**
```json
{
  "name": "memory_forget",
  "arguments": {
    "memory_id": "mem_abc123"
  }
}
```

**Delete Old Low-Importance Memories**
```json
{
  "name": "memory_forget",
  "arguments": {
    "older_than_days": 180,
    "importance_below": 0.3
  }
}
```

**Delete All in Topic**
```json
{
  "name": "memory_forget",
  "arguments": {
    "topic": "temp"
  }
}
```

#### Best Practices

- Always specify memory_id for single deletions
- Use criteria-based deletion carefully
- Review memories before bulk deletion
- Export memories before deletion if unsure
- Use importance_below to clean up noise

---

### memory_stats

Get statistics about the memory database.

#### Parameters

None

#### Input Schema

```json
{}
```

#### Success Response

```json
{
  "success": true,
  "stats": {
    "total_memories": 150,
    "by_topic": {
      "decision": 45,
      "bug": 30,
      "pattern": 25,
      "architecture": 20,
      "config": 15,
      "api": 10,
      "general": 5
    },
    "by_importance": {
      "critical": 10,
      "high": 35,
      "normal": 70,
      "low": 35
    },
    "database_size_mb": 2.5,
    "oldest_memory": "2024-06-15T08:00:00Z",
    "newest_memory": "2025-01-19T14:30:00Z",
    "avg_importance": 0.58,
    "total_access_count": 1250
  },
  "mode": "full",
  "embedding_model": "all-MiniLM-L6-v2"
}
```

#### Examples

```json
{
  "name": "memory_stats",
  "arguments": {}
}
```

#### Use Cases

- Monitor memory growth
- Check topic distribution
- Identify cleanup needs
- Verify system health
- Track usage patterns

---

## Interceptor Tools

### memory_enhance_prompt

Pre-process user prompts by injecting relevant memory context.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `user_message` | string | Yes | - | The user's original message |
| `max_context` | number | No | `3` | Maximum memories to inject |

#### Input Schema

```json
{
  "user_message": "fix the bug",
  "max_context": 3
}
```

#### Success Response

```json
{
  "success": true,
  "enhanced_prompt": "[MEMORY_CONTEXT]\n- Recent bug: JWT timeout in auth.ts line 45\n- Pattern: Authentication middleware in src/middleware/\n[/MEMORY_CONTEXT]\n\nfix the bug",
  "context_found": true,
  "memories_used": ["mem_abc123", "mem_def456"],
  "query_time_ms": 35
}
```

**No Context Found**
```json
{
  "success": true,
  "enhanced_prompt": "fix the bug",
  "context_found": false,
  "memories_used": [],
  "query_time_ms": 12
}
```

#### Examples

**Ambiguous Query**
```json
{
  "name": "memory_enhance_prompt",
  "arguments": {
    "user_message": "update the configuration",
    "max_context": 3
  }
}
```

**Contextual Request**
```json
{
  "name": "memory_enhance_prompt",
  "arguments": {
    "user_message": "continue with the database work",
    "max_context": 5
  }
}
```

#### Pattern Detection

Automatically detects patterns that benefit from context:
- "fix the bug" → Searches for recent bugs
- "update the config" → Searches for configuration memories
- "continue with..." → Searches for recent work
- "the issue" → Searches for issues
- "that feature" → Searches for feature discussions

#### Best Practices

- Use for ambiguous or context-dependent queries
- Limit max_context to 3-5 for focused results
- Don't use for every message (only when needed)
- Let the AI decide when to call this tool
- Combine with system prompt for automation

---

### memory_auto_learn

Automatically extract and store learnings from conversation history.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `conversation` | array | Yes | - | Array of conversation messages |
| `auto_detect_importance` | boolean | No | `true` | Automatically score importance |

#### Input Schema

```json
{
  "conversation": [
    {
      "role": "user",
      "content": "Should I use PostgreSQL or MongoDB?"
    },
    {
      "role": "assistant",
      "content": "I recommend PostgreSQL for this project because of its excellent JSON support through JSONB, which gives you flexibility while maintaining ACID compliance."
    }
  ],
  "auto_detect_importance": true
}
```

#### Success Response

```json
{
  "success": true,
  "stored": true,
  "memory_id": "mem_xyz789",
  "content": "decision:use-postgres|reason:better-json-ACID-compliance|date:2025-01-19",
  "topic": "decision",
  "importance": 0.8,
  "confidence": 0.92,
  "reason": "Detected decision pattern in assistant response"
}
```

**Nothing to Store**
```json
{
  "success": true,
  "stored": false,
  "reason": "No learnings detected in conversation"
}
```

#### Examples

**Decision Detection**
```json
{
  "name": "memory_auto_learn",
  "arguments": {
    "conversation": [
      {"role": "user", "content": "How should I handle authentication?"},
      {"role": "assistant", "content": "I decided to use JWT tokens with 1-hour expiry for authentication."}
    ]
  }
}
```

**Bug Discovery**
```json
{
  "name": "memory_auto_learn",
  "arguments": {
    "conversation": [
      {"role": "user", "content": "Why is the app crashing?"},
      {"role": "assistant", "content": "The bug was caused by a null pointer exception in the user service at line 234."}
    ]
  }
}
```

#### Detected Patterns

- **Decision**: "I decided to...", "I recommend...", "Let's use..."
- **Bug**: "The bug was caused by...", "The issue is...", "Error in..."
- **Pattern**: "I noticed that...", "The pattern is...", "Consistently..."
- **Learning**: "Important:", "Note that...", "Remember to..."

#### Best Practices

- Call after significant conversation turns
- Use auto_detect_importance for automatic scoring
- Review stored memories periodically
- Combine with memory_review for quality control
- Don't call for every message (only meaningful exchanges)

---

### memory_decay

Apply time-based importance decay to old, unused memories.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `dry_run` | boolean | No | `false` | Preview changes without applying |
| `decay_factor` | number | No | `0.95` | Multiplier per interval (0.0-1.0) |
| `threshold` | number | No | `0.1` | Delete memories below this importance |

#### Input Schema

```json
{
  "dry_run": false,
  "decay_factor": 0.95,
  "threshold": 0.1
}
```

#### Success Response

```json
{
  "success": true,
  "memories_decayed": 45,
  "memories_deleted": 8,
  "average_decay": 0.12,
  "space_freed_kb": 15.2,
  "message": "Decay applied successfully"
}
```

**Dry Run**
```json
{
  "success": true,
  "dry_run": true,
  "memories_would_decay": 45,
  "memories_would_delete": 8,
  "preview": [
    {
      "id": "mem_old123",
      "current_importance": 0.35,
      "new_importance": 0.28,
      "days_since_access": 45
    }
  ]
}
```

#### Examples

**Preview Decay**
```json
{
  "name": "memory_decay",
  "arguments": {
    "dry_run": true
  }
}
```

**Apply Decay**
```json
{
  "name": "memory_decay",
  "arguments": {
    "dry_run": false,
    "decay_factor": 0.90,
    "threshold": 0.15
  }
}
```

#### Decay Formula

```
new_importance = current_importance × (decay_factor ^ days_since_access)
```

#### Best Practices

- Run dry_run first to preview
- Schedule weekly or monthly
- Adjust threshold based on needs
- Backup before first run
- Exempt critical memories (importance >= 0.8)

---

### memory_review

Review, edit, approve, and manage memories manually.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `action` | string | Yes | - | Action: list_unreviewed, approve, edit, delete, promote, demote |
| `memory_id` | string | Conditional | - | Memory ID (required for most actions) |
| `filters` | object | No | - | Filters for list_unreviewed |
| `edits` | object | No | - | Fields to edit |

#### Input Schema

**List Unreviewed**
```json
{
  "action": "list_unreviewed",
  "filters": {
    "topic": "decision",
    "min_importance": 0.5,
    "older_than_days": 30
  }
}
```

**Edit Memory**
```json
{
  "action": "edit",
  "memory_id": "mem_abc123",
  "edits": {
    "content": "decision:use-postgres|reason:better-json|date:2025-01-19|status:final",
    "importance": 0.9
  }
}
```

**Approve Memory**
```json
{
  "action": "approve",
  "memory_id": "mem_abc123"
}
```

#### Success Response

**List Response**
```json
{
  "success": true,
  "action": "list_unreviewed",
  "memories": [
    {
      "id": "mem_abc123",
      "topic": "decision",
      "content_toon": "decision:use-postgres|...",
      "importance_score": 0.5,
      "access_count": 0,
      "created_at": "2025-01-10T10:00:00Z",
      "status": "pending_review"
    }
  ],
  "count": 1
}
```

**Edit Response**
```json
{
  "success": true,
  "action": "edit",
  "memory_id": "mem_abc123",
  "updated_fields": ["content", "importance"],
  "message": "Memory updated successfully"
}
```

#### Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `list_unreviewed` | List memories needing attention | `filters` |
| `approve` | Mark memory as reviewed, boost importance | `memory_id` |
| `edit` | Modify memory fields | `memory_id`, `edits` |
| `delete` | Remove memory | `memory_id` |
| `promote` | Set importance to 1.0 (critical) | `memory_id` |
| `demote` | Reduce importance by 50% | `memory_id` |

#### Examples

**List Low-Access Memories**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "list_unreviewed",
    "filters": {
      "older_than_days": 60
    }
  }
}
```

**Promote Critical Decision**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "promote",
    "memory_id": "mem_critical123"
  }
}
```

#### Best Practices

- Review memories weekly
- Approve valuable memories
- Edit unclear content
- Delete obsolete information
- Promote critical decisions
- Demote outdated entries

---

## Utility Tools

### memory_ingest

Ingest files or documentation into memory.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file_path` | string | Yes | - | Path to file to ingest |
| `topic` | string | No | Auto | Topic category (auto-detected if not provided) |
| `importance` | number | No | `0.5` | Importance score |
| `chunk_size` | number | No | `1000` | Character chunk size for large files |

#### Input Schema

```json
{
  "file_path": "./docs/architecture.md",
  "topic": "architecture",
  "importance": 0.7,
  "chunk_size": 1000
}
```

#### Success Response

```json
{
  "success": true,
  "memories_created": 5,
  "memory_ids": ["mem_001", "mem_002", "mem_003", "mem_004", "mem_005"],
  "file": "./docs/architecture.md",
  "chunks_processed": 5,
  "message": "File ingested successfully"
}
```

#### Examples

**Ingest Documentation**
```json
{
  "name": "memory_ingest",
  "arguments": {
    "file_path": "./README.md",
    "topic": "general",
    "importance": 0.6
  }
}
```

**Ingest Architecture Doc**
```json
{
  "name": "memory_ingest",
  "arguments": {
    "file_path": "./docs/architecture.md",
    "topic": "architecture",
    "importance": 0.8
  }
}
```

#### Supported File Types

- `.md` - Markdown
- `.txt` - Plain text
- `.json` - JSON documents
- `.yaml`, `.yml` - YAML files
- `.ts`, `.js` - Source code (comments extracted)

#### Best Practices

- Use for important documentation
- Set appropriate chunk_size (500-1500)
- Review ingested content
- Set proper importance scores
- Ingest architecture docs, not source code

---

### memory_compress

Compress old memories into summaries.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `older_than_days` | number | No | `90` | Compress memories older than N days |
| `topic` | string | No | - | Compress specific topic only |
| `min_memories` | number | No | `5` | Minimum memories to compress |

#### Input Schema

```json
{
  "older_than_days": 90,
  "topic": "general",
  "min_memories": 5
}
```

#### Success Response

```json
{
  "success": true,
  "original_count": 25,
  "compressed_count": 3,
  "summaries_created": 3,
  "space_saved_percent": 65,
  "message": "Memories compressed successfully"
}
```

#### Examples

**Compress Old General Memories**
```json
{
  "name": "memory_compress",
  "arguments": {
    "older_than_days": 90,
    "topic": "general"
  }
}
```

**Compress All Old Memories**
```json
{
  "name": "memory_compress",
  "arguments": {
    "older_than_days": 180
  }
}
```

#### Best Practices

- Run after decay operation
- Keep critical memories (importance >= 0.8)
- Review summaries after compression
- Compress by topic for better organization
- Schedule quarterly

---

### memory_export

Export memories to JSON format.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | No | `"json"` | Export format: json, csv, markdown |
| `topic` | string | No | - | Export specific topic only |
| `min_importance` | number | No | `0.0` | Minimum importance filter |
| `include_metadata` | boolean | No | `true` | Include metadata in export |

#### Input Schema

```json
{
  "format": "json",
  "topic": "decision",
  "min_importance": 0.5,
  "include_metadata": true
}
```

#### Success Response

```json
{
  "success": true,
  "format": "json",
  "count": 45,
  "data": [
    {
      "id": "mem_abc123",
      "topic": "decision",
      "content_toon": "decision:use-postgres|...",
      "importance_score": 0.8,
      "created_at": "2025-01-19T10:00:00Z",
      "metadata": {...}
    }
  ],
  "exported_at": "2025-01-19T15:30:00Z",
  "version": "2.0.0"
}
```

#### Examples

**Export All Memories**
```json
{
  "name": "memory_export",
  "arguments": {
    "format": "json"
  }
}
```

**Export High-Importance Decisions**
```json
{
  "name": "memory_export",
  "arguments": {
    "format": "json",
    "topic": "decision",
    "min_importance": 0.7
  }
}
```

#### Best Practices

- Export before major changes
- Create regular backups
- Filter by topic for focused exports
- Include metadata for context
- Store exports in version control

---

### memory_import

Import memories from JSON export.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `data` | array | Yes | - | Array of memory objects to import |
| `merge` | boolean | No | `true` | Merge with existing (false = replace) |
| `update_existing` | boolean | No | `false` | Update existing memories by ID |

#### Input Schema

```json
{
  "data": [
    {
      "id": "mem_abc123",
      "topic": "decision",
      "content_toon": "decision:use-postgres|...",
      "importance_score": 0.8
    }
  ],
  "merge": true,
  "update_existing": false
}
```

#### Success Response

```json
{
  "success": true,
  "imported_count": 45,
  "skipped_count": 5,
  "updated_count": 0,
  "errors": [],
  "message": "Import completed successfully"
}
```

**With Errors**
```json
{
  "success": true,
  "imported_count": 40,
  "skipped_count": 5,
  "updated_count": 0,
  "errors": [
    {
      "index": 12,
      "error": "Invalid TOON format",
      "data": {...}
    }
  ]
}
```

#### Examples

**Import from Backup**
```json
{
  "name": "memory_import",
  "arguments": {
    "data": [...],
    "merge": true
  }
}
```

**Replace All Memories**
```json
{
  "name": "memory_import",
  "arguments": {
    "data": [...],
    "merge": false
  }
}
```

#### Best Practices

- Backup before import
- Use merge=true to preserve existing
- Review data before import
- Check errors after import
- Verify counts match expectations

---

## Error Handling

### Error Types

| Error Type | Description | HTTP Status Equivalent |
|------------|-------------|------------------------|
| `VALIDATION_ERROR` | Invalid input parameters | 400 |
| `NOT_FOUND` | Memory or resource not found | 404 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `EMBEDDING_ERROR` | Failed to generate embedding | 500 |
| `RATE_LIMIT` | Too many requests (future) | 429 |
| `INTERNAL_ERROR` | Unexpected server error | 500 |

### Error Response Format

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Content must be in TOON format",
  "field": "content",
  "details": {
    "expected": "key:value|key:value",
    "received": "plain text"
  }
}
```

### Common Errors

**Validation Error**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Importance must be between 0.0 and 1.0",
  "field": "importance"
}
```

**Not Found**
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Memory not found",
  "memory_id": "mem_nonexistent"
}
```

**Database Error**
```json
{
  "success": false,
  "error": "DATABASE_ERROR",
  "message": "Database is locked. Try again later."
}
```

---

## Best Practices

### General Guidelines

1. **Use TOON Format Consistently**
   - Always format as: `key:value|key:value|key:value`
   - Keep keys short and standardized
   - Include relevant metadata (dates, files, status)

2. **Score Importance Realistically**
   - Not everything is critical (1.0)
   - Use 0.5 for normal information
   - Reserve 0.8+ for truly important memories

3. **Choose Topics Wisely**
   - Use consistent topic categories
   - Don't create too many custom topics
   - Match topic to content type

4. **Query Efficiently**
   - Limit results to what you need (3-5)
   - Use topic filters
   - Filter by importance when appropriate

5. **Maintain Quality**
   - Review memories periodically
   - Run decay regularly
   - Delete obsolete information
   - Compress old memories

### Performance Tips

1. **Lite Mode for Speed**
   - Use Lite Mode when possible
   - Faster queries and storage
   - Lower resource usage

2. **Limit Query Results**
   - Don't request 100 results
   - Use pagination if needed
   - Filter by topic

3. **Batch Operations**
   - Use memory_import for bulk inserts
   - Compress regularly
   - Clean up old memories

4. **Cache When Possible**
   - Reuse query results
   - Don't query for every message
   - Cache frequent searches

### Security Considerations

1. **Don't Store Sensitive Data**
   - No passwords or API keys
   - No personal information
   - No confidential business data

2. **Review Exports**
   - Check before sharing
   - Remove sensitive information
   - Secure export files

3. **Local Storage Only**
   - All data stored locally
   - No external transmission
   - User has full control

---

## Rate Limits

Currently, there are no rate limits as Memory-Agent MCP operates locally. However, best practices suggest:

- **Queries**: Max 10 per second
- **Storage**: Max 5 per second
- **Bulk Operations**: One at a time

---

## Versioning

- **API Version**: 2.0.0
- **Protocol**: MCP 1.0
- **Backward Compatibility**: Maintained for all 1.x tools

---

## Changelog

### v2.0.0 (2025-01-19)
- Initial public release
- 12 tools implemented
- Full AI and Lite modes
- Interceptor architecture
- TOON format support

---

## Support

- **Documentation**: [Full docs](../README.md)
- **Issues**: [GitHub Issues](https://github.com/memory-agent/memory-agent-mcp/issues)
- **Examples**: [Usage examples](./examples/)

---

**Last Updated**: 2025-01-19  
**API Version**: 2.0.0  
**Maintained By**: Memory-Agent Team