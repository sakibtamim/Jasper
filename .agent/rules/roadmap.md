---
trigger: model_decision
---

# Improvement Roadmap

## Current Status
- ✅ Multi-cat worker pool architecture
- ✅ Web dashboard with OAuth authentication
- ✅ Database abstraction (SQLite/Postgres)
- ✅ Audio caching system
- ✅ Token encryption at rest
- ✅ Test infrastructure (Vitest)
- ⚠️ Test coverage needs expansion

## Testing Infrastructure (High Priority)
**Goal**: Increase confidence in refactoring and new features

- [ ] Expand unit tests for `QueueManager` (critical state management)
- [ ] Expand unit tests for `WorkerPool` (complex AFR logic)
- [ ] Add integration tests for Database Adapters
- [ ] Add tests for encryption/decryption
- [ ] Mock Discord API interactions
- [ ] Test error handling paths

## Code Quality
**Goal**: Reduce complexity and improve maintainability

- [ ] Review `music-player.ts` facade pattern
- [ ] Standardize error handling across modules
- [ ] Minimize `any` usage (strict mode helps, but audit explicit uses)
- [ ] Add JSDoc comments for complex functions
- [ ] Consider extracting large files into smaller modules

## Security Enhancements
**Goal**: Ensure production-ready security

- [x] Encrypt OAuth tokens at rest
- [ ] Add token refresh logic
- [ ] Implement rate limiting on API endpoints
- [ ] Add CSRF protection
- [ ] Audit environment variable usage
- [ ] Add security headers to web server

## Feature Enhancements
**Goal**: Improve user experience

- [ ] Role-based access control (RBAC) for web dashboard
- [ ] WebSocket for real-time dashboard updates (replace polling)
- [ ] Queue persistence across restarts
- [ ] Advanced playlist management
- [ ] User preferences storage
- [ ] Audio equalizer/filters

## Performance Optimizations
**Goal**: Handle larger scale deployments

- [ ] Optimize database queries (add indexes)
- [ ] Implement query result caching
- [ ] Stream large datasets in API responses
- [ ] Optimize yt-dlp process management
- [ ] Add connection pooling for PostgreSQL

## Development Process
**Strategy**: Atomic commits, verify after each change

1. Fix one thing at a time
2. Run tests after every fix
3. Update documentation
4. Create PR with clear description
5. Address review feedback promptly

## Next Steps
1. Run `npm test` to establish baseline
2. Fix any immediate test failures
3. Expand test coverage for critical paths
4. Address high-priority security items
