# Project Understanding & Improvement Plan

## 1. Project Overview
**Jasper** is a sophisticated Discord music bot with a "Multi-Cat" architecture, allowing a single controller bot to manage multiple worker bots for concurrent playback. It features a web dashboard, caching system, and statistics tracking.

## 2. Architecture
- **Controller (Jasper)**: Handles commands and orchestrates workers.
- **Workers (Misty, Tuki, etc.)**: Dedicated bot instances for audio playback.
- **Core Logic**:
    - `src/core/music-player.ts`: Facade for audio operations.
    - `src/core/worker-pool.ts`: Manages worker allocation (AFR).
    - `src/core/db`: Database abstraction (SQLite/Postgres).
- **Web UI**: Fastify server serving a static frontend (`public/`).

## 3. Current Status
- **Tests**: Vitest is set up (`vitest.config.ts`), but coverage needs assessment.
- **Codebase**: TypeScript, strict mode, well-structured.
- **Docs**: `README.md` and `AGENTS.md` are comprehensive.

## 4. Improvement Plan

### A. Testing Infrastructure (Priority)
- **Goal**: Increase confidence in refactoring and new features.
- **Actions**:
    1.  Run existing tests to establish baseline.
    2.  Add unit tests for `QueueManager` (critical state).
    3.  Add unit tests for `WorkerPool` (complex logic).
    4.  Add integration tests for Database Adapters.

### B. Code Quality & Simplification
- **Goal**: Reduce complexity and improve maintainability.
- **Actions**:
    1.  **Review `music-player.ts`**: Ensure it acts as a true facade and doesn't leak logic.
    2.  **Standardize Error Handling**: Ensure consistent error logging and user feedback.
    3.  **Type Safety**: Verify `any` usage is minimized (strict mode helps, but check for explicit `any`).

### C. Bug Fixing Strategy
- **Atomic Commits**: Fix one thing at a time.
- **Verify**: Run tests after every fix.
- **Document**: Update `INSTRUCTIONS.md` or `task.md` with findings.

## 5. Next Steps
1.  Run `npm test` to check current health.
2.  Fix any immediate failures.
3.  Start expanding test coverage for `QueueManager`.
