import { CommandPublishStrategy } from '@jasper/types';
import fs from 'node:fs';

import { DISCORD_CLIENT_ID, DISCORD_TOKEN, GUILD_ID, getRuntimeProfile } from './config/env.js';
import { publishCommands } from './core/command-publisher.js';
import logger from './core/logger.js';

interface CliArgs {
    strategy?: CommandPublishStrategy;
    guildId?: string;
    applicationId?: string;
    token?: string;
    environment?: string;
    outPath?: string;
    allowTestPlugins?: boolean;
    enabledPlugins?: string[];
    disabledPlugins?: string[];
}

function parseCliArgs(argv: string[]): CliArgs {
    const args: CliArgs = {};
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--strategy' || arg === '-s') {
            args.strategy = argv[++i] as CommandPublishStrategy;
        } else if (arg === '--guild' || arg === '-g') {
            args.guildId = argv[++i];
        } else if (arg === '--client-id' || arg === '-c') {
            args.applicationId = argv[++i];
        } else if (arg === '--token' || arg === '-t') {
            args.token = argv[++i];
        } else if (arg === '--env' || arg === '-e') {
            args.environment = argv[++i];
        } else if (arg === '--out' || arg === '-o') {
            args.outPath = argv[++i];
        } else if (arg === '--allow-test-plugins') {
            args.allowTestPlugins = true;
        } else if (arg === '--enabled-plugins') {
            const list = argv[++i];
            args.enabledPlugins = list
                ? list
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];
        } else if (arg === '--disabled-plugins') {
            const list = argv[++i];
            args.disabledPlugins = list
                ? list
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];
        }
    }
    return args;
}

const cliArgs = parseCliArgs(process.argv);

const runtimeProfile = getRuntimeProfile();

// Strategy resolution priority:
// 1. Explicit CLI argument (--strategy)
// 2. Environment variable (COMMAND_DEPLOY_STRATEGY or DEPLOY_STRATEGY)
// 3. Runtime profile default: 'global' for hosted, 'guild' if GUILD_ID is provided, else 'dry-run'
const strategy: CommandPublishStrategy =
    cliArgs.strategy ||
    (process.env.COMMAND_DEPLOY_STRATEGY as CommandPublishStrategy) ||
    (process.env.DEPLOY_STRATEGY as CommandPublishStrategy) ||
    (runtimeProfile === 'hosted' ? 'global' : GUILD_ID ? 'guild' : 'dry-run');

const applicationId = cliArgs.applicationId || DISCORD_CLIENT_ID;
const token = cliArgs.token || DISCORD_TOKEN;
const guildId = cliArgs.guildId || GUILD_ID;
const environment = cliArgs.environment || process.env.NODE_ENV || runtimeProfile || 'development';
const filterTestPlugins =
    !cliArgs.allowTestPlugins && (environment === 'production' || runtimeProfile === 'hosted');

(async () => {
    try {
        logger.info(
            `[deploy-commands] Initializing command publisher (strategy: "${strategy}", profile: "${runtimeProfile}")...`,
        );

        const result = await publishCommands({
            strategy,
            applicationId,
            token,
            guildId,
            environment,
            filterTestPlugins,
            enabledPlugins: cliArgs.enabledPlugins,
            disabledPlugins: cliArgs.disabledPlugins,
        });

        logger.info('========================================================');
        logger.info(`[deploy-commands] Command Manifest Published Successfully`);
        logger.info(`  • Strategy:        ${result.strategy}`);
        logger.info(`  • Target:          ${result.target}`);
        logger.info(`  • Deployed:        ${result.deployedCount} command(s)`);
        logger.info(`  • Payload Digest:  ${result.manifest.digest}`);
        logger.info(
            `  • Commands:        ${result.manifest.commands.map((c) => '/' + c.name).join(', ')}`,
        );
        logger.info('========================================================');

        if (cliArgs.outPath) {
            await fs.promises.writeFile(
                cliArgs.outPath,
                JSON.stringify(result.manifest, null, 2),
                'utf8',
            );
            logger.info(`[deploy-commands] Manifest written to ${cliArgs.outPath}`);
        }

        process.exit(0);
    } catch (error) {
        logger.error(
            `[deploy-commands] Publication failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
    }
})();
