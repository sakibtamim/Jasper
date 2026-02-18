import { Plugin, PluginContext } from '@jasper/types';

const DbTestPlugin: Plugin = {
    name: 'DB Test Plugin',
    version: '1.0.0',
    description: 'Verifies database access for plugins.',

    onLoad: async (context: PluginContext) => {
        context.logger.info('Loaded!');

        // 1. Test Write to Plugin Storage
        const now = new Date().toISOString();
        await context.db.plugin.set('last_run', { timestamp: now });
        context.logger.info(`Wrote 'last_run' to storage: ${now}`);

        // 2. Test Read from Plugin Storage
        const stored = await context.db.plugin.get('last_run');
        context.logger.info(`Read 'last_run' from storage: ${JSON.stringify(stored)}`);

        // 3. Test Read from Core Data
        const topSongs = await context.db.core.getTopSongs(1);
        if (topSongs.length > 0) {
            context.logger.info(
                `Top Song: ${topSongs[0].songTitle} (${topSongs[0].playCount} plays)`,
            );
        } else {
            context.logger.info('No top songs found (DB might be empty).');
        }
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info('Unloaded!');
    },
};

export default DbTestPlugin;
