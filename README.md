# Memory-Agent MCP Server

A Model Context Protocol (MCP) server with persistent memory capabilities for AI assistants like Claude, Cursor, and Windsurf.

[![npm version](https://badge.fury.io/js/@memory-agent%2Fmcp-server.svg)](https://badge.fury.io/js/@memory-agent%2Fmcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/@memory-agent/mcp-server.svg)](https://www.npmjs.com/package/@memory-agent/mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/memory-agent/memory-agent-mcp.svg?style=social)](https://github.com/memory-agent/memory-agent-mcp)

## ⚡ Quick Start with npm

The fastest way to get started with Memory-Agent MCP:

```bash
# Install globally
npm install -g @memory-agent/mcp-server

# Or use with npx (no installation required)
npx @memory-agent/mcp-server

# Check version
memory-agent-mcp --version

# View help
memory-agent-mcp --help
```

### Environment Variables

- `MEMORY_PROJECT_ROOT`: Project root directory (default: current working directory)
- `MEMORY_MODE`: Operation mode - `'full'` or `'lite'` (default: `'full'`)
- `MEMORY_DB_PATH`: Database file path (default: `.memory/memory.db`)

### Example Usage

```bash
# Start in lite mode (no AI model required)
MEMORY_MODE=lite npx @memory-agent/mcp-server

# Use custom database location
MEMORY_DB_PATH=/path/to/memory.db npx @memory-agent/mcp-server
```

## 🎯 Overview

Memory-Agent MCP provides a universal memory layer for AI coding assistants, enabling them to:
- Remember decisions, patterns, and learned information across sessions
- Query relevant context when solving problems
- Auto-learn from conversations
- Manage memory lifecycle with decay and archival

### Key Features

- **🔍 Semantic Search**: Find relevant memories using vector embeddings
- **🤖 Auto-Learning**: Automatically extract and store valuable information from conversations
- **📊 Memory Interceptor**: Pre/post-process prompts with context injection
- **🔄 Memory Lifecycle**: Automatic decay, archival, and cleanup
- **🛡️ Hybrid Mode**: Works with or without AI models (Full AI / Lite Mode)
- **💾 SQLite Storage**: Zero-config persistent storage
- **🔌 Universal Compatibility**: Works with Claude Desktop, Cursor, Windsurf, VS Code

## 📦 Installation

### From npm (Recommended)

```bash
# Install globally
npm install -g @memory-agent/mcp-server

# Or with yarn
yarn global add @memory-agent/mcp-server

# Or with pnpm
pnpm add -g @memory-agent/mcp-server
```

### From Source (Development)

#### Prerequisites

- **Bun** >= 1.0.0 (Primary runtime)
- **Node.js** >= 20.x (For compatibility testing)

>
#### Setup

```bash
# Clone the repository
git clone <repository-url>
cd memory-agent-mcp

# Install dependencies
bun install

# Setup development environment
bun run setup

# Run tests to verify installation
bun test
```

### Development Mode

```bash
# Start development server with hot reload
bun run dev

# Run tests in watch mode
bun test --watch

# Type checking
bun run typecheck

# Linting
bun run lint
```

## 🚀 Usage

### As an MCP Server

The server implements the Model Context Protocol and can be used with any MCP-compatible client:

#### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "memory-agent": {
      "command": "bun",
      "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
      "env": {
        "MEMORY_PROJECT_ROOT": "/path/to/your/project",
        "MEMORY_MODE": "full"
      }
    }
  }
}
```

#### Cursor IDE

Add to your Cursor settings:

```json
{
  "mcp": {
    "servers": {
      "memory-agent": {
        "command": "bun",
        "args": ["run", "/path/to/memory-agent-mcp/src/index.ts"],
        "cwd": "/path/to/your/project"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMORY_MODE` | Operation mode (`full` or `lite`) | `full` |
| `MEMORY_PROJECT_ROOT` | Project root directory | `process.cwd()` |
| `MEMORY_DB_PATH` | Database file path | `.memory/memory.db` |
| `LOG_LEVEL` | Logging level (`ERROR`, `WARN`, `INFO`, `DEBUG`) | `INFO` |
| `DEBUG` | Enable debug mode | `false` |

## 🎓 System Prompt Integration

Memory-Agent MCP works best when combined with a system prompt that instructs the AI to automatically use memory tools. We provide ready-to-use templates:

### Available Templates

Located in the `prompts/` directory:

- **`prompts/system-prompt.md`** - Full AI Mode with semantic search
- **`prompts/system-prompt-lite.md`** - Lite Mode with keyword search
- **`prompts/README.md`** - Detailed usage instructions

### Quick Setup

1. **Choose your template** based on your mode (Full AI or Lite)
2. **Copy the template content** into your MCP client's system prompt configuration
3. **The AI will automatically**:
   - Query memory when context is needed
   - Store important decisions and learnings
   - Use TOON format for structured storage

### Example Configuration

For Claude Desktop, add the system prompt in Settings → System Prompt:

```
[Paste contents of prompts/system-prompt.md here]
```

### What This Enables

- **Automatic Context**: AI queries memory for ambiguous requests
- **Auto-Learning**: Important decisions are stored automatically
- **TOON Format**: Structured, efficient memory storage
- **Topic Organization**: Automatic categorization (decision, bug, pattern, etc.)

See `prompts/README.md` for detailed configuration examples for all supported clients.

## 🛠️ MCP Tools

The server provides 12 MCP tools:

### Core Tools

1. **memory_store** - Store a new memory
2. **memory_query** - Query memories with semantic search
3. **memory_forget** - Delete specific memories
4. **memory_stats** - Get memory statistics

### Interceptor Tools

5. **memory_enhance_prompt** - Enhance prompts with relevant context
6. **memory_auto_learn** - Auto-learn from conversations
7. **memory_decay** - Apply decay to old memories
8. **memory_review** - Review and manage memories

### Utility Tools

9. **memory_ingest** - Ingest files into memory
10. **memory_compress** - Compress old memories
11. **memory_export** - Export memories
12. **memory_import** - Import memories

## 📁 Project Structure

```
memory-agent-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/                # MCP tool implementations
│   │   ├── store.ts
│   │   ├── query.ts
│   │   └── ...
│   ├── core/                 # Core business logic
│   │   ├── memory-store.ts
│   │   ├── embedder.ts
│   │   └── distiller.ts
│   ├── errors/               # Error handling
│   │   ├── types.ts
│   │   ├── wrap.ts
│   │   └── index.ts
│   ├── types/                # TypeScript definitions
│   │   ├── memory.ts
│   │   ├── mcp.ts
│   │   └── index.ts
│   └── utils/                # Utility functions
│       ├── logger.ts
│       ├── toon.ts
│       └── id.ts
├── tests/
│   ├── unit/                 # Unit tests
│   │   ├── errors/
│   │   └── utils/
│   ├── integration/          # Integration tests
│   ├── fixtures/             # Test fixtures
│   │   └── memories.ts
│   └── helpers/              # Test utilities
│       ├── test-db.ts
│       └── mocks.ts
├── kanban/                   # Task management
│   └── dev/
├── agent/                    # Agent definitions
│   ├── dev-agent.md
│   └── qa-agent.md
├── skill/                    # Technical documentation
│   ├── typescript.md
│   ├── bun.md
│   └── mcp-protocol.md
├── workflow/                 # Workflow documentation
│   ├── development.md
│   └── testing.md
├── package.json
├── tsconfig.json
└── biome.json
```

## 🧪 Testing

### Test Structure

The project uses **Bun's built-in test runner** with a comprehensive test suite:

- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Full system tests with real database
- **E2E Tests**: End-to-end workflow testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/errors/types.test.ts

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch

# Run only unit tests
bun test tests/unit/

# Run only integration tests
bun test tests/integration/
```

### Coverage Requirements

| Component | Minimum Coverage |
|-----------|------------------|
| Core Logic | 90% |
| Tools | 85% |
| Utils | 80% |
| Integration | 70% |

### Writing Tests

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { memoryStore } from "../../src/tools/store";

describe("memory_store", () => {
  test("should store valid memory", async () => {
    const result = await memoryStore({
      content: "Test memory",
      topic: "test"
    });

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text!);
    expect(data.success).toBe(true);
  });
});
```

## 🔄 Development Workflow

### Branch Strategy

```
main          # Production-ready code
develop       # Integration branch
feature/*     # New features
fix/*         # Bug fixes
refactor/*    # Code improvements
```

### Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, refactor, docs, test, chore
Scope: tool, core, db, api, etc.

Examples:
feat(interceptor): add memory_enhance_prompt tool
fix(query): resolve timeout on large datasets
test(errors): add comprehensive error type tests
```

### Before Committing

```bash
# Run all checks
bun run precommit

# This runs:
# 1. Type checking
# 2. Linting
# 3. All tests
```

## 📊 Current Status

### Phase 1: Core Stability (Q1 2025) - **In Progress**

- [x] Project structure and configuration
- [x] Error handling system (MEM-006)
- [x] Testing infrastructure (MEM-005)
- [ ] Core tools implementation (8 tools)
- [ ] Interceptor tools (4 tools)
- [ ] Database layer
- [ ] Basic documentation

### Phase 2: Enhanced Features (Q2 2025) - Planned

- [ ] Vector embeddings
- [ ] LLM integration
- [ ] Semantic search
- [ ] Auto-learning

### Phase 3: Scale & Performance (Q3 2025) - Planned

- [ ] Performance optimization
- [ ] Large-scale testing
- [ ] Multi-project support

## 🐛 Debugging

### Debug Mode

```bash
# Enable debug logging
DEBUG=memory-agent:* bun run dev

# Verbose MCP protocol logging
MCP_DEBUG=true bun run dev

# Run tests with verbose output
bun test --verbose
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Database locked | `rm -rf .memory/memory.db-wal .memory/memory.db-shm` |
| Type errors | `rm -rf node_modules bun.lockb && bun install` |
| Tests failing | Check database state, reset test DB |

## 📚 Documentation

- **PRD.md** - Product Requirements Document
- **skill/** - Technical skill documentation
  - `typescript.md` - TypeScript best practices
  - `bun.md` - Bun runtime patterns
  - `mcp-protocol.md` - MCP implementation guide
- **workflow/** - Process documentation
  - `development.md` - Development process
  - `testing.md` - Testing strategy
- **agent/** - Agent role definitions
  - `dev-agent.md` - Development agent
  - `qa-agent.md` - QA agent

## 🤝 Contributing

We welcome contributions! Please see our development workflow:

1. Pick a task from `kanban/dev/`
2. Create a feature branch
3. Implement with tests
4. Submit a pull request
5. Get review and merge

### Code Standards

- **TypeScript**: Strict mode with explicit types
- **Testing**: >85% coverage for new code
- **Error Handling**: Use typed errors from `src/errors/`
- **Logging**: Use structured logger from `src/utils/logger.ts`
- **Documentation**: Update docs for new features

## 📄 License

MIT

## 🔗 References

- [MCP Specification](https://modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev)

---

**Status**: 🚧 Phase 1 - Core Stability (In Progress)  
**Version**: 0.1.0  
**Last Updated**: 2025-01-19