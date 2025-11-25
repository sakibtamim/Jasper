# Agent Instructions

> **META-INSTRUCTION**: Read this file at the start of each session to understand the project context. Update as needed with critical details.

## Quick Reference
- **Project Docs**: See `.agent/overview.md` for project description
- **Architecture**: See `.agent/architecture.md` for system design
- **Development**: See `.agent/development.md` for workflows
- **Code Review**: See `.agent/code-review.md` for PR review process
- **Roadmap**: See `.agent/roadmap.md` for improvement plans

## File Organization
The `.agent/` directory contains:
- `overview.md` - Project overview and tech stack
- `architecture.md` - Architectural details and patterns
- `development.md` - Development workflows and standards
- `code-review.md` - PR review process
- `roadmap.md` - Improvement roadmap and priorities

## Key Project Characteristics
1. **TypeScript Strict Mode**: All code must be fully typed
2. **ES Modules**: Use `import`/`export` with `.js` extensions
3. **Multi-Bot Architecture**: Controller + worker pool pattern
4. **Database Agnostic**: Support both SQLite and PostgreSQL
5. **Security First**: Encrypt sensitive data, validate inputs

## Critical Dependencies
- `yt-dlp` binary MUST be in root or system PATH
- FFmpeg required for audio processing
- Environment variables must be validated at startup
- OAuth tokens MUST be encrypted at rest

## Development Rules
1. **Atomic Commits**: One logical change per commit
2. **Type Safety**: No `any` types without justification
3. **Testing**: Run tests before committing
4. **Documentation**: Update docs with code changes
5. **Error Handling**: Use custom error classes

## Agent Behavior
- Read all `.agent/*.md` files before making significant changes
- Update documentation when architecture changes
- Ask for clarification on ambiguous requirements
- Suggest improvements but respect existing patterns
- Keep commits focused and well-described
