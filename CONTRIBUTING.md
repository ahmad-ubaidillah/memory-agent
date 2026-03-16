# Contributing to Memory-Agent MCP

First off, thank you for considering contributing to Memory-Agent MCP! It's people like you that make this project great.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and diverse perspectives
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** >= 1.0.0 (primary runtime)
- **Node.js** >= 18.0.0 (alternative runtime)
- **Git** >= 2.0.0
- A code editor (VS Code recommended)

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/memory-agent-mcp.git
   cd memory-agent-mcp
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Run tests** to verify setup:
   ```bash
   bun test
   ```
5. **Start development server**:
   ```bash
   bun run dev
   ```

---

## Development Setup

### Environment Setup

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone and setup**:
   ```bash
   git clone https://github.com/memory-agent/memory-agent-mcp.git
   cd memory-agent-mcp
   bun install
   ```

3. **Setup pre-commit hooks** (optional but recommended):
   ```bash
   # Hooks are automatically setup via bun install
   # They will run linting and tests before commits
   ```

### IDE Setup

**VS Code (Recommended)**

Install these extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Bun for VS Code

**Workspace Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Environment Variables

Create a `.env` file for local development:
```bash
# Development environment
MEMORY_MODE=lite
LOG_LEVEL=DEBUG
DEBUG=memory-agent:*
MEMORY_PROJECT_ROOT=$(pwd)
```

---

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

- 🐛 **Bug fixes**: Fix issues in existing code
- ✨ **New features**: Add new functionality
- 📝 **Documentation**: Improve or add documentation
- 🧪 **Tests**: Add or improve test coverage
- 🔧 **Refactoring**: Improve code quality without changing behavior
- 🎨 **Style**: Fix formatting, improve code readability
- ⚡ **Performance**: Improve performance
- 🔒 **Security**: Fix security vulnerabilities

### Finding Issues to Work On

1. Check our [GitHub Issues](https://github.com/memory-agent/memory-agent-mcp/issues)
2. Look for labels:
   - `good first issue` - Great for newcomers
   - `help wanted` - We need assistance
   - `bug` - Something isn't working
   - `enhancement` - New feature or request
3. Comment on the issue to let us know you're working on it
4. If you have a new idea, open an issue first to discuss

---

## Development Workflow

### Branch Strategy

```
main          # Production-ready code (protected)
  ↑
develop       # Integration branch (protected)
  ↑
feature/*     # New features
fix/*         # Bug fixes
refactor/*    # Code improvements
docs/*        # Documentation updates
test/*        # Test additions/improvements
```

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/MEM-123-your-feature-name

# Or for bug fixes
git checkout -b fix/MEM-456-bug-description
```

### Branch Naming Convention

- **Features**: `feature/MEM-XXX-short-description`
- **Bug fixes**: `fix/MEM-XXX-short-description`
- **Refactoring**: `refactor/MEM-XXX-short-description`
- **Documentation**: `docs/MEM-XXX-short-description`
- **Tests**: `test/MEM-XXX-short-description`

### Development Process

1. **Make your changes** in your feature branch
2. **Write/update tests** for your changes
3. **Update documentation** if needed
4. **Run tests locally**:
   ```bash
   bun test
   bun run lint
   bun run typecheck
   ```
5. **Commit your changes** (see commit convention below)
6. **Push to your fork**:
   ```bash
   git push origin feature/MEM-123-your-feature
   ```
7. **Create a Pull Request**

---

## Coding Standards

### TypeScript Guidelines

**Use explicit types**:
```typescript
// ✅ Good
interface MemoryStore {
  content: string;
  topic?: string;
  importance?: number;
}

function storeMemory(input: MemoryStore): Promise<string> {
  // Implementation
}

// ❌ Bad
function store(input: any): Promise<any> {
  // No type safety
}
```

**Use Zod for validation**:
```typescript
import { z } from "zod";

const MemorySchema = z.object({
  content: z.string().min(1).max(10000),
  topic: z.enum(["decision", "bug", "pattern", "architecture", "api", "config", "general"]),
  importance: z.number().min(0).max(1).default(0.5)
});

type Memory = z.infer<typeof MemorySchema>;
```

**Use async/await**:
```typescript
// ✅ Good
async function queryMemory(query: string): Promise<Memory[]> {
  try {
    const results = await db.query(query);
    return results;
  } catch (error) {
    logger.error("Query failed", { error });
    throw new DatabaseError(error.message);
  }
}

// ❌ Bad
function queryMemory(query: string): Promise<Memory[]> {
  return db.query(query).then(results => results).catch(error => {
    throw error;
  });
}
```

### Error Handling

Use the project's error system:
```typescript
import { err, ok, Result } from "neverthrow";
import { MemoryError } from "../errors/types";

async function store(input: unknown): Promise<Result<Memory, MemoryError>> {
  const parsed = MemorySchema.safeParse(input);
  
  if (!parsed.success) {
    return err({
      type: "VALIDATION_ERROR",
      message: parsed.error.message,
      field: "input"
    });
  }
  
  try {
    const memory = await database.store(parsed.data);
    return ok(memory);
  } catch (e) {
    return err({
      type: "DATABASE_ERROR",
      message: String(e)
    });
  }
}
```

### Code Style

We use **Biome** for linting and formatting:

```bash
# Check code style
bun run lint

# Fix code style issues
bun run lint:fix

# Format code
bun run format
```

**Key style rules**:
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- Max line length: 100 characters
- No semicolons (TypeScript/Bun convention)

### File Organization

```
src/
├── tools/           # MCP tool implementations
│   ├── store.ts
│   └── store.test.ts
├── core/            # Business logic
├── errors/          # Error handling
├── types/           # TypeScript types
└── utils/           # Utility functions
```

**One feature per file**:
```typescript
// store.ts - Memory storage tool
export async function memoryStore(input: unknown): Promise<MCPToolResponse> {
  // Implementation
}

// store.test.ts - Tests for storage tool
import { describe, test, expect } from "bun:test";
import { memoryStore } from "./store";

describe("memoryStore", () => {
  // Tests
});
```

---

## Testing Guidelines

### Test Structure

Tests should be placed alongside the code they test:
```
src/
├── tools/
│   ├── store.ts
│   └── store.test.ts    # Unit test
├── core/
│   ├── memory-store.ts
│   └── memory-store.test.ts
tests/
├── integration/         # Integration tests
├── fixtures/            # Test data
└── helpers/             # Test utilities
```

### Writing Tests

**Unit Test Example**:
```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { memoryStore } from "../src/tools/store";
import { setupTestDB, cleanupTestDB } from "./helpers/test-db";

describe("memory_store", () => {
  beforeEach(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await cleanupTestDB();
  });

  describe("input validation", () => {
    test("should accept valid content", async () => {
      const result = await memoryStore({
        content: "decision:use-postgres|reason:better-json"
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);
    });

    test("should reject empty content", async () => {
      const result = await memoryStore({ content: "" });

      expect(result.isError).toBe(true);
    });
  });

  describe("storage operations", () => {
    test("should generate unique ID", async () => {
      const result1 = await memoryStore({ content: "Test 1" });
      const result2 = await memoryStore({ content: "Test 2" });

      const id1 = JSON.parse(result1.content[0].text!).memory_id;
      const id2 = JSON.parse(result2.content[0].text!).memory_id;

      expect(id1).not.toBe(id2);
    });
  });
});
```

**Integration Test Example**:
```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

describe("MCP Server Integration", () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestClient();
  });

  afterAll(async () => {
    await client.close();
  });

  test("full memory lifecycle", async () => {
    // Store
    const storeResult = await client.callTool({
      name: "memory_store",
      arguments: { content: "Test memory" }
    });
    expect(storeResult.isError).toBeUndefined();

    // Query
    const queryResult = await client.callTool({
      name: "memory_query",
      arguments: { query: "test" }
    });
    expect(queryResult.isError).toBeUndefined();
  });
});
```

### Coverage Requirements

- **Core Logic**: >= 90% coverage
- **Tools**: >= 85% coverage
- **Utils**: >= 80% coverage
- **Overall**: >= 80% coverage

Run coverage:
```bash
bun test --coverage
```

### Test Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **One assertion per test when possible**
4. **Use beforeEach/afterEach for setup/cleanup**
5. **Mock external dependencies**
6. **Test edge cases and error conditions**
7. **Keep tests fast and isolated**

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Scopes

- `tool`: MCP tools
- `core`: Core business logic
- `db`: Database operations
- `api`: API changes
- `docs`: Documentation
- `test`: Testing infrastructure

### Examples

```bash
# Feature
feat(interceptor): add memory_enhance_prompt tool

# Bug fix
fix(query): resolve timeout on large datasets

# Documentation
docs(api): update tool documentation for memory_store

# Refactor
refactor(core): simplify decay function logic

# Test
test(tools): add comprehensive tests for memory_query

# Chore
chore(deps): update dependencies to latest versions
```

### Commit Message Body

For complex changes, include a body:
```
feat(interceptor): add automatic pattern detection

Implement pattern detection for decision and bug patterns in
conversations. This allows memory_auto_learn to automatically
identify and store important learnings.

- Add PatternDetector class
- Support decision, bug, and pattern types
- Include confidence scoring
- Add unit tests for pattern detection

Closes #123
```

---

## Pull Request Process

### Before Submitting

1. **Update from main**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks**:
   ```bash
   bun run precommit
   ```
   This runs:
   - Type checking
   - Linting
   - All tests
   - Coverage check

3. **Update documentation** if needed

4. **Add tests** for new features

5. **Update CHANGELOG.md** (if applicable)

### Creating the PR

1. **Push your branch**:
   ```bash
   git push origin feature/MEM-123-your-feature
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Tests added/updated
   - [ ] All tests passing
   - [ ] Coverage maintained/improved

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No new warnings
   - [ ] Tests added and passing
   ```

4. **Link related issues**: `Closes #123` or `Fixes #456`

### PR Review Process

1. **Automated checks** must pass (CI/CD)
2. **At least one approval** from a maintainer
3. **No unresolved conversations**
4. **Squash and merge** when approved

### After Merge

1. **Delete your branch** (GitHub can do this automatically)
2. **Update your local main**:
   ```bash
   git checkout main
   git pull origin main
   ```

---

## Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with the latest version**
3. **Try to reproduce** the issue consistently

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., macOS 14.0]
- Bun Version: [e.g., 1.0.20]
- Memory-Agent Version: [e.g., 2.0.0]
- Mode: [Full AI / Lite]

## Logs
```
Paste relevant logs
```

## Additional Context
Any other information
```

---

## Suggesting Features

### Before Suggesting

1. **Check existing issues** and discussions
2. **Review the roadmap** in `.agents/kanban/ROADMAP-Q1-2025.md`
3. **Consider if it fits** the project scope

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Other solutions you've thought about

## Use Cases
Who would use this and how?

## Additional Context
Any other information
```

---

## Documentation

### Types of Documentation

1. **Code Documentation**: JSDoc comments
2. **API Documentation**: Tool references
3. **User Documentation**: Guides and tutorials
4. **Architecture Docs**: System design

### Writing Documentation

**Code Comments**:
```typescript
/**
 * Store a new memory in the database
 * 
 * @param input - Memory input with content, topic, and importance
 * @returns Promise resolving to MCP tool response
 * 
 * @example
 * ```typescript
 * const result = await memoryStore({
 *   content: "decision:use-postgres|reason:better-json",
 *   topic: "decision",
 *   importance: 0.8
 * });
 * ```
 */
export async function memoryStore(input: unknown): Promise<MCPToolResponse> {
  // Implementation
}
```

**README Updates**:
- Keep examples up to date
- Update feature lists
- Add configuration examples
- Include troubleshooting tips

**Documentation Files**:
- Use clear, simple language
- Include code examples
- Add diagrams where helpful
- Keep it up to date

---

## Project Structure

Understanding the project structure:

```
memory-agent-mcp/
├── src/                  # Source code
│   ├── tools/           # MCP tool implementations
│   ├── core/            # Core business logic
│   ├── interceptor/     # Pre/post processors
│   ├── errors/          # Error handling
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── tests/               # Test files
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── fixtures/        # Test data
│   └── helpers/         # Test utilities
├── docs/                # Documentation
│   ├── api-reference.md
│   ├── getting-started.md
│   └── ...
├── prompts/             # System prompt templates
├── .agents/             # Agent definitions and kanban
├── benchmarks/          # Performance benchmarks
└── dist/                # Compiled JavaScript (gitignored)
```

---

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the `docs/` directory
- **Code Comments**: Read inline documentation

---

## Recognition

Contributors are recognized in:
- GitHub Contributors page
- Release notes for significant contributions
- Project documentation

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

Don't hesitate to ask! Open an issue or start a discussion on GitHub.

Thank you for contributing to Memory-Agent MCP! 🎉