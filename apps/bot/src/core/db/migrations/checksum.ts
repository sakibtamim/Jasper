import crypto from 'crypto';

/**
 * Computes a deterministic SHA-256 checksum for a migration
 * based on its name and SQL definitions.
 */
export function calculateChecksum(name: string, sqliteSql: string, postgresSql: string): string {
    const canonical = `${name}\n---SQLITE---\n${sqliteSql.trim()}\n---POSTGRES---\n${postgresSql.trim()}`;
    return crypto.createHash('sha256').update(canonical).digest('hex');
}
