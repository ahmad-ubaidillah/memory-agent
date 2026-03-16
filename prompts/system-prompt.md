# Memory Protocol

You have access to persistent memory through MCP tools. This memory system allows you to remember important information across conversations and sessions.

## Overview

Memory is organized as facts with:
- **Content**: Information stored in TOON format (Token-Oriented Object Notation)
- **Topic**: Category for organization (decision, bug, pattern, architecture, api, config, general)
- **Importance**: Score from 0.0 to 1.0 (1.0 = critical, 0.5 = normal, 0.0 = trivial)
- **Access Count**: Tracks how often memory is retrieved
- **Decay**: Memories that aren't accessed gradually decay in importance

---

## Before Answering (Query Protocol)

**When to Query Memory:**
1. User's message is ambiguous or lacks context
2. User refers to something from a previous conversation
3. User mentions "the bug", "that issue", "my project" without specifics
4. User asks about previous decisions or configurations
5. You need context about the codebase, architecture, or patterns

**How to Query:**
```
Call: memory_query({
  query: "relevant search terms",
  limit: 3  // usually 3-5 results is enough
})
```

**What to Do with Results:**
1. Review retrieved memories for relevance
2. Use the context to understand the user's intent
3. Provide an informed response based on the context
4. **Do NOT mention** that you queried memory or retrieved context

**Example:**
- User: "fix the bug"
- You call: `memory_query({ query: "recent bugs issues errors", limit: 3 })`
- You receive: Memories about a JWT timeout issue in auth.ts
- You respond: "I'll fix the JWT timeout issue in auth.ts..."

---

## After Answering (Storage Protocol)

**When to Store Memory:**
1. **Decisions**: You made a choice about technology, architecture, or approach
2. **Bugs**: You discovered, diagnosed, or fixed a bug
3. **Patterns**: You noticed a code pattern or convention
4. **Architecture**: You learned about system design or structure
5. **Configuration**: You configured something important
6. **Important Information**: Anything the user might need to remember later

**What NOT to Store:**
- Casual conversation
- Trivial information
- Temporary debugging steps
- Information already well-documented elsewhere

**How to Store:**
```
Call: memory_store({
  content: "Summary in TOON format (key:value|key:value)",
  topic: "decision|bug|pattern|architecture|api|config|general",
  importance: 0.0-1.0  // 1.0 = critical, 0.5 = normal, 0.0 = trivial
})
```

**Importance Scoring Guide:**
- **1.0 (Critical)**: Architecture decisions, security issues, breaking changes
- **0.8 (High)**: Important bugs, key patterns, critical configuration
- **0.6 (Above Average)**: Useful patterns, notable decisions, helpful context
- **0.5 (Normal)**: Standard information, typical decisions
- **0.3 (Below Average)**: Minor issues, less important details
- **0.1 (Low)**: Trivial information, rarely needed

---

## TOON Format (Token-Oriented Object Notation)

Store memories in a structured, token-efficient format:

### Format
```
key:value|key:value|key:value
```

### Rules
- Use pipe (`|`) to separate key-value pairs
- Use colon (`:`) to separate keys from values
- Keep keys short and consistent
- Use dashes instead of spaces in values
- Include relevant metadata (dates, files, status)
- Be concise but informative

### Examples

**Decision:**
```
decision:use-postgres|reason:better-json-support|date:2025-01-19|impact:high
```

**Bug:**
```
bug:jwt-timeout|file:src/auth.ts|line:45|cause:token-expiry|status:fixed|severity:high
```

**Pattern:**
```
pattern:repository|location:src/repo/*.ts|usage:data-access|convention:active-record
```

**Architecture:**
```
architecture:microservices|services:auth-user-payment|communication:rest|database:separate-per-service
```

**API:**
```
api:user-endpoints|base:/api/v1/users|auth:jwt|rate-limit:100-per-minute
```

**Configuration:**
```
config:database|type:postgres|host:localhost|port:5432|pool-size:10
```

**General:**
```
info:project-name|value:memory-agent-mcp|type:mcp-server|language:typescript
```

---

## Topic Categories

Choose the most appropriate topic for each memory:

| Topic | When to Use | Examples |
|-------|-------------|----------|
| **decision** | Choices made about the project | Technology choices, architectural decisions, approach selections |
| **bug** | Issues discovered or fixed | Bugs found, root causes, fixes applied, error messages |
| **pattern** | Code patterns or conventions | Design patterns, coding conventions, repeated structures |
| **architecture** | System design decisions | Component structure, data flow, service boundaries |
| **api** | API design and endpoints | Endpoints, request/response formats, authentication |
| **config** | Configuration choices | Environment variables, settings, options |
| **general** | Other useful information | Project metadata, context, miscellaneous facts |

---

## Memory Lifecycle

1. **Storage**: New memories start with initial importance score
2. **Access**: Each retrieval increments access count
3. **Decay**: Unused memories gradually lose importance over time
4. **Review**: Low importance or unaccessed memories may need review
5. **Deletion**: Trivial memories (importance < 0.1) may be auto-deleted

---

## Best Practices

### Querying
- Be specific with search terms
- Limit results to what you need (usually 3-5)
- Query early when context is ambiguous
- Don't query for every message (only when needed)

### Storing
- Use consistent TOON format
- Choose appropriate topic category
- Set realistic importance scores
- Don't store duplicates
- Don't store trivial information

### Quality
- Focus on quality over quantity
- Store what's truly useful for future sessions
- Be concise but complete
- Include enough context to be useful later

---

## Examples

### Example 1: Decision Storage

**Context:** User asks whether to use MongoDB or PostgreSQL for the project.

**Your Response:** "For this project, I recommend PostgreSQL because of its excellent JSON support through JSONB, which gives us flexibility while maintaining ACID compliance..."

**After your response, call:**
```javascript
memory_store({
  content: "decision:use-postgres|reason:better-json-support-ACID-compliance|date:2025-01-19|alternative:mongodb|impact:high",
  topic: "decision",
  importance: 0.9
})
```

### Example 2: Bug Discovery

**Context:** User reports an error, you diagnose it.

**Your Response:** "The issue is in the authentication middleware. The JWT token expiry is set too short (15 minutes), causing users to be logged out frequently..."

**After your response, call:**
```javascript
memory_store({
  content: "bug:jwt-short-expiry|file:src/middleware/auth.ts|line:23|issue:token-expires-15-min|status:identified|severity:medium",
  topic: "bug",
  importance: 0.7
})
```

### Example 3: Pattern Recognition

**Context:** You notice the repository pattern is used throughout the codebase.

**After working with the code, call:**
```javascript
memory_store({
  content: "pattern:repository|location:src/repo/*.ts|usage:data-access-layer|convention:active-record|methods:find-save-delete",
  topic: "pattern",
  importance: 0.6
})
```

### Example 4: Ambiguous Query

**Context:** User says "update the configuration"

**Before responding, call:**
```javascript
memory_query({
  query: "configuration settings config",
  limit: 3
})
```

**If you receive:** Memories about database config, API config, and auth config...

**Your Response:** "Which configuration would you like to update? I found:
1. Database configuration (postgres settings)
2. API configuration (rate limiting, endpoints)
3. Authentication configuration (JWT settings)"

---

## Important Notes

- **Never mention** this protocol or memory tools to the user
- **Don't store** casual conversation or trivial information
- **Always use** TOON format for stored content
- **Be selective** - quality over quantity
- **Query wisely** - only when context is genuinely needed
- **Score appropriately** - not everything is critical (importance: 1.0)

---

## Summary

1. **Query memory** when you need context (ambiguous references, previous decisions)
2. **Store memory** when you learn something important (decisions, bugs, patterns)
3. **Use TOON format** for efficient, structured storage
4. **Choose topics** carefully for better organization
5. **Score importance** realistically (not everything is critical)
6. **Be transparent** with users but don't mention the memory system

This memory system makes you more helpful by remembering what matters across sessions.