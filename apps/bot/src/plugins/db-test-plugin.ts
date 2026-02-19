import { Plugin, PluginContext } from '@jasper/types';

import logger from '../core/logger.js';

const DbTestPlugin: Plugin = {
    name: 'DB Test Plugin',
    version: '1.0.0',
    description: 'Verifies database access for plugins.',

    onLoad: async (context: PluginContext) => {
        logger.info('[DbTestPlugin] Loaded!');

        // 1. Test Write to Plugin Storage
        const now = new Date().toISOString();
        await context.db.plugin.set('last_run', { timestamp: now });
        logger.info(`[DbTestPlugin] Wrote 'last_run' to storage: ${now}`);

        // 2. Test Read from Plugin Storage
        const stored = await context.db.plugin.get('last_run');
        logger.info(`[DbTestPlugin] Read 'last_run' from storage: ${JSON.stringify(stored)}`);

        // 3. Test Read from Core Data
        const topSongs = await context.db.core.getTopSongs(1);
        if (topSongs.length > 0) {
            logger.info(
                `[DbTestPlugin] Top Song: ${topSongs[0].songTitle} (${topSongs[0].playCount} plays)`,
            );
        } else {
            logger.info('[DbTestPlugin] No top songs found (DB might be empty).');
        }
    },

    onUnload: async (_context: PluginContext) => {
        logger.info('[DbTestPlugin] Unloaded!');
    },
};

export default DbTestPlugin;
