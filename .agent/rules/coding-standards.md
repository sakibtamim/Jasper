---
trigger: always_on
---

# 📝 Coding Standards & Agent Behavior

## 1. Safety First

- **Filesystem**: Verify file paths with `find_by_name` or `list_dir` before editing.
- **Testing**: Always implement 'QA Checklist' items manually if possible, or script them.
- **Dependencies**:
    - Do not add new npm packages without explicit user approval.
    - **MUST** run `pnpm audit` before adding/upgrading dependencies to check for CVEs.
- **Git Hygiene**:
    - **NEVER** commit directly to `main`. Always use a feature branch.
    - **Check Branch**: Run `git status` before every `git add/commit` sequence.
    - **Granularity**: focused commits only. Separation of concerns (Deps vs Code vs Config). No "misc" or "wip".

## 2. Code Style

- **Components**: Functional Components, named exports.
- **Props**: Explicit Interfaces (no `any`).
- **State**: Use `useMemo`/`useCallback` for expensive computations.
- **Server Actions**: Use `server-only` package for data logic.
- **Mock Initializers**: When defining mock objects that need self-references (e.g., in `deploy-commands.ts`), avoid using arrow functions that refer to the block-scoped variable before its declaration. Instead, use shorthand method syntax and reference `this`.
- **Global React Imports**: For hooks or utilities loaded in environment contexts where React may not be in the global namespace scope, use inline dynamic imports (e.g. `import('react').ComponentType`) instead of referencing `React.ComponentType` directly.
- **Type Safety over `any` Casts**: When casting the global `window` object for dynamic module checks, use structured record castings (e.g., `Record<string, Record<string, import('react').ComponentType<unknown>>>`) instead of coarse `as any` type-casts to preserve ESLint rules and TypeScript validation.
- **Fastify Route Parameter Typing**: Since `IPluginRouter` methods do not accept generic types directly, annotate type parameters on the callback parameters: `async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { ... }`.
- **Date Conversion on Adapters**: Database rows fetched from sqlite adapters must explicitly parse Date fields (e.g., `new Date(row.date)`) to guarantee identical types across SQLite and PostgreSQL databases.
- **Nullish Coalescing for Optional Fields**: When mapping database query results containing nullable fields to typescript interfaces with optional keys (e.g. `prop?: type`), always map them explicitly as `prop: row.prop ?? undefined` to prevent raw `null` values from leaking as `undefined`.

## 3. Communication

- **Updates**: Provide concise status updates (Task Boundary).
- **Errors**: Report errors clearly; do not hide them.
- **Decisions**: Reference `docs/specs/**/*.md` for architectural decisions.

## 4. Documentation Discipline

- **Freshness**: Always keep docs, agent rules, READMES, and comments up to date.
- **The 5-Minute Rule**: Before every PR, take 5 minutes to reflect on changes. Update any impacted documentation. Verify that all open threads/issues are addressed.

## 5. Agent Environment & Shell Portability

- **Package Manager Pathing**: Always execute commands using the path-resolved `pnpm` binary rather than falling back to `npx pnpm` or standard `npm/npx` (which might invoke system Node versions mismatching `.nvmrc`).
- **Non-Interactive Shells**: For non-interactive agent runner shells, rely on standalone `pnpm` installed at `~/.local/share/pnpm/pnpm`.
- **Environment Verification**: When booting a new agent or runner, verify the active binary and Node versions first using:
  `which pnpm && pnpm node -v`
