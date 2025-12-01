import inquirer from 'inquirer';
import db from '../src/core/db/index.js';
import { getPluginStatuses } from './plugin-utils.js';

async function enablePlugin() {
    try {
        await db.init();
        const plugins = await getPluginStatuses();
        const disabledPlugins = plugins
            .filter(p => !p.enabled)
            .map(p => ({
                name: `${p.name} (${p.id})`,
                value: p.id
            }));

        if (disabledPlugins.length === 0) {
            console.log('No disabled plugins found.');
            return;
        }

        const { pluginId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'pluginId',
                message: 'Select a plugin to enable:',
                choices: disabledPlugins
            }
        ]);

        await db.setPluginEnabled(pluginId, true);
        console.log(`✅ Plugin '${pluginId}' enabled successfully.`);

    } catch (error) {
        console.error('Failed to enable plugin:', error);
    } finally {
        await db.close();
    }
}

enablePlugin();
