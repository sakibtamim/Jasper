---
trigger: always_on
---

# 🛠️ Development Standards & Workflows

## 🛡️ Guardrails & Safety First

1. **Branching Strategy**: **NEVER** commit directly to `main` or `master`. Always create feature (`feat/`), bugfix (`fix/`), or chore (`chore/`) branches.
2. **Environment & Sync**: Run `git status` to ensure a clean slate before any commits. Propose gitignoring newly discovered temporary files instead of committing them.
3. **Dependencies & CVEs**: Do not install packages without approval. Run `pnpm audit` before upgrades/additions to check for vulnerability alerts.
4. **Shell Portability**: Use path-resolved `pnpm` (typically `~/.local/share/pnpm/pnpm`) rather than generic `npx pnpm` or `npm`. Verify version with `which pnpm && pnpm node -v` on startup.
5. **Fail Early**: Stop execution immediately on any non-zero exit code. Never ignore lint, test, or build errors.

## 📝 Code Standards & TypeScript Guidelines

- **Strict TypeScript**: Do not use `any`. Use `unknown` with type guards.
- **ES Modules (ESM)**: All imports must end with `.js` extensions (even for `.ts` files).
- **React & Styling**: Use functional components with named exports. Utilize design primitives from `@jasper/ui` rather than custom systems.
- **Fastify Type Safety**: Annotate parameters directly on route callbacks:
  `async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => { ... }`
- **Database Parity**:SQLite data adapter dates must be parsed explicitly: `new Date(row.date)`. Map nullable columns using explicit nullish coalescing to prevent raw `null` leaks: `prop: row.prop ?? undefined`.
- **Mock Initializers**: Do not use arrow functions referencing block-scoped variables before declaration. Use shorthand methods and reference `this`.

---

## 🚀 Key Workflows

### 1. Adding a Slash Command

Create `apps/bot/src/commands/mycommand.ts` using this boilerplate:

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { Command } from '../types/command.js';

export default {
    data: new SlashCommandBuilder().setName('mycommand').setDescription('Boilerplate desc'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply('Hello World!');
    },
} satisfies Command;
```

After creating, run `pnpm run deploy:commands` to register it.

### 2. Audio playback & Worker Management

- Always wrap audio queue creation with `workerPool.allocateWorker()`.
- Always release workers via `workerPool.releaseWorker()` when playback completes or fails.
- Key the queue map by `voiceChannelId` to support concurrent voice channels.

### 3. Verification & Testing

- **Test execution**: `pnpm test` (Vitest via Turborepo), `pnpm run test:watch`, `pnpm run test:coverage`.
- **Formatting**: Run `pnpm run format` to clean up source files.
