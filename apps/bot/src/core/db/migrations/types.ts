import type { DatabaseSync } from 'node:sqlite';
import type pg from 'pg';

export interface MigrationContext {
    dialect: 'sqlite' | 'postgres';
    sqlite?: DatabaseSync;
    postgres?: pg.PoolClient;
}

export interface AppliedMigration {
    version: number;
    name: string;
    checksum: string;
    appliedAt: Date;
    release?: string | null;
}

export interface Migration {
    version: number;
    name: string;
    description: string;
    checksum: string;
    sql: {
        sqlite: string;
        postgres: string;
    };
    up: (ctx: MigrationContext) => Promise<void> | void;
}

export interface MigrationRunOptions {
    dialect: 'sqlite' | 'postgres';
    profile?: 'self-hosted' | 'hosted';
    sqliteDb?: DatabaseSync;
    postgresPool?: pg.Pool;
    release?: string;
    dryRun?: boolean;
}

export interface MigrationRunResult {
    applied: Migration[];
    verifiedCount: number;
    pendingCount: number;
}

export class MigrationLockError extends Error {
    constructor(message: string = 'Database migration lock is held by another process') {
        super(message);
        this.name = 'MigrationLockError';
    }
}

export class MigrationChecksumMismatchError extends Error {
    constructor(version: number, name: string, expected: string, actual: string) {
        super(
            `Migration checksum mismatch for version ${version} (${name}). Expected checksum ${expected}, but found recorded checksum ${actual}. Migration contents must not be altered after execution.`,
        );
        this.name = 'MigrationChecksumMismatchError';
    }
}

export class PendingMigrationsError extends Error {
    constructor(pending: Migration[]) {
        super(
            `Automatic runtime DDL is disabled in hosted profile. Database has ${pending.length} pending migration(s): ${pending.map((m) => m.name).join(', ')}. Run migrations via the release migration runner.`,
        );
        this.name = 'PendingMigrationsError';
    }
}
