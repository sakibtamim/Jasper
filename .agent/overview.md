# Project Overview

> **Agent Instruction**: Read this file to understand the project structure and context.

## 📚 Documentation Index

- **Architecture**: `architecture.md`
- **Development**: `development.md`
- **Standards**:
    - `rules/coding-standards.md`
    - `rules/guardrails.md`
    - `rules/issue-execution.md`
    - `rules/security-standards.md`
    - `rules/tech-stack.md`
- **Roadmap**: `roadmap.md`

## 🚀 Quick Start

1.  **Install**: `pnpm install`
2.  **Env**: `cp .env.example .env` (Populate secrets)
3.  **MCP**: `pnpm mcp:sync` (Syncs global config)
4.  **Dev**: `pnpm dev`

## 🏗️ Monorepo Structure

- `apps/web`: Next.js Dashboard
- `apps/bot`: Discord Bot (Node.js)
- `packages/ui`: Shared Design System
- `packages/database`: Prisma Client

## 🤖 Agent Protocols (PSL 2.0)

This project follows strict agentic protocols defined in `.agent/rules`.

- **Issues**: Must use templates and follow the Execution Protocol.
- **Commits**: Must follow Conventional Commits (`feat:`, `fix:`).
- **Safety**: Respect Guardrails (No direct main commits, no broken builds).
