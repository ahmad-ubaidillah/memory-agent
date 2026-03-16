# Changelog

All notable changes to Memory-Agent MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation suite (MEM-008 in progress)
  - Getting Started Guide
  - Architecture documentation
  - Configuration reference
  - API reference (coming soon)
  - Client setup guides (coming soon)
  - Troubleshooting guide (coming soon)
  - Usage examples (coming soon)
- System prompt templates for automatic memory integration (MEM-004)
  - Full AI Mode template with semantic search instructions
  - Lite Mode template with keyword search instructions
  - Comprehensive usage documentation

## [1.0.0] - 2025-03-17

### Added
- **Memory Interceptor System** (MEM-001)
  - `memory_enhance_prompt` tool for pre-processing prompts with context
  - `memory_auto_learn` tool for post-processing conversations
  - Pre-processor component for context injection
  - Post-processor component for automatic learning extraction
  - Pattern detector for identifying decisions, bugs, and patterns
  - Automatic TOON format generation
  - Async background processing

- **Memory Review Tool** (MEM-003)
  - List unreviewed memories
  - Approve, edit, delete memories
  - Promote/demote importance scores
  - Batch operations support
  - Structured JSON responses

- **Memory Decay Function** (MEM-002)
  - Time-based importance decay
  - Configurable decay rate and threshold
  - Automatic cleanup of trivial memories
  - Access-based importance boosting
  - Decay exemption for critical memories

- **NPM Package Publication** (MEM-009)
  - Published as `@memory-agent/mcp-server` on npm
  - CLI entry point with --version and --help support
  - TypeScript type definitions included
  - Source maps for debugging
  - Automated CI/CD publishing workflow
  - npm provenance for security
  - Package size: 404.1 KB (compressed)
  - Easy installation: `npm install -g @memory-agent/mcp-server`
  - npx support: `npx @memory-agent/mcp-server`
  - Environment variable configuration
  - Cross-platform compatibility (Node.js >=18.0.0)

- **Comprehensive Testing Suite** (MEM-005)
  - Unit tests for all core components
  - Integration tests for MCP protocol
  - E2E tests for full workflows
  - Test fixtures and helpers
  - Coverage reporting (>85% for tools)

- **Error Handling System** (MEM-006)
  - Typed error classes for all error scenarios
  - Structured error responses
  - Error wrapping utilities
  - Comprehensive error logging
  - Graceful degradation patterns

- **Performance Benchmarking** (MEM-007)
  - Response time benchmarks for all operations
  - Memory usage profiling
  - Database performance testing
  - Startup time optimization
  - Performance regression tests

### Core Features
- **12 MCP Tools** implemented:
  1. `memory_store` - Store new memories in TOON format
  2. `memory_query` - Query memories (semantic or keyword)
  3. `memory_forget` - Delete specific memories
  4. `memory_stats` - Get memory statistics
  5. `memory_enhance_prompt` - Pre-process prompts with context
  6. `memory_auto_learn` - Auto-extract learnings from conversations
  7. `memory_decay` - Apply time-based importance decay
  8. `memory_review` - Review and manage memories
  9. `memory_ingest` - Ingest files into memory
  10. `memory_compress` - Compress old memories
  11. `memory_export` - Export memories to JSON
  12. `memory_import` - Import memories from JSON

- **Hybrid Operation Modes**
  - Full AI Mode: Semantic search with vector embeddings
  - Lite Mode: Fast keyword-based search, zero dependencies
  - Automatic mode detection and fallback

- **TOON Format** (Token-Oriented Object Notation)
  - Structured memory storage format
  - Efficient token usage
  - Easy to parse and search
  - Example: `key:value|key:value|key:value`

- **Memory Lifecycle Management**
  - Automatic importance scoring
  - Access tracking and boosting
  - Time-based decay
  - Archival and cleanup

### Technical Details
- **Database**: SQLite with WAL mode
- **Runtime**: Bun.js (primary), Node.js (compatible)
- **Protocol**: Model Context Protocol (MCP)
- **Language**: TypeScript with strict typing
- **Validation**: Zod schemas for all inputs
- **Testing**: Bun test runner with >85% coverage

### Performance
- Storage operations: <100ms (P99)
- Query operations: <150ms (P99)
- Interceptor operations: <50ms (P99)
- Startup time: <2 seconds (Full AI), <100ms (Lite)

### Supported Clients
- Claude Desktop
- Cursor IDE
- Windsurf
- VS Code (with Continue.dev)
- Any MCP-compliant client

## [1.0.0] - 2024-12-01

### Added
- Initial MCP server implementation
- Basic memory storage and retrieval
- SQLite database layer
- MCP protocol compliance
- Basic tool set (store, query, forget, stats)
- Project structure and configuration
- Development environment setup
- Basic documentation

### Technical Foundation
- TypeScript project structure
- Bun.js runtime setup
- SQLite database integration
- MCP SDK integration
- Basic error handling
- Development tooling (lint, test, build)

## [0.1.0] - 2024-11-15

### Added
- Project initialization
- Repository setup
- Basic architecture design
- Initial planning and roadmap
- Agent role definitions (Dev, QA, PM)
- Workflow documentation
- Skill documentation

---

## Version History Summary

| Version | Date | Major Features |
|---------|------|----------------|
| 2.0.0 | 2025-01-19 | Memory Interceptor, Review Tool, Decay, Testing, Error Handling, Benchmarks |
| 1.0.0 | 2024-12-01 | Initial MCP server, basic memory operations |
| 0.1.0 | 2024-11-15 | Project initialization |

---

## Upcoming Features

### [2.1.0] - Planned
- Vector index optimization (HNSW/IVF)
- Memory partitioning
- Enhanced pattern detection
- Custom embedding models support
- Performance improvements

### [2.2.0] - Planned
- Plugin system
- Advanced memory analytics
- Team collaboration features
- Cloud sync (optional)
- Web dashboard

### [3.0.0] - Future
- Multi-tenancy support
- Distributed storage
- Advanced AI features
- Enterprise features

---

## Migration Guides

### Upgrading from 1.0.0 to 2.0.0

**Breaking Changes:**
- Memory schema updated (new fields added)
- Tool interface changes (some parameters renamed)
- Configuration format changed

**Migration Steps:**
1. Export existing memories: `memory_export({ format: "json" })`
2. Update to version 2.0.0
3. Import memories: `memory_import({ data: exported, merge: false })`
4. Update configuration files
5. Update system prompts (if using)

**New Features to Enable:**
- Set up system prompt template for automatic memory
- Configure decay settings
- Review memory importance scores
- Test interceptor tools

---

## Deprecation Notices

### Version 2.0.0
- None (first major release)

### Future Deprecations (3.0.0)
- Legacy tool interfaces (if any)
- Old configuration format
- Deprecated API endpoints

---

## Security Updates

### Version 2.0.0
- Enhanced input validation
- SQL injection prevention (parameterized queries)
- Improved error handling (no sensitive data in errors)
- Local-only storage (no network exposure)

---

## Performance Improvements

### Version 2.0.0
- Query optimization with indexes
- Connection pooling
- Async processing for interceptors
- Caching layer for frequent queries
- Optimized embedding generation (Full AI Mode)

---

## Known Issues

### Version 2.0.0
- First-time model download may take 2-5 minutes (Full AI Mode)
- Large memory databases (>50,000 memories) may need manual archival
- Lite Mode search requires exact keyword matches
- Some MCP clients may need restart after configuration changes

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

---

## Links

- [Documentation](./docs/)
- [API Reference](./docs/api-reference.md)
- [Getting Started](./docs/getting-started.md)
- [GitHub Repository](https://github.com/memory-agent/memory-agent-mcp)
- [Issue Tracker](https://github.com/memory-agent/memory-agent-mcp/issues)

---

**Last Updated:** 2025-01-19  
**Current Version:** 2.0.0  
**Next Release:** 2.1.0 (Planned)