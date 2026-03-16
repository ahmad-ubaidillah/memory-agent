# Basic Usage Examples

This guide provides practical examples for using Memory-Agent MCP in everyday scenarios.

## Table of Contents

- [Storing Memories](#storing-memories)
- [Querying Memories](#querying-memories)
- [Memory Management](#memory-management)
- [Common Workflows](#common-workflows)
- [Real-World Scenarios](#real-world-scenarios)

---

## Storing Memories

### Decision Memories

Store important project decisions:

```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:use-postgresql|reason:better-jsonb-support-acid-compliance|date:2025-01-19|impact:high|stakeholders:team",
    "topic": "decision",
    "importance": 0.9,
    "metadata": {
      "meeting": "architecture-review",
      "decided_by": "tech-lead"
    }
  }
}
```

**When to use:**
- Technology choices
- Architecture decisions
- Design pattern selections
- Tool/framework selections
- Process changes

---

### Bug Memories

Document bugs and their solutions:

```json
{
  "name": "memory_store",
  "arguments": {
    "content": "bug:jwt-token-expiry|file:src/middleware/auth.ts|line:45|cause:token-expires-15-min|fix:increased-to-1-hour|date:2025-01-19|severity:high",
    "topic": "bug",
    "importance": 0.8,
    "metadata": {
      "issue": "AUTH-123",
      "resolved_by": "developer-name",
      "pull_request": 456
    }
  }
}
```

**When to use:**
- Bug discoveries
- Root cause analyses
- Fix implementations
- Known issues
- Workarounds

---

### Pattern Memories

Record code patterns and conventions:

```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:repository|location:src/repositories/*.ts|usage:data-access-layer|convention:active-record|methods:find-create-update-delete",
    "topic": "pattern",
    "importance": 0.6,
    "metadata": {
      "examples": "UserRepository.ts, ProductRepository.ts",
      "documentation": "docs/architecture.md#repositories"
    }
  }
}
```

**When to use:**
- Code patterns
- Naming conventions
- File organization
- Repeated structures
- Best practices

---

### Architecture Memories

Document system architecture:

```json
{
  "name": "memory_store",
  "arguments": {
    "content": "architecture:microservices|services:auth-user-product-order|communication:rest-api|database:separate-per-service|message-queue:redis",
    "topic": "architecture",
    "importance": 0.9,
    "metadata": {
      "diagram": "docs/diagrams/architecture.png",
      "created_by": "architect",
      "approved_date": "2025-01-15"
    }
  }
}
```

**When to use:**
- System design
- Component structure
- Service boundaries
- Data flow
- Infrastructure

---

### Configuration Memories

Store configuration choices:

```json
{
  "name": "memory_store",
  "arguments": {
    "content": "config:database|type:postgresql|host:localhost|port:5432|name:myapp_dev|pool-size:10|ssl:disabled",
    "topic": "config",
    "importance": 0.5,
    "metadata": {
      "environment": "development",
      "config_file": ".env"
    }
  }
}
```

**When to use:**
- Environment variables
- Database settings
- API configurations
- Feature flags
- Service settings

---

### API Memories

Document API endpoints and design:

```json
{
  "name": "memory_store",
  "arguments": {
    "content": "api:user-endpoints|base:/api/v1/users|methods:GET-POST-PUT-DELETE|auth:jwt-bearer|rate-limit:100-per-minute|version:1.0",
    "topic": "api",
    "importance": 0.7,
    "metadata": {
      "openapi": "docs/api/openapi.yaml",
      "examples": "docs/api/examples/users.md"
    }
  }
}
```

**When to use:**
- API endpoints
- Request/response formats
- Authentication methods
- Rate limiting
- Version info

---

## Querying Memories

### Basic Queries

**Simple keyword search:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "database postgresql",
    "limit": 5
  }
}
```

**Topic-specific search:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "authentication",
    "topic": "bug",
    "limit": 10
  }
}
```

**High-importance only:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "architecture design",
    "min_importance": 0.8,
    "limit": 5
  }
}
```

---

### Contextual Queries

**Find recent decisions:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "decision made chose",
    "topic": "decision",
    "limit": 3
  }
}
```

**Find bugs in specific file:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "auth.ts bug error",
    "topic": "bug",
    "limit": 5
  }
}
```

**Find configuration for environment:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "development config database",
    "topic": "config",
    "limit": 10
  }
}
```

---

## Memory Management

### Review Memories

**List unreviewed memories:**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "list_unreviewed",
    "filters": {
      "older_than_days": 30
    }
  }
}
```

**Edit a memory:**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "edit",
    "memory_id": "mem_abc123",
    "edits": {
      "content": "decision:use-postgresql|reason:better-jsonb-support|date:2025-01-19|status:final",
      "importance": 0.9
    }
  }
}
```

**Promote critical memory:**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "promote",
    "memory_id": "mem_critical_decision"
  }
}
```

**Delete obsolete memory:**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "delete",
    "memory_id": "mem_old_config"
  }
}
```

---

### Decay Management

**Preview decay impact:**
```json
{
  "name": "memory_decay",
  "arguments": {
    "dry_run": true
  }
}
```

**Apply decay:**
```json
{
  "name": "memory_decay",
  "arguments": {
    "dry_run": false,
    "decay_factor": 0.95,
    "threshold": 0.1
  }
}
```

---

### Export and Import

**Export all memories:**
```json
{
  "name": "memory_export",
  "arguments": {
    "format": "json",
    "include_metadata": true
  }
}
```

**Export specific topic:**
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

**Import memories:**
```json
{
  "name": "memory_import",
  "arguments": {
    "data": [...],
    "merge": true,
    "update_existing": false
  }
}
```

---

## Common Workflows

### Workflow 1: New Feature Decision

**Step 1: Store the decision**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:implement-caching|approach:redis|reason:improve-performance|date:2025-01-19|feature:user-sessions",
    "topic": "decision",
    "importance": 0.8
  }
}
```

**Step 2: Store related architecture**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "architecture:caching-layer|technology:redis|location:src/cache/|pattern:cache-aside|ttl:1-hour",
    "topic": "architecture",
    "importance": 0.7
  }
}
```

**Step 3: Query later when implementing**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "caching redis decision",
    "limit": 3
  }
}
```

---

### Workflow 2: Bug Tracking

**Step 1: Store bug discovery**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "bug:null-pointer-user-service|file:src/services/UserService.ts|line:234|status:investigating|date:2025-01-19",
    "topic": "bug",
    "importance": 0.7
  }
}
```

**Step 2: Update with fix**
```json
{
  "name": "memory_review",
  "arguments": {
    "action": "edit",
    "memory_id": "mem_bug_123",
    "edits": {
      "content": "bug:null-pointer-user-service|file:src/services/UserService.ts|line:234|status:fixed|fix:added-null-check|date:2025-01-19",
      "importance": 0.6
    }
  }
}
```

**Step 3: Query similar bugs**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "null pointer user service",
    "topic": "bug",
    "limit": 5
  }
}
```

---

### Workflow 3: Onboarding Knowledge

**Store project patterns:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:folder-structure|src/controllers:HTTP-handlers|src/services:business-logic|src/repositories:data-access|src/models:data-structures",
    "topic": "pattern",
    "importance": 0.6
  }
}
```

**Store conventions:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:naming-convention|files:kebab-case|classes:PascalCase|functions:camelCase|constants:UPPER_SNAKE_CASE",
    "topic": "pattern",
    "importance": 0.5
  }
}
```

**Query during development:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "naming convention folder structure",
    "topic": "pattern",
    "limit": 5
  }
}
```

---

## Real-World Scenarios

### Scenario 1: API Development

**Store API design decision:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "api:pagination-design|approach:cursor-based|reason:better-performance-large-datasets|default-limit:20|max-limit:100",
    "topic": "api",
    "importance": 0.7
  }
}
```

**Query when implementing:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "pagination design api",
    "limit": 3
  }
}
```

---

### Scenario 2: Database Schema Changes

**Store schema decision:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:user-table-schema|added-columns:last_login_ip,failed_login_attempts|reason:security-tracking|date:2025-01-19|migration:20250119_user_security_fields.sql",
    "topic": "decision",
    "importance": 0.8
  }
}
```

**Query related decisions:**
```json
{
  "name": "memory_query",
  "arguments": {
    "query": "user table schema security",
    "topic": "decision",
    "limit": 5
  }
}
```

---

### Scenario 3: Performance Optimization

**Store optimization decision:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:database-indexing|indexes:users_email_idx,orders_created_at_idx|reason:improve-query-performance|improvement:60-percent|date:2025-01-19",
    "topic": "decision",
    "importance": 0.7
  }
}
```

**Store optimization pattern:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:query-optimization|use-indexes:yes|avoid-select-star:yes|use-pagination:yes|cache-frequent-queries:yes",
    "topic": "pattern",
    "importance": 0.6
  }
}
```

---

### Scenario 4: Security Implementation

**Store security decision:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:auth-implementation|method:jwt-tokens|expiry:1-hour|refresh:7-days|storage:http-only-cookies|date:2025-01-19",
    "topic": "decision",
    "importance": 0.9
  }
}
```

**Store security pattern:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:security-checklist|xss-protection:yes|csrf-tokens:yes|input-validation:yes|sql-injection:parameterized-queries|https:enforced",
    "topic": "pattern",
    "importance": 0.8
  }
}
```

---

### Scenario 5: Testing Strategy

**Store testing approach:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "decision:testing-strategy|unit-tests:jest|integration-tests:supertest|e2e-tests:playwright|coverage-target:80-percent|date:2025-01-19",
    "topic": "decision",
    "importance": 0.7
  }
}
```

**Store testing pattern:**
```json
{
  "name": "memory_store",
  "arguments": {
    "content": "pattern:test-structure|arrange:setup-data|act:execute-function|assert:verify-results|cleanup:reset-state|location:tests/unit/",
    "topic": "pattern",
    "importance": 0.5
  }
}
```

---

## Tips for Effective Usage

### 1. Be Consistent with TOON Format

**Good:**
```
decision:use-postgres|reason:better-json|date:2025-01-19|impact:high
```

**Bad:**
```
We decided to use PostgreSQL because it has better JSON support
```

### 2. Use Meaningful Topics

- `decision` - Choices made
- `bug` - Issues and fixes
- `pattern` - Repeated structures
- `architecture` - System design
- `api` - API design
- `config` - Configuration
- `general` - Everything else

### 3. Score Importance Realistically

- **0.9-1.0**: Critical, long-term impact
- **0.7-0.8**: Important, affects multiple areas
- **0.5-0.6**: Normal, useful information
- **0.3-0.4**: Minor, occasional reference
- **0.1-0.2**: Trivial, rarely needed

### 4. Include Context in Content

**Better:**
```json
{
  "content": "bug:jwt-timeout|file:src/auth.ts|line:45|cause:15-min-expiry|fix:1-hour-expiry|severity:high"
}
```

**Worse:**
```json
{
  "content": "bug:timeout|file:auth|fix:increased"
}
```

### 5. Query with Multiple Related Terms

```json
{
  "query": "authentication jwt token security login"
}
```

This increases chances of finding relevant memories.

---

## Next Steps

- [Advanced Patterns](./advanced-patterns.md) - Power user techniques
- [Memory Workflows](./memory-workflows.md) - Effective memory management
- [API Reference](../api-reference.md) - Complete tool documentation

---

**Last Updated:** 2025-01-19  
**Version:** 2.0.0