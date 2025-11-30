---
trigger: model_decision
---

# Development Workflows

## Common Tasks

### Adding a New Command
1. Create file in `apps/bot/src/commands/` (e.g., `mycommand.ts`)
2. Use this boilerplate:
   ```typescript
   import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
   import { Command } from "../types/command.js";

   export default {
     data: new SlashCommandBuilder()
       .setName("mycommand")
       .setDescription("Does something cool"),
     async execute(interaction: ChatInputCommandInteraction) {
       await interaction.reply("Hello!");
     },
   } satisfies Command;
   ```
3. Run `pnpm run deploy:commands`
4. Restart the bot

### Modifying Audio Logic
- Edit `apps/bot/src/core/music-player.ts` or sub-modules in `apps/bot/src/core/audio/`
- Stream handler: `apps/bot/src/core/audio/stream-handler.ts` (yt-dlp integration)
- Always use `workerPool.allocateWorker()` before creating queue
- Always release workers with `workerPool.releaseWorker()` when done
- Queue Map is keyed by `voiceChannelId` for multi-channel support

### Adding Database Models
1. Add interface to `apps/bot/src/core/db/types.ts`
2. Add methods to `DatabaseAdapter` interface
3. Implement in both `sqlite-adapter.ts` and `postgres-adapter.ts`
4. Use proper TypeScript types for all fields

### Handling Interactions
- Button/select menu handlers go in `interaction-create.ts` or in the command that spawned them
- Use `ComponentCollector` for ephemeral interactions
- `playback-engine.ts` uses collectors for playback buttons

## Code Standards

### TypeScript
- Strict mode enabled
- Explicit type annotations required
- Avoid `any` types (use `unknown` with type guards)
- Use defined interfaces for type safety
- File extensions (`.js`) required in imports (ESM)

### Error Handling
- Use custom error classes for domain-specific errors
- Add type guards for runtime validation
- Log errors with `logger.error()` not `console.error()`
- Provide user-friendly error messages

### Async/Await
- Used for all Discord API calls and file I/O
- Proper error handling in try-catch blocks
- Avoid callback-based patterns

### Import Patterns
- ES Modules only (`import`/`export`)
- Use `.js` extensions even for `.ts` files
- Organize imports: external → internal → types

## Testing

### Running Tests
```bash
pnpm test              # Run all tests (Turbo)
pnpm run test:watch    # Watch mode
pnpm run test:coverage # Coverage report
```

### Writing Tests
- Use Vitest framework
- Unit tests for business logic
- Integration tests for database adapters
- Mock external dependencies (Discord API, yt-dlp)

## Debugging

### Common Issues

**"yt-dlp not found"**
- Binary missing from root
- Fix: `pnpm run postinstall` or manual download

**Audio Stops / 403 Errors**
- YouTube anti-bot measures
- Fix: Update `yt-dlp` binary to latest

**Permissions**
- Bot needs: `Connect`, `Speak`, `Send Messages`, `Embed Links`, `Manage Channels`
- Worker bots need same permissions
- Ensure all bots invited to server

### Logging
- Use `apps/bot/src/core/logger.ts` instead of `console.log`
- AFR decisions logged for debugging
- Database queries logged in development
- Web API requests logged with `fastify.log`

## Deployment

### Building
```bash
pnpm run build  # Compiles all apps/packages via Turbo
pnpm start      # Runs compiled JavaScript
```

### Environment
- Production should use PostgreSQL (set `DATABASE_URL`)
- Set `AFR_JASPER_WEIGHT` for production behavior
- Ensure `ENCRYPTION_KEY` is 32+ characters
- Use `BASE_URL` for OAuth redirect URI
- Use `FRONTEND_URL` for React redirects

### Monitoring
- Web dashboard at `/` shows bot status
- `/api/status` endpoint for health checks
- Check worker pool state with `/music-status` command

## Agent Guidelines

### File Updates
- **.gemini/** and **.agent/rules/**: Always use command line tools (e.g., `cat`, `sed`) or full file rewrites to update these files. Do NOT use partial replacement tools.

### Commit Practices
- **Atomic Commits**: Prefer small, focused commits that address a single logical change.
- **Descriptive Messages**: Write clear, concise commit messages explaining the "why" and "what".

### Temporary Files
- **Workspace Hygiene**: Never save temporary files (logs, diffs, review comments) in the root or source directories.
- **Location**: Always use the `tmp/` directory, which is gitignored.
- **Cleanup**: Delete temporary files when they are no longer needed.