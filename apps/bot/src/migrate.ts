process.env.SKIP_DB_INIT = 'true';

const { default: logger } = await import('./core/logger.js');
const { default: db } = await import('./core/db/index.js');

async function main(): Promise<void> {
    logger.info('[migrate] Explicit database migration run initiated...');
    try {
        if (typeof db.init === 'function') {
            await db.init();
        }
        logger.info('[migrate] Database migrations verified and applied successfully.');
        process.exit(0);
    } catch (error) {
        logger.error(`[migrate] Database migration failed: ${error}`);
        process.exit(1);
    }
}

main();
