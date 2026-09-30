import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('OCI Base Image & One-Container SQLite Quickstart (HJ-OSS-14)', () => {
    const repoRoot = path.resolve(__dirname, '../../../../../');
    const dockerfilePath = path.join(repoRoot, 'Dockerfile');
    const dockerignorePath = path.join(repoRoot, '.dockerignore');
    const composePath = path.join(repoRoot, 'docker-compose.quickstart.yml');
    const entrypointPath = path.join(repoRoot, 'scripts/docker-entrypoint.sh');
    const migrateSrcPath = path.join(repoRoot, 'apps/bot/src/migrate.ts');

    describe('1. Dockerfile Specification & Multi-Stage Architecture', () => {
        it('exists and uses node:24-bookworm-slim base with multi-stage build', () => {
            expect(fs.existsSync(dockerfilePath)).toBe(true);
            const content = fs.readFileSync(dockerfilePath, 'utf8');

            // Multi-stage builder and runner
            expect(content).toMatch(/FROM\s+node:24-bookworm-slim\s+AS\s+builder/i);
            expect(content).toMatch(/FROM\s+node:24-bookworm-slim\s+AS\s+runner/i);
        });

        it('pins required system media dependencies and init supervisor', () => {
            const content = fs.readFileSync(dockerfilePath, 'utf8');

            // Pinned system media packages
            expect(content).toContain('ffmpeg');
            expect(content).toContain('python3');
            expect(content).toContain('dumb-init');
            expect(content).toContain('ca-certificates');
            expect(content).toContain('curl');

            // Pre-installed yt-dlp to avoid mutable runtime download
            expect(content).toMatch(/curl.*yt-dlp.*\/usr\/local\/bin\/yt-dlp/);
        });

        it('enforces non-root execution and sets entrypoint to dumb-init', () => {
            const content = fs.readFileSync(dockerfilePath, 'utf8');

            // Non-root node user
            expect(content).toMatch(/USER\s+node/);

            // Entrypoint with dumb-init and entrypoint script
            expect(content).toMatch(/ENTRYPOINT\s+\[.*dumb-init.*docker-entrypoint\.sh.*\]/);

            // Default CMD
            expect(content).toMatch(/CMD\s+\["migrate-and-start"\]/);
        });

        it('declares persistent SQLite volume at /data and exports default environment', () => {
            const content = fs.readFileSync(dockerfilePath, 'utf8');

            expect(content).toMatch(/VOLUME\s+\["\/data"\]/);
            expect(content).toContain('SQLITE_PATH=/data/jasper.sqlite');
            expect(content).toContain('DB_TYPE=sqlite');
            expect(content).toContain('RUNTIME_PROFILE=self-hosted');
            expect(content).toContain('EXPOSE 3000');
        });

        it('provides .dockerignore excluding build artifacts, secrets, and local databases', () => {
            expect(fs.existsSync(dockerignorePath)).toBe(true);
            const content = fs.readFileSync(dockerignorePath, 'utf8');

            expect(content).toContain('node_modules');
            expect(content).toContain('.git');
            expect(content).toContain('.env');
            expect(content).toMatch(/data\/\*\.db/);
            expect(content).toMatch(/data\/\*\.sqlite/);
        });
    });

    describe('2. Docker Compose Quickstart Specification', () => {
        it('defines zero-config one-container quickstart with SQLite volume', () => {
            expect(fs.existsSync(composePath)).toBe(true);
            const content = fs.readFileSync(composePath, 'utf8');

            // Service definition
            expect(content).toContain('jasper:');
            expect(content).toContain('user: "1000:1000"');
            expect(content).toContain('3000:3000');

            // Required environment variables
            expect(content).toContain('NODE_ENV=production');
            expect(content).toContain('DB_TYPE=sqlite');
            expect(content).toContain('SQLITE_PATH=/data/jasper.sqlite');
            expect(content).toContain('DISCORD_TOKEN=');
            expect(content).toContain('DISCORD_CLIENT_ID=');

            // Volume mounting
            expect(content).toMatch(/- [a-zA-Z0-9_-]+:\/data/);
            expect(content).toContain('volumes:');

            // Healthcheck
            expect(content).toContain('healthcheck:');
            expect(content).toContain('/health/live');
        });
    });

    describe('3. Docker Entrypoint Script Mechanics', () => {
        it('has executable permissions and passes bash syntax validation', () => {
            expect(fs.existsSync(entrypointPath)).toBe(true);
            const stats = fs.statSync(entrypointPath);
            // Executable by owner/group/other
            expect(stats.mode & 0o111).toBeGreaterThan(0);

            // Bash syntax check
            const res = spawnSync('bash', ['-n', entrypointPath], { encoding: 'utf8' });
            expect(res.status).toBe(0);
            expect(res.stderr).toBe('');
        });

        it('dispatches custom commands seamlessly via exec', () => {
            const res = spawnSync('bash', [entrypointPath, 'echo', 'custom-command-executed'], {
                encoding: 'utf8',
                cwd: repoRoot,
            });

            expect(res.status).toBe(0);
            expect(res.stdout).toContain('custom-command-executed');
        });

        it('supports SQLite volume default and directory resolution', () => {
            const tmpTestDir = path.join(repoRoot, 'tmp', 'entrypoint-test-' + Date.now());
            const tmpSqlitePath = path.join(tmpTestDir, 'nested', 'test.sqlite');

            try {
                // Test script executes with custom SQLITE_PATH and ensures directory creation
                const res = spawnSync(
                    'bash',
                    ['-c', `SQLITE_PATH="${tmpSqlitePath}" "${entrypointPath}" echo ready`],
                    {
                        encoding: 'utf8',
                        cwd: repoRoot,
                    },
                );

                expect(res.status).toBe(0);
                expect(res.stdout).toContain('ready');
                expect(fs.existsSync(path.dirname(tmpSqlitePath))).toBe(true);
            } finally {
                if (fs.existsSync(tmpTestDir)) {
                    fs.rmSync(tmpTestDir, { recursive: true, force: true });
                }
            }
        });

        it('recognizes migrate, deploy-commands, start, and migrate-and-start subcommands', () => {
            const content = fs.readFileSync(entrypointPath, 'utf8');

            expect(content).toContain('migrate)');
            expect(content).toContain('deploy-commands)');
            expect(content).toContain('start)');
            expect(content).toContain('migrate-and-start)');
        });
    });

    describe('4. Standalone Migration CLI & Script Integration', () => {
        it('provides apps/bot/src/migrate.ts entrypoint', () => {
            expect(fs.existsSync(migrateSrcPath)).toBe(true);
            const content = fs.readFileSync(migrateSrcPath, 'utf8');

            expect(content).toContain('db.init()');
            expect(content).toContain('process.exit(0)');
        });

        it('registers db:migrate and db:migrate:dev in apps/bot/package.json', () => {
            const pkgPath = path.join(repoRoot, 'apps/bot/package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

            expect(pkg.scripts['db:migrate']).toBe('node dist/migrate.js');
            expect(pkg.scripts['db:migrate:dev']).toBe('tsx src/migrate.ts');
        });
    });
});
