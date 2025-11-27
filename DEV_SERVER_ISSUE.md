# Dev Server Issue - STATUS: RESOLVED

## Issue
The Vite dev server at `http://localhost:5173/` shows a blank page with the error:
```
Failed to load resource: the server responded with a status of 404 (Not Found) 
http://localhost:5173/api/client.ts
```

## Root Cause
The proxy configuration in `vite.config.ts` was interfering with TypeScript module resolution. The pattern `/api` was matching both:
- Actual HTTP API calls (good) 
- Module imports like `../api/client.ts` (bad)

## Solution Found
1. **Dashboard URL**: Use `http://localhost:5173/react-dashboard` (not just `/`)
   - The React Router basename is `/react-dashboard`
   - Direct `http://localhost:5173/` doesn't work because of routing

2. **Proxy Fix Needed**: Add back proxy with a bypass function:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      bypass(req) {
        // Don't proxy if it's requesting a .ts or .tsx file
        if (req.url?.match(/\.(ts|tsx)$/)) {
          return req.url;
        }
      }
    }
  }
}
```

## Current State
- ✅ Dashboard renders at `http://localhost:5173/react-dashboard`
- ✅ All UI components display correctly
- ❌ API calls fail because proxy is currently disabled
- ❌ Need to add proxy back with bypass function

## Next Steps
1. Add the proxy configuration with bypass function
2. Restart dev server
3. Test at `http://localhost:5173/react-dashboard`
4. Verify API calls work (workers, stats, etc load data)
5. Commit the working configuration

## Files to Modify
- `vite.config.ts` - Add proxy with bypass function
