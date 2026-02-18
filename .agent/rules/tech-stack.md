---
trigger: always_on
---

# 🛠️ Tech Stack & Workflow

## Core Stack

- **Framework**: Next.js 15 (App Router).
- **Language**: TypeScript (Strict Mode).
- **Styling**: Tailwind CSS + `packages/ui` (Shadcn/Radix).
- **API**: tRPC v11 + React Query (Tanstack).
- **Database**: PostgreSQL + Prisma ORM.
- **Auth**: NextAuth v5 (Google Provider).
- **AI Context**: Context7 MCP (Mandatory for documentation lookup).

## Key Workflows

- **Dev Server**:
    - `pnpm dev` (Standard)
    - `pnpm dev:fresh` (Use when testing Auth/Redirects or ensuring clean port start).
- **Database**:
    - `pnpm db:push` (for schema prototyping).
    - `pnpm migrate` (for versioned migrations).
    - `npx prisma studio` (Viewer).
- **Linting**: `pnpm lint`.

## Critical Patterns

- **Images**: MUST use `ImageWithFallback` from `@/components/ui/image-with-fallback`.
- **Layout**: MUST use `Section`, `Container` from `@/components/ui/layout-system`.
- **Fetching**: Use tRPC hooks (`trpc.example.useQuery`) in Client Components; `caller` in Server Components.
