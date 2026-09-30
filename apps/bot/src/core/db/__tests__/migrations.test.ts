import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import {
    Migration,
    MigrationChecksumMismatchError,
    MigrationLockError,
    MigrationRunner,
    PendingMigrationsError,
    calculateChecksum,
    migrations,
} from '../migrations/index.js';

describe('Database Migrations & Runner', () => {
    let db: DatabaseSync;
    let runner: MigrationRunner;

    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        runner = new MigrationRunner();
    });

    describe('Migration Application & Ledger', () => {
        it('should create ledger tables and apply all registered migrations', async () => {
            const result = await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'self-hosted',
                release: 'v1.0.0',
            });

            expect(result.applied).toHaveLength(3);
            expect(result.applied.map((m) => m.version)).toEqual([1, 2, 3]);

            // Verify schema_migrations ledger rows
            const rows = db
                .prepare(
                    'SELECT version, name, checksum, release FROM schema_migrations ORDER BY version ASC',
                )
                .all() as {
                version: number;
                name: string;
                checksum: string;
                release: string | null;
            }[];

            expect(rows).toHaveLength(3);
            expect(rows[0].version).toBe(1);
            expect(rows[0].name).toBe('001_baseline_schema');
            expect(rows[0].release).toBe('v1.0.0');
            expect(rows[0].checksum).toBe(migrations[0].checksum);

            expect(rows[1].version).toBe(2);
            expect(rows[1].name).toBe('002_add_thumbnail_column');
            expect(rows[1].checksum).toBe(migrations[1].checksum);

            expect(rows[2].version).toBe(3);
            expect(rows[2].name).toBe('003_installation_id_and_parity');
            expect(rows[2].checksum).toBe(migrations[2].checksum);

            // Verify schema_migration_lock is unlocked
            const lockRow = db
                .prepare('SELECT locked, locked_by FROM schema_migration_lock WHERE id = 1')
                .get() as { locked: number; locked_by: string | null };
            expect(lockRow.locked).toBe(0);
            expect(lockRow.locked_by).toBeNull();
        });

        it('should be idempotent and not re-apply already applied migrations', async () => {
            const initialResult = await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'self-hosted',
            });
            expect(initialResult.applied).toHaveLength(3);

            const secondResult = await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'self-hosted',
            });
            expect(secondResult.applied).toHaveLength(0);
            expect(secondResult.verifiedCount).toBe(3);
            expect(secondResult.pendingCount).toBe(0);
        });
    });

    describe('Checksum Verification', () => {
        it('should detect altered migration and throw MigrationChecksumMismatchError', async () => {
            // First run successfully applies
            await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'self-hosted',
            });

            // Tamper with migration 1 in registry
            const tamperedMigrations: Migration[] = [
                {
                    ...migrations[0],
                    checksum: 'tampered-checksum-12345',
                },
                migrations[1],
                migrations[2],
            ];

            const customRunner = new MigrationRunner(tamperedMigrations);

            await expect(
                customRunner.run({
                    dialect: 'sqlite',
                    sqliteDb: db,
                    profile: 'self-hosted',
                }),
            ).rejects.toThrow(MigrationChecksumMismatchError);
        });

        it('calculates deterministic SHA-256 checksums', () => {
            const sum1 = calculateChecksum('test', 'SELECT 1;', 'SELECT 1;');
            const sum2 = calculateChecksum('test', 'SELECT 1;', 'SELECT 1;');
            const sum3 = calculateChecksum('test', 'SELECT 2;', 'SELECT 1;');

            expect(sum1).toBe(sum2);
            expect(sum1).not.toBe(sum3);
            expect(sum1).toHaveLength(64);
        });
    });

    describe('Migration Lock Handling', () => {
        it('should throw MigrationLockError if another process holds the lock', async () => {
            // Setup ledger tables manually and lock it
            db.exec(`
                CREATE TABLE schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    release TEXT
                );
                CREATE TABLE schema_migration_lock (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    locked INTEGER NOT NULL DEFAULT 0,
                    locked_at DATETIME,
                    locked_by TEXT
                );
                INSERT INTO schema_migration_lock (id, locked, locked_at, locked_by)
                VALUES (1, 1, CURRENT_TIMESTAMP, 'other-worker-pid-999');
            `);

            await expect(
                runner.run({
                    dialect: 'sqlite',
                    sqliteDb: db,
                    profile: 'self-hosted',
                }),
            ).rejects.toThrow(MigrationLockError);
        });

        it('should release the lock even when migration fails', async () => {
            const failingMigration: Migration = {
                version: 99,
                name: '999_failing_migration',
                description: 'Fails intentionally',
                checksum: 'fake-checksum',
                sql: { sqlite: 'INVALID SQL SYNTAX', postgres: 'INVALID' },
                up: (ctx) => {
                    ctx.sqlite!.exec('THIS IS NOT VALID SQL');
                },
            };

            const customRunner = new MigrationRunner([failingMigration]);

            await expect(
                customRunner.run({
                    dialect: 'sqlite',
                    sqliteDb: db,
                    profile: 'self-hosted',
                }),
            ).rejects.toThrow();

            const lock = db
                .prepare('SELECT locked, locked_by FROM schema_migration_lock WHERE id = 1')
                .get() as { locked: number; locked_by: string | null };

            expect(lock.locked).toBe(0);
            expect(lock.locked_by).toBeNull();
        });
    });

    describe('Hosted Profile Fail-Closed Behavior', () => {
        it('should throw PendingMigrationsError and not apply DDL in hosted mode if pending', async () => {
            await expect(
                runner.run({
                    dialect: 'sqlite',
                    sqliteDb: db,
                    profile: 'hosted',
                }),
            ).rejects.toThrow(PendingMigrationsError);

            // Verify no application tables were created
            const tables = db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='plays'")
                .all();
            expect(tables).toHaveLength(0);
        });

        it('should succeed in hosted mode if all migrations are already applied', async () => {
            // Apply first in self-hosted mode (or via release runner)
            await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'self-hosted',
            });

            // Hosted verification run
            const hostedResult = await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'hosted',
            });

            expect(hostedResult.applied).toHaveLength(0);
            expect(hostedResult.verifiedCount).toBe(3);
            expect(hostedResult.pendingCount).toBe(0);
        });
    });

    describe('SQLite Schema & Parity Invariants', () => {
        beforeEach(async () => {
            await runner.run({
                dialect: 'sqlite',
                sqliteDb: db,
                profile: 'self-hosted',
            });
        });

        it('should have thumbnail and installation_id columns in plays table', () => {
            const tableInfo = db.prepare('PRAGMA table_info(plays)').all() as {
                name: string;
                type: string;
            }[];
            const columnNames = tableInfo.map((col) => col.name);

            expect(columnNames).toContain('thumbnail');
            expect(columnNames).toContain('installation_id');
            expect(columnNames).toContain('guild_id');
            expect(columnNames).toContain('user_id');
        });

        it('should have installation-aware indexes on plays', () => {
            const indexes = db.prepare('PRAGMA index_list(plays)').all() as { name: string }[];
            const indexNames = indexes.map((idx) => idx.name);

            expect(indexNames).toContain('idx_plays_installation_id');
            expect(indexNames).toContain('idx_plays_guild_installation');
        });

        it('should have composite primary key on plugin_storage with installation_id', () => {
            const tableInfo = db.prepare('PRAGMA table_info(plugin_storage)').all() as {
                name: string;
                pk: number;
            }[];

            const pkCols = tableInfo.filter((col) => col.pk > 0).sort((a, b) => a.pk - b.pk);
            const pkNames = pkCols.map((c) => c.name);

            expect(pkNames).toEqual(['plugin_name', 'key', 'installation_id']);
        });

        it('preserves existing data when upgrading to migration 003', async () => {
            const testDb = new DatabaseSync(':memory:');

            // Apply migrations 1 and 2 only
            const partialRunner = new MigrationRunner([migrations[0], migrations[1]]);
            await partialRunner.run({
                dialect: 'sqlite',
                sqliteDb: testDb,
                profile: 'self-hosted',
            });

            // Insert un-scoped plugin data and un-scoped play
            testDb.exec(`
                INSERT INTO plays (user_id, guild_id, channel_id, bot_name, song_title, song_url, duration)
                VALUES ('user-1', 'guild-1', 'channel-1', 'bot-1', 'Old Song', 'http://old.com', 120);

                INSERT INTO plugin_storage (plugin_name, key, value)
                VALUES ('soundboard', 'theme', 'dark');
            `);

            // Now run full migration suite including migration 003
            const fullRunner = new MigrationRunner();
            const upgradeResult = await fullRunner.run({
                dialect: 'sqlite',
                sqliteDb: testDb,
                profile: 'self-hosted',
            });

            expect(upgradeResult.applied).toHaveLength(1);
            expect(upgradeResult.applied[0].version).toBe(3);

            // Check that existing play and plugin data are intact
            const play = testDb
                .prepare('SELECT song_title, installation_id FROM plays WHERE song_title = ?')
                .get('Old Song') as { song_title: string; installation_id: string | null };
            expect(play.song_title).toBe('Old Song');

            const pluginData = testDb
                .prepare('SELECT plugin_name, key, value, installation_id FROM plugin_storage')
                .get() as {
                plugin_name: string;
                key: string;
                value: string;
                installation_id: string;
            };
            expect(pluginData.plugin_name).toBe('soundboard');
            expect(pluginData.key).toBe('theme');
            expect(pluginData.value).toBe('dark');
            expect(pluginData.installation_id).toBe('default');
        });
    });

    describe('PostgreSQL Schema Parity Registry Validation', () => {
        it('should mirror all tables and columns in PostgreSQL migrations', () => {
            for (const migration of migrations) {
                expect(migration.sql.sqlite).toBeTruthy();
                expect(migration.sql.postgres).toBeTruthy();
            }

            // Migration 1: baseline tables
            expect(migrations[0].sql.postgres).toContain('CREATE TABLE IF NOT EXISTS plays');
            expect(migrations[0].sql.postgres).toContain('CREATE TABLE IF NOT EXISTS search_cache');
            expect(migrations[0].sql.postgres).toContain(
                'CREATE TABLE IF NOT EXISTS audio_metadata',
            );
            expect(migrations[0].sql.postgres).toContain('CREATE TABLE IF NOT EXISTS cache_hits');
            expect(migrations[0].sql.postgres).toContain('CREATE TABLE IF NOT EXISTS users');
            expect(migrations[0].sql.postgres).toContain('CREATE TABLE IF NOT EXISTS sessions');
            expect(migrations[0].sql.postgres).toContain(
                'CREATE TABLE IF NOT EXISTS plugin_storage',
            );
            expect(migrations[0].sql.postgres).toContain('CREATE TABLE IF NOT EXISTS plugin_meta');
            expect(migrations[0].sql.postgres).toContain(
                'CREATE TABLE IF NOT EXISTS yt_dlp_cookies',
            );

            // Migration 2: thumbnail
            expect(migrations[1].sql.postgres).toContain('thumbnail');

            // Migration 3: installation_id & composite PK
            expect(migrations[2].sql.postgres).toContain('installation_id');
            expect(migrations[2].sql.postgres).toContain('idx_plays_installation_id');
            expect(migrations[2].sql.postgres).toContain('idx_plays_guild_installation');
            expect(migrations[2].sql.postgres).toContain(
                'PRIMARY KEY (plugin_name, key, installation_id)',
            );
        });
    });
});
