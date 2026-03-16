#!/usr/bin/env node

/**
 * Memory-Agent MCP Server CLI Entry Point
 *
 * This is the main executable for the npm package.
 * It handles command-line arguments and starts the MCP server.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version info
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

/**
 * Parse command-line arguments
 */
const args = process.argv.slice(2);

/**
 * Show version and exit
 */
if (args.includes('--version') || args.includes('-v')) {
  console.log(packageJson.version);
  process.exit(0);
}

/**
 * Show help and exit
 */
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${packageJson.name} v${packageJson.version}

${packageJson.description}

USAGE:
  memory-agent-mcp [options]

OPTIONS:
  --version, -v    Show version number
  --help, -h       Show this help message

ENVIRONMENT VARIABLES:
  MEMORY_PROJECT_ROOT   Project root directory (default: current working directory)
  MEMORY_MODE          Operation mode: 'full' or 'lite' (default: 'full')
  MEMORY_DB_PATH       Database file path (default: .memory/memory.db)

MODES:
  full    Full AI mode with local embeddings and semantic search
  lite    Lite mode with basic keyword search (no model required)

EXAMPLES:
  # Start with default settings
  memory-agent-mcp

  # Start in lite mode
  MEMORY_MODE=lite memory-agent-mcp

  # Use custom database path
  MEMORY_DB_PATH=/path/to/memory.db memory-agent-mcp

  # Use with npx
  npx @memory-agent/mcp-server

  # Check version
  memory-agent-mcp --version

DOCUMENTATION:
  ${packageJson.homepage}

ISSUES:
  ${packageJson.bugs.url}

LICENSE:
  ${packageJson.license}
`);
  process.exit(0);
}

/**
 * Main entry point - Start the MCP server
 */
async function main() {
  try {
    // Set environment variables with defaults if not already set
    if (!process.env.MEMORY_PROJECT_ROOT) {
      process.env.MEMORY_PROJECT_ROOT = process.cwd();
    }

    // Import and start the server
    // Dynamic import to allow environment variables to be set first
    const { default: serverModule } = await import('../dist/index.js');

    // The server module should export a start function or auto-start
    // If it's auto-starting on import, we're done
    // If it exports a function, call it
    if (typeof serverModule === 'function') {
      await serverModule();
    } else if (serverModule.main && typeof serverModule.main === 'function') {
      await serverModule.main();
    }
    // Otherwise, the module auto-starts on import

  } catch (error) {
    console.error('Failed to start Memory-Agent MCP Server:');
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  console.error('\nReceived SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\nReceived SIGTERM, shutting down...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Start the server
main();
