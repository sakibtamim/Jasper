# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build stage
# Compiles TypeScript monorepo packages, bot server, plugins, and web UI.
# ==============================================================================
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Install system build dependencies for native compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm matching repository version
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy workspace configuration and package manifests for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/elements/package.json ./packages/elements/
COPY packages/hooks/package.json ./packages/hooks/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/bot/package.json ./apps/bot/
COPY apps/web/package.json ./apps/web/
COPY apps/website/package.json ./apps/website/
COPY apps/bot/src/plugins/garage-band/package.json ./apps/bot/src/plugins/garage-band/

# Install all dependencies (dev + prod)
RUN pnpm install --frozen-lockfile

# Copy monorepo source code
COPY . .

# Build all packages, bot distribution, plugins, and web dashboard
RUN pnpm turbo run build --filter=@jasper/types... --filter=@jasper/hooks... --filter=@jasper/elements... --filter=@jasper/ui... --filter=jasper-bot... --filter=jasper-web...

# Prune devDependencies to keep runtime node_modules minimal
RUN pnpm prune --prod --ignore-scripts

# ==============================================================================
# Stage 2: Production runtime stage
# Pinned media dependencies, dumb-init, non-root user, SQLite volume.
# ==============================================================================
FROM node:24-bookworm-slim AS runner

LABEL org.opencontainers.image.title="Jasper" \
      org.opencontainers.image.description="Robust Discord music bot and operational platform" \
      org.opencontainers.image.vendor="Purrfect Software Limited" \
      org.opencontainers.image.licenses="GPL-3.0"

WORKDIR /app

# Install pinned system runtime dependencies: ffmpeg, python3, dumb-init, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    dumb-init \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pinned yt-dlp binary to avoid mutable runtime download
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/download/2025.02.19/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && yt-dlp --version || true

# Prepare persistent data volume directory and assign to non-root 'node' user
RUN mkdir -p /data /app && chown -R node:node /data /app && chmod 755 /data

# Copy production node_modules from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy built packages and apps from builder
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps/bot ./apps/bot
COPY --from=builder --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=node:node /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN chmod +x ./scripts/docker-entrypoint.sh

# Runtime configuration defaults (provider-neutral, self-hosted, SQLite quick path)
ENV NODE_ENV=production \
    RUNTIME_PROFILE=self-hosted \
    PORT=3000 \
    DB_TYPE=sqlite \
    SQLITE_PATH=/data/jasper.sqlite \
    DATA_DIR=/data

# Expose HTTP web server & health port
EXPOSE 3000

# Declare persistent SQLite volume
VOLUME ["/data"]

# Run as non-root user
USER node

# Use dumb-init as top-level PID 1 init process for signal forwarding
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/scripts/docker-entrypoint.sh"]

# Default subcommand is migrate-and-start
CMD ["migrate-and-start"]
