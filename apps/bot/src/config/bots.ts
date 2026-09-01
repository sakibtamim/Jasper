import { BotIdentityConfig } from '@jasper/types';

import { DISCORD_TOKEN, getWorkerTokens } from './env.js';

export type BotConfig = BotIdentityConfig;

/**
 * Builds the bot configuration catalog for controller and worker instances.
 */
export function getBotConfigs(): BotConfig[] {
    const configs: BotConfig[] = [];

    // Controller (Jasper) is required if DISCORD_TOKEN is set
    if (DISCORD_TOKEN) {
        configs.push({
            name: 'Jasper',
            token: DISCORD_TOKEN,
            role: 'controller',
        });
    }

    // Load worker bots dynamically from verified worker tokens
    const workerTokens = getWorkerTokens();
    for (const worker of workerTokens) {
        configs.push({
            name: worker.name,
            token: worker.token,
            role: 'worker',
        });
    }

    return configs;
}

const bots: BotConfig[] = getBotConfigs();
export default bots;
