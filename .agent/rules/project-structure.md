---
trigger: always_on
---

# 🗺️ Project Structure Map

This is a TurboRepo monorepo.

## 📂 Apps

- **`apps/web`**: Main Next.js 15 Application.
    - `app/`: App Router (Pages/Layouts).
    - `components/`: UI Components.
        - `ui/`: Primitives (`layout-system.tsx`, `image-with-fallback.tsx`).
        - `sections/`: Page sections.
    - `lib/`: Utilities.
    - `server/`: tRPC Routers & Context.

## 📦 Packages (Shared)

- **`packages/ui`**: Shared Design System (Radix-based).
- **`packages/config`**: Shared configurations (ESLint, TS, Tailwind).
- **`packages/validators`**: Shared Zod schemas (API/db).
- **`packages/database`** (Planned): Prisma Client singleton.

## 🧭 Navigation Tips

- All new features belong in `apps/web` unless explicitly shared.
- Use `@/` alias for `apps/web` root import.
