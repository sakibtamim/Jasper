# Identified Issues & Improvements

## Unused Dependencies (Can be removed)
The following dependencies are not used anywhere in the codebase:

1. **`@discordjs/rest`** - The REST API is accessed via `discord.js` exports
2. **`@distube/ytdl-core`** - Project uses `yt-dlp` instead
3. **`@snazzah/davey`** - Not used anywhere
4. **`ffmpeg-static`** - Not imported or used
5. **`libsodium-wrappers`** - Not imported or used

These can be safely removed from `package.json`.

## Unused devDependencies (Can be removed)
1. **`@typescript-eslint/eslint-plugin`** - Using `typescript-eslint` instead
2. **`@typescript-eslint/parser`** - Using `typescript-eslint` instead

## Fixed Issues
1. ✅ **ESLint Config Error**: Fixed invalid `no-console` rule configuration
2. ✅ **Lint Warnings**: Removed all unused imports and variables

## Potential Future Improvements
1. **Worker Pool Testing**: Add more edge case tests for AFR selection
2. **Integration Tests**: Add end-to-end tests for the full play command flow
3. **Error Handling**: Standardize error messages across the codebase
4. **Type Safety**: Review and minimize any remaining `unknown` types
5. **Database Tests**: Add tests for PostgreSQL adapter
6. **Caching**: Consider adding tests for the cache manager
7. **Documentation**: Add JSDoc comments to public API functions
