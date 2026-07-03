// Import env.ts first to ensure environment variables are loaded
import {
    Collection,
    REST,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

import { server, startServer } from './api/server.js';
import { DISCORD_CLIENT_ID, DISCORD_TOKEN, GUILD_ID, validateBotConfig } from './config/env.js';
import { sendAnnouncement } from './core/announcer.js';
import { initializeCache, startCacheCleanup } from './core/cache-manager.js';
import { handleGracefulExit } from './core/graceful-exit.js';
import logger from './core/logger.js';
import pluginManager from './core/plugins/plugin-manager.js';
import workerPool from './core/worker-pool.js';
import { Command } from './types/command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables early
validateBotConfig();

// Register process signal handlers immediately
process.on('SIGINT', () => handleGracefulExit('SIGINT'));
process.on('SIGTERM', () => handleGracefulExit('SIGTERM'));

// Global error handlers
process.on('uncaughtException', (error) => {
    logger.error(
        `[core] Uncaught Exception: ${error instanceof Error ? error.stack : String(error)}`,
    );
    handleGracefulExit(
        'uncaughtException',
        error instanceof Error ? error : new Error(String(error)),
    );
});

process.on('unhandledRejection', (reason, promise) => {
    const errorMsg = reason instanceof Error ? reason.stack || reason.message : String(reason);
    logger.error(`[core] Unhandled Rejection at: ${promise}, reason: ${errorMsg}`);
    // We don't exit on unhandledRejection to keep the bot running,
    // but we log it. If it's critical, uncaughtException might eventually trigger.
});

(async () => {
    // 1. Create all bot clients
    workerPool.createBots();

    // 2. Get Controller (Jasper)
    const controllerWorker = workerPool.getController();
    if (!controllerWorker) {
        logger.error('[core] No controller bot found! Check configuration.');
        process.exit(1);
    }
    const client = controllerWorker.client;

    // 3. Setup Controller (Commands & Events)
    client.commands = new Collection();

    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    // Support both .js (production) and .ts (development), but exclude .d.ts
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(
            (file) => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts'),
        );

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(filePath);
        const command = commandModule.default;
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.info(`[core] Loaded command /${command.data.name}`);
        } else {
            logger.warn(
                `[core] The command at ${filePath} is missing a required "data" or "execute" property.`,
            );
        }
    }

    // 4. Login all bots
    await workerPool.loginBots();

    // 5. Initialize cache system (if enabled)
    await initializeCache();
    startCacheCleanup();

    // 6. Startup Announcement
    await sendAnnouncement(
        '✅ **Jasper System Online**\nReady to serve the Heavenly Council of Fur.',
    );

    // 7. Load Plugins (Must be before server starts)
    pluginManager.init(client, server);
    await pluginManager.loadPlugins();

    // 7.5 Deploy Commands (Implicit Loading)
    if (DISCORD_CLIENT_ID && GUILD_ID) {
        try {
            logger.info('[core] Deploying commands to Discord...');
            const commandsData = client.commands.map((cmd: Command) => {
                // Handle both Builders (toJSON) and plain objects
                return typeof cmd.data.toJSON === 'function'
                    ? cmd.data.toJSON()
                    : (cmd.data as unknown as RESTPostAPIChatInputApplicationCommandsJSONBody);
            });

            const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

            await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, GUILD_ID), {
                body: commandsData,
            });
            logger.info(`[core] Successfully deployed ${commandsData.length} commands.`);
        } catch (error) {
            logger.error(`[core] Failed to deploy commands: ${error}`);
        }
    } else {
        logger.warn('[core] Skipping command deployment: DISCORD_CLIENT_ID or GUILD_ID missing.');
    }

    // 8. Start Web UI Server
    await startServer();
})();
