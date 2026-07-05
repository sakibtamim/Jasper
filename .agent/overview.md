# Project Overview

> **Agent Instruction**: Read this file to understand the project structure and context.

## 📚 Documentation Index

All core rules and development protocols have been consolidated under `.agent/rules/`:

- **Main Agent Instructions**: [rules/README.md](file:///home/kuasha/Dev/Jasper/.agent/rules/README.md)
- **Project Architecture & Tech Stack**: [rules/overview.md](file:///home/kuasha/Dev/Jasper/.agent/rules/overview.md)
- **Development Standards & Coding Rules**: [rules/development.md](file:///home/kuasha/Dev/Jasper/.agent/rules/development.md)
- **PR & Code Review Guardrails**: [rules/code-review.md](file:///home/kuasha/Dev/Jasper/.agent/rules/code-review.md)
- **Plugin System Rules**: [rules/plugins.md](file:///home/kuasha/Dev/Jasper/.agent/rules/plugins.md)
- **GitHub Workflow & Onboarding**: [rules/workflow.md](file:///home/kuasha/Dev/Jasper/.agent/rules/workflow.md)

## 🚀 Quick Start

1.  **Install**: `pnpm install`
2.  **Env**: `cp .env.example .env` (Populate credentials)
3.  **MCP**: `pnpm run mcp:sync` (Syncs global settings)
4.  **Dev**: `pnpm run dev`

## 🏗️ Monorepo Structure

- `apps/bot`: Discord Bot and Fastify API Server.
- `apps/web`: React Dashboard (Vite).
- `packages/ui`: Shared React UI Primitive components.
- `packages/elements`, `packages/hooks`, `packages/types`: Shared plugin elements, hooks, and typescript types.
