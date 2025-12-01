import inquirer from 'inquirer';
import db from '../src/core/db/index.js';
import { getPluginStatuses } from './plugin-utils.js';

async function disablePlugin() {
    try {
        await db.init();
        const plugins = await getPluginStatuses();
        const enabledPlugins = plugins
            .filter(p => p.enabled)
            .map(p => ({
                name: `${p.name} (${p.id})`,
                value: p.id
            }));

        if (enabledPlugins.length === 0) {
            console.log('No enabled plugins found.');
            return;
        }

        const { pluginId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'pluginId',
                message: 'Select a plugin to disable:',
                choices: enabledPlugins
            }
        ]);

        await db.setPluginEnabled(pluginId, false);
        console.log(`✅ Plugin '${pluginId}' disabled successfully.`);

    } catch (error) {
        console.error('Failed to disable plugin:', error);
    } finally {
        await db.close();
    }
}

disablePlugin();
