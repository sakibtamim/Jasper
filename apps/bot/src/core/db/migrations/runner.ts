import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

import { getRuntimeProfile } from '../../../config/env.js';
import logger from '../../logger.js';
import { migrations as registeredMigrations } from './registry.js';
import {
    AppliedMigration,
    Migration,
    MigrationChecksumMismatchError,
    MigrationContext,
    MigrationLockError,
    MigrationRunOptions,
    MigrationRunResult,
    PendingMigrationsError,
} from './types.js';

const POSTGRES_ADVISORY_LOCK_ID = 742938472;

export class MigrationRunner {
    private registered: Migration[];

    constructor(customMigrations?: Migration[]) {
        this.registered = customMigrations ?? registeredMigrations;
    }

    /**
     * Run migration check and execution respecting runtime profile:
     * - In 'hosted' profile: Verifies schema and fails closed if migrations are pending.
     * - In 'self-hosted' profile: Verifies checksums and applies pending migrations.
     */
    async run(options: MigrationRunOptions): Promise<MigrationRunResult> {
        const profile = options.profile ?? getRuntimeProfile();
        const lockId = `runner-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        if (options.dialect === 'sqlite') {
            if (!options.sqliteDb) {
                throw new Error('sqliteDb instance is required for SQLite migrations');
            }
            return this.runSqlite(options.sqliteDb, profile, lockId, options.release);
        } else {
            if (!options.postgresPool) {
                throw new Error('postgresPool instance is required for PostgreSQL migrations');
            }
            return this.runPostgres(options.postgresPool, profile, lockId, options.release);
        }
    }

    private async runSqlite(
        db: DatabaseSync,
        profile: 'self-hosted' | 'hosted',
        lockId: string,
        release?: string,
    ): Promise<MigrationRunResult> {
        // 1. Ensure migration and lock ledger tables exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                checksum TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                release TEXT
            );

            CREATE TABLE IF NOT EXISTS schema_migration_lock (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                locked INTEGER NOT NULL DEFAULT 0,
                locked_at DATETIME,
                locked_by TEXT
            );

            INSERT OR IGNORE INTO schema_migration_lock (id, locked) VALUES (1, 0);
        `);

        // 2. Acquire migration lock
        this.acquireSqliteLock(db, lockId);

        try {
            // 3. Fetch applied migrations
            const appliedRows = db
                .prepare(
                    'SELECT version, name, checksum, applied_at as appliedAt, release FROM schema_migrations ORDER BY version ASC',
                )
                .all() as unknown as {
                version: number;
                name: string;
                checksum: string;
                appliedAt: string;
                release: string | null;
            }[];

            const appliedMap = new Map<number, AppliedMigration>();
            for (const row of appliedRows) {
                appliedMap.set(row.version, {
                    version: row.version,
                    name: row.name,
                    checksum: row.checksum,
                    appliedAt: new Date(row.appliedAt),
                    release: row.release,
                });
            }

            // 4. Verify checksums for previously applied migrations
            for (const [version, applied] of appliedMap.entries()) {
                const target = this.registered.find((m) => m.version === version);
                if (target && target.checksum !== applied.checksum) {
                    throw new MigrationChecksumMismatchError(
                        target.version,
                        target.name,
                        target.checksum,
                        applied.checksum,
                    );
                }
            }

            // 5. Determine pending migrations
            const pending = this.registered
                .filter((m) => !appliedMap.has(m.version))
                .sort((a, b) => a.version - b.version);

            // 6. Fail closed in hosted profile if pending migrations exist
            if (profile === 'hosted') {
                if (pending.length > 0) {
                    throw new PendingMigrationsError(pending);
                }
                logger.info(
                    `[migrations] Schema verified. All ${this.registered.length} migrations verified in hosted mode.`,
                );
                return {
                    applied: [],
                    verifiedCount: appliedMap.size,
                    pendingCount: 0,
                };
            }

            // 7. Apply pending migrations in self-hosted profile
            const appliedNow: Migration[] = [];
            const ctx: MigrationContext = {
                dialect: 'sqlite',
                sqlite: db,
            };

            for (const migration of pending) {
                logger.info(
                    `[migrations] Applying migration ${migration.version}: ${migration.name}`,
                );

                db.exec('BEGIN TRANSACTION');
                try {
                    await migration.up(ctx);

                    db.prepare(
                        `INSERT INTO schema_migrations (version, name, checksum, applied_at, release)
                         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`,
                    ).run(migration.version, migration.name, migration.checksum, release || null);

                    db.exec('COMMIT');
                    appliedNow.push(migration);
                    logger.info(
                        `[migrations] Successfully applied migration ${migration.version}: ${migration.name}`,
                    );
                } catch (err) {
                    db.exec('ROLLBACK');
                    logger.error(
                        `[migrations] Migration ${migration.version} failed: ${err instanceof Error ? err.message : String(err)}`,
                    );
                    throw err;
                }
            }

            return {
                applied: appliedNow,
                verifiedCount: appliedMap.size,
                pendingCount: pending.length,
            };
        } finally {
            this.releaseSqliteLock(db, lockId);
        }
    }

    private acquireSqliteLock(db: DatabaseSync, lockId: string): void {
        const updateStmt = db.prepare(`
            UPDATE schema_migration_lock
            SET locked = 1, locked_at = CURRENT_TIMESTAMP, locked_by = ?
            WHERE id = 1 AND locked = 0
        `);

        const result = updateStmt.run(lockId);
        if (result.changes === 0) {
            const currentLock = db
                .prepare('SELECT locked_at, locked_by FROM schema_migration_lock WHERE id = 1')
                .get() as { locked_at: string; locked_by: string } | undefined;
            throw new MigrationLockError(
                `Database migration lock is held by "${currentLock?.locked_by || 'unknown'}" since ${currentLock?.locked_at || 'unknown'}`,
            );
        }
    }

    private releaseSqliteLock(db: DatabaseSync, lockId: string): void {
        db.prepare(
            `UPDATE schema_migration_lock
             SET locked = 0, locked_at = NULL, locked_by = NULL
             WHERE id = 1 AND locked_by = ?`,
        ).run(lockId);
    }

    private async runPostgres(
        pool: pg.Pool,
        profile: 'self-hosted' | 'hosted',
        lockId: string,
        release?: string,
    ): Promise<MigrationRunResult> {
        const client = await pool.connect();
        try {
            // 1. Ensure tables exist
            await client.query(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    release TEXT
                );

                CREATE TABLE IF NOT EXISTS schema_migration_lock (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    locked BOOLEAN NOT NULL DEFAULT FALSE,
                    locked_at TIMESTAMP WITH TIME ZONE,
                    locked_by TEXT
                );

                INSERT INTO schema_migration_lock (id, locked)
                VALUES (1, FALSE)
                ON CONFLICT (id) DO NOTHING;
            `);

            // 2. Advisory lock
            const lockResult = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [
                POSTGRES_ADVISORY_LOCK_ID,
            ]);
            if (!lockResult.rows[0]?.acquired) {
                throw new MigrationLockError();
            }

            await client.query(
                `UPDATE schema_migration_lock
                 SET locked = TRUE, locked_at = CURRENT_TIMESTAMP, locked_by = $1
                 WHERE id = 1`,
                [lockId],
            );

            try {
                // 3. Fetch applied
                const res = await client.query(
                    'SELECT version, name, checksum, applied_at AS "appliedAt", release FROM schema_migrations ORDER BY version ASC',
                );

                const appliedMap = new Map<number, AppliedMigration>();
                for (const row of res.rows) {
                    appliedMap.set(row.version, {
                        version: row.version,
                        name: row.name,
                        checksum: row.checksum,
                        appliedAt: new Date(row.appliedAt),
                        release: row.release,
                    });
                }

                // 4. Verify checksums
                for (const [version, applied] of appliedMap.entries()) {
                    const target = this.registered.find((m) => m.version === version);
                    if (target && target.checksum !== applied.checksum) {
                        throw new MigrationChecksumMismatchError(
                            target.version,
                            target.name,
                            target.checksum,
                            applied.checksum,
                        );
                    }
                }

                // 5. Determine pending
                const pending = this.registered
                    .filter((m) => !appliedMap.has(m.version))
                    .sort((a, b) => a.version - b.version);

                // 6. Fail closed in hosted profile
                if (profile === 'hosted') {
                    if (pending.length > 0) {
                        throw new PendingMigrationsError(pending);
                    }
                    logger.info(
                        `[migrations] Schema verified. All ${this.registered.length} migrations verified in hosted mode.`,
                    );
                    return {
                        applied: [],
                        verifiedCount: appliedMap.size,
                        pendingCount: 0,
                    };
                }

                // 7. Apply pending
                const appliedNow: Migration[] = [];
                const ctx: MigrationContext = {
                    dialect: 'postgres',
                    postgres: client,
                };

                for (const migration of pending) {
                    logger.info(
                        `[migrations] Applying migration ${migration.version}: ${migration.name}`,
                    );

                    await client.query('BEGIN');
                    try {
                        await migration.up(ctx);

                        await client.query(
                            `INSERT INTO schema_migrations (version, name, checksum, applied_at, release)
                             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
                            [
                                migration.version,
                                migration.name,
                                migration.checksum,
                                release || null,
                            ],
                        );

                        await client.query('COMMIT');
                        appliedNow.push(migration);
                        logger.info(
                            `[migrations] Successfully applied migration ${migration.version}: ${migration.name}`,
                        );
                    } catch (err) {
                        await client.query('ROLLBACK');
                        logger.error(
                            `[migrations] Migration ${migration.version} failed: ${err instanceof Error ? err.message : String(err)}`,
                        );
                        throw err;
                    }
                }

                return {
                    applied: appliedNow,
                    verifiedCount: appliedMap.size,
                    pendingCount: pending.length,
                };
            } finally {
                await client.query(
                    `UPDATE schema_migration_lock
                     SET locked = FALSE, locked_at = NULL, locked_by = NULL
                     WHERE id = 1 AND locked_by = $1`,
                    [lockId],
                );
                await client.query('SELECT pg_advisory_unlock($1)', [POSTGRES_ADVISORY_LOCK_ID]);
            }
        } finally {
            client.release();
        }
    }
}

export const migrationRunner = new MigrationRunner();

export async function runMigrations(options: MigrationRunOptions): Promise<MigrationRunResult> {
    return migrationRunner.run(options);
}
