import { DB_TYPE, SQLITE_PATH, validatePostgresConfig } from '../../config/env.js';
import logger from '../logger.js';
import { PostgresAdapter } from './postgres-adapter.js';
import { SqliteAdapter } from './sqlite-adapter.js';
import { DatabaseAdapter } from './types.js';

let db: DatabaseAdapter;

if (DB_TYPE === 'postgres') {
    validatePostgresConfig();
    db = new PostgresAdapter();
} else {
    // Default to SQLite
    db = new SqliteAdapter(SQLITE_PATH);
}

// Initialize DB unless explicitly skipped (e.g. during release-time command publishing)
if (process.env.SKIP_DB_INIT !== 'true') {
    try {
        await db.init();
    } catch (err) {
        logger.error(`[db] Failed to initialize database: ${err}`);
        throw err;
    }
}

export function getDatabase(): DatabaseAdapter {
    return db;
}

export default db;
export * from './types.js';
export * from './migrations/index.js';
