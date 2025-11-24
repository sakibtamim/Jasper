import { DatabaseAdapter } from './types.js';
import { SqliteAdapter } from './sqlite-adapter.js';
import { PostgresAdapter } from './postgres-adapter.js';
import logger from '../logger.js';

let db: DatabaseAdapter;

if (process.env.DB_TYPE === 'postgres') {
    db = new PostgresAdapter();
} else {
    // Default to SQLite
    db = new SqliteAdapter();
}

// Initialize DB
try {
    await db.init();
} catch (err) {
    logger.error(`[db] Failed to initialize database: ${err}`);
    throw err;
}

export function getDatabase(): DatabaseAdapter {
    return db;
}

export default db;
export * from './types.js';
