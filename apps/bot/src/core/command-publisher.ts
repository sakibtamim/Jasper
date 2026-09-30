import { CommandManifest, CommandPublishStrategy, PublishResult } from '@jasper/types';
import {
    ApplicationIntegrationType,
    InteractionContextType,
    PermissionFlagsBits,
    REST,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes,
} from 'discord.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getWorkerTokens } from '../config/env.js';
import { TEST_PLUGINS } from '../config/plugins.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard Discord command name validator: 1-32 lowercase alphanumeric, underscore, hyphen
const COMMAND_NAME_REGEX = /^[a-z0-9_-]{1,32}$/;

// Maximum application commands supported by Discord per application / guild
export const MAX_DISCORD_COMMANDS = 100;

export interface CommandPublisherOptions {
    strategy: CommandPublishStrategy;
    applicationId: string;
    token: string;
    guildId?: string;
    environment?: string;
    releaseVersion?: string;
    callerRole?: 'controller' | 'worker';
    filterTestPlugins?: boolean;
    commandsDir?: string;
    pluginsDir?: string;
    // Injected commands for testing or explicit manifest generation
    customCommands?: unknown[];
    // Injected REST client for mocking/testing Discord API calls
    restClient?: {
        put: (route: `/${string}`, options: { body: unknown }) => Promise<unknown>;
    };
}

export interface DiscoveredCommand {
    name: string;
    data: RESTPostAPIChatInputApplicationCommandsJSONBody;
    source: string;
}

/**
 * Validates that credentials belong to a Discord controller and never a worker.
 * Fails closed if callerRole is 'worker' or if token matches any known worker token.
 */
export function assertControllerCredentials(options: {
    token: string;
    callerRole?: 'controller' | 'worker';
}): void {
    if (!options.token || !options.token.trim()) {
        throw new Error('A valid controller bot token is required for command publication.');
    }

    if (options.callerRole === 'worker') {
        throw new Error(
            'Worker credentials cannot publish application commands. Only controller credentials are permitted.',
        );
    }

    const workerTokens = getWorkerTokens();
    const matchesWorker = workerTokens.some((w) => w.token === options.token);
    if (matchesWorker) {
        throw new Error(
            'Worker credentials cannot publish application commands. Only controller credentials are permitted.',
        );
    }
}

/**
 * Deterministically stringifies an object by recursively sorting its keys.
 * Produces byte-identical canonical JSON output across platforms and environments.
 */
export function canonicalJsonStringify(val: unknown): string {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val);
    }

    if (Array.isArray(val)) {
        return `[${val.map((item) => canonicalJsonStringify(item)).join(',')}]`;
    }

    const record = val as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const parts = sortedKeys
        .filter((k) => record[k] !== undefined)
        .map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(record[k])}`);

    return `{${parts.join(',')}}`;
}

/**
 * Computes a SHA-256 digest of the canonical normalized command list.
 */
export function computeCommandDigest(
    commands: RESTPostAPIChatInputApplicationCommandsJSONBody[],
): string {
    // Sort commands deterministically by name
    const sorted = [...commands].sort((a, b) => a.name.localeCompare(b.name));
    const canonical = canonicalJsonStringify(sorted);
    return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Normalizes a command descriptor:
 * - Validates name syntax and length (1-32 chars, lowercase, regex match)
 * - Validates description (1-100 chars)
 * - Enforces guild-only interaction context (`contexts: [InteractionContextType.Guild]`)
 * - Enforces guild installation (`integration_types: [ApplicationIntegrationType.GuildInstall]`)
 * - Denies DM execution (`dm_permission: false`)
 * - Enforces safe default permissions (e.g. catastrophic-reset requires ManageGuild/Admin)
 */
export function normalizeCommandPayload(
    raw: unknown,
    source: string,
): RESTPostAPIChatInputApplicationCommandsJSONBody {
    let commandObj: Record<string, unknown>;

    if (raw && typeof raw === 'object') {
        if ('toJSON' in raw && typeof (raw as { toJSON: () => unknown }).toJSON === 'function') {
            commandObj = (raw as { toJSON: () => Record<string, unknown> }).toJSON();
        } else if ('data' in raw && raw.data && typeof raw.data === 'object') {
            const inner = raw.data as Record<string, unknown>;
            if (typeof inner.toJSON === 'function') {
                commandObj = (inner as { toJSON: () => Record<string, unknown> }).toJSON();
            } else {
                commandObj = { ...inner };
            }
        } else {
            commandObj = { ...(raw as Record<string, unknown>) };
        }
    } else {
        throw new Error(`Invalid command descriptor from ${source}: expected object`);
    }

    const name = String(commandObj.name || '').trim();
    if (!name || !COMMAND_NAME_REGEX.test(name)) {
        throw new Error(
            `Invalid command name "${name}" from ${source}: must be 1-32 lowercase alphanumeric characters, underscores, or hyphens.`,
        );
    }

    const description = String(commandObj.description || '').trim();
    if (!description || description.length > 100) {
        throw new Error(
            `Invalid command description for "/${name}" from ${source}: must be 1-100 characters.`,
        );
    }

    // Clone and apply safe defaults & guild-only isolation
    const normalized: RESTPostAPIChatInputApplicationCommandsJSONBody = {
        name,
        description,
        // Guild-only interaction context (InteractionContextType.Guild = 0)
        contexts: [InteractionContextType.Guild],
        // Guild installation only (ApplicationIntegrationType.GuildInstall = 0)
        integration_types: [ApplicationIntegrationType.GuildInstall],
        // Defense-in-depth: explicitly deny direct message permissions
        dm_permission: false,
    };

    if (Array.isArray(commandObj.options)) {
        normalized.options =
            commandObj.options as RESTPostAPIChatInputApplicationCommandsJSONBody['options'];
    }

    // Default member permissions handling
    if (commandObj.default_member_permissions !== undefined) {
        normalized.default_member_permissions = commandObj.default_member_permissions as
            | string
            | null;
    } else if (name === 'catastrophic-reset') {
        // Enforce safe administrator/management default for catastrophic-reset
        normalized.default_member_permissions = PermissionFlagsBits.ManageGuild.toString();
    }

    if (commandObj.nsfw !== undefined) {
        normalized.nsfw = Boolean(commandObj.nsfw);
    }

    return normalized;
}

/**
 * Pure discovery of core slash commands from the commands directory.
 * Does not execute command handlers or connect to Discord/database.
 */
export async function collectCoreCommandDescriptors(
    commandsDir?: string,
): Promise<DiscoveredCommand[]> {
    const targetDir = commandsDir ?? path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(targetDir)) {
        return [];
    }

    const files = (await fs.promises.readdir(targetDir)).filter(
        (file) =>
            (file.endsWith('.js') || file.endsWith('.ts')) &&
            !file.endsWith('.d.ts') &&
            !file.includes('.test.') &&
            !file.includes('.spec.'),
    );

    const discovered: DiscoveredCommand[] = [];

    const prevSkipDb = process.env.SKIP_DB_INIT;
    process.env.SKIP_DB_INIT = 'true';

    try {
        for (const file of files) {
            const filePath = path.join(targetDir, file);
            const module = await import(pathToFileURL(filePath).href);
            const commandExport = module.default ?? module.command;

            if (commandExport && ('data' in commandExport || 'name' in commandExport)) {
                const rawData = commandExport.data ?? commandExport;
                const normalized = normalizeCommandPayload(rawData, `core:${file}`);
                discovered.push({
                    name: normalized.name,
                    data: normalized,
                    source: `core:${file}`,
                });
            }
        }
    } finally {
        if (prevSkipDb === undefined) {
            delete process.env.SKIP_DB_INIT;
        } else {
            process.env.SKIP_DB_INIT = prevSkipDb;
        }
    }

    return discovered;
}

/**
 * Pure discovery of plugin slash commands from the plugins directory.
 * CRITICAL: NEVER executes plugin `onLoad`, database initialization, network calls,
 * route registrations, or hook handlers during discovery.
 */
export async function collectPluginCommandDescriptors(
    pluginsDir?: string,
    options?: { filterTestPlugins?: boolean; environment?: string },
): Promise<DiscoveredCommand[]> {
    const targetDir = pluginsDir ?? path.join(__dirname, '..', 'plugins');
    if (!fs.existsSync(targetDir)) {
        return [];
    }

    const shouldFilterTestPlugins =
        options?.filterTestPlugins ??
        (options?.environment === 'production' || options?.environment === 'hosted');

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    const discovered: DiscoveredCommand[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginId = entry.name;

        // Skip test plugins when publishing for production/hosted releases
        if (shouldFilterTestPlugins && TEST_PLUGINS.includes(pluginId)) {
            logger.debug(`[publisher] Skipping test plugin "${pluginId}" from release manifest`);
            continue;
        }

        const pluginFolder = path.join(targetDir, pluginId);

        // Check for manifest
        const manifestPath = path.join(pluginFolder, 'jasper-plugin.json');
        let entryFile = 'index.ts';

        if (fs.existsSync(manifestPath)) {
            try {
                const manifestContent = JSON.parse(
                    await fs.promises.readFile(manifestPath, 'utf8'),
                );
                if (shouldFilterTestPlugins && manifestContent.testOnly) {
                    continue;
                }
                if (manifestContent.entry) {
                    entryFile = manifestContent.entry;
                }
            } catch {
                // If manifest is unreadable, proceed with default entry
            }
        }

        let entryPath = path.join(pluginFolder, entryFile);
        if (!fs.existsSync(entryPath)) {
            // Check fallback between .ts and .js
            const altExt = entryFile.endsWith('.ts') ? '.js' : '.ts';
            const altPath = path.join(pluginFolder, entryFile.replace(/\.(ts|js)$/, altExt));
            if (fs.existsSync(altPath)) {
                entryPath = altPath;
            } else {
                continue;
            }
        }

        const prevSkipDb = process.env.SKIP_DB_INIT;
        process.env.SKIP_DB_INIT = 'true';

        try {
            // Pure module import — inspects exports and descriptors WITHOUT executing onLoad()
            const pluginModule = await import(pathToFileURL(entryPath).href);
            const plugin = pluginModule.default ?? pluginModule;

            // Check for pure commands array on plugin export or module export
            const commandsList =
                plugin?.commands ?? pluginModule.commands ?? plugin?.commandDescriptors;

            if (Array.isArray(commandsList)) {
                for (const cmd of commandsList) {
                    const normalized = normalizeCommandPayload(cmd, `plugin:${pluginId}`);
                    discovered.push({
                        name: normalized.name,
                        data: normalized,
                        source: `plugin:${pluginId}`,
                    });
                }
            }
        } catch (error) {
            logger.warn(
                `[publisher] Unable to statically inspect plugin "${pluginId}" descriptors: ${error}`,
            );
        } finally {
            if (prevSkipDb === undefined) {
                delete process.env.SKIP_DB_INIT;
            } else {
                process.env.SKIP_DB_INIT = prevSkipDb;
            }
        }
    }

    return discovered;
}

/**
 * Generates a typed command manifest and SHA-256 payload digest.
 */
export async function generateCommandManifest(
    options: Omit<CommandPublisherOptions, 'token'>,
): Promise<CommandManifest> {
    const environment = options.environment ?? process.env.NODE_ENV ?? 'development';
    const releaseVersion = options.releaseVersion ?? process.env.RELEASE_VERSION ?? '1.0.0';

    let allDiscovered: DiscoveredCommand[] = [];

    if (options.customCommands && options.customCommands.length > 0) {
        allDiscovered = options.customCommands.map((raw, idx) => {
            const normalized = normalizeCommandPayload(raw, `custom[${idx}]`);
            return {
                name: normalized.name,
                data: normalized,
                source: `custom[${idx}]`,
            };
        });
    } else {
        const [coreCommands, pluginCommands] = await Promise.all([
            collectCoreCommandDescriptors(options.commandsDir),
            collectPluginCommandDescriptors(options.pluginsDir, {
                filterTestPlugins: options.filterTestPlugins,
                environment,
            }),
        ]);
        allDiscovered = [...coreCommands, ...pluginCommands];
    }

    // Check for collisions across all discovered commands
    const seenNames = new Map<string, string>();
    for (const item of allDiscovered) {
        if (seenNames.has(item.name)) {
            throw new Error(
                `Command name collision detected for "/${item.name}" between "${seenNames.get(item.name)}" and "${item.source}".`,
            );
        }
        seenNames.set(item.name, item.source);
    }

    // Check maximum command limit
    if (allDiscovered.length > MAX_DISCORD_COMMANDS) {
        throw new Error(
            `Maximum Discord application command limit exceeded: ${allDiscovered.length} > ${MAX_DISCORD_COMMANDS}`,
        );
    }

    // Sort commands deterministically by name
    const normalizedCommands = allDiscovered
        .map((item) => item.data)
        .sort((a, b) => a.name.localeCompare(b.name));

    const digest = computeCommandDigest(normalizedCommands);

    return {
        schemaVersion: '1.0.0',
        environment,
        releaseVersion,
        generatedAt: new Date().toISOString(),
        strategy: options.strategy,
        applicationId: options.applicationId,
        guildId: options.guildId,
        digest,
        commandCount: normalizedCommands.length,
        commands: normalizedCommands,
    };
}

/**
 * Publishes application commands to Discord according to the selected strategy.
 * Supported strategies:
 * - 'dry-run': Validates manifest, computes digest, and tests limits without mutating Discord.
 * - 'guild': Sandbox / development, deploys to a specific guild immediately.
 * - 'global': Release deployment, deploys globally across the controller application.
 */
export async function publishCommands(options: CommandPublisherOptions): Promise<PublishResult> {
    assertControllerCredentials({
        token: options.token,
        callerRole: options.callerRole,
    });

    if (!options.applicationId || !options.applicationId.trim()) {
        throw new Error('applicationId (DISCORD_CLIENT_ID) is required for command publication.');
    }

    const manifest = await generateCommandManifest(options);

    logger.info(
        `[publisher] Generated manifest with ${manifest.commandCount} commands (digest: ${manifest.digest}) for strategy "${options.strategy}"`,
    );

    if (options.strategy === 'dry-run') {
        return {
            success: true,
            manifest,
            deployedCount: manifest.commandCount,
            strategy: 'dry-run',
            target: 'dry-run',
        };
    }

    const rest = options.restClient ?? new REST({ version: '10' }).setToken(options.token);

    if (options.strategy === 'guild') {
        if (!options.guildId || !options.guildId.trim()) {
            throw new Error(
                'guildId (GUILD_ID) is required when using the "guild" publishing strategy.',
            );
        }

        const route = Routes.applicationGuildCommands(options.applicationId, options.guildId);
        const response = (await rest.put(route, {
            body: manifest.commands,
        })) as unknown[];

        const deployedCount = Array.isArray(response) ? response.length : manifest.commandCount;
        logger.info(
            `[publisher] Successfully deployed ${deployedCount} guild commands to guild "${options.guildId}".`,
        );

        return {
            success: true,
            manifest,
            deployedCount,
            strategy: 'guild',
            target: `guild:${options.guildId}`,
        };
    }

    if (options.strategy === 'global') {
        const route = Routes.applicationCommands(options.applicationId);
        const response = (await rest.put(route, {
            body: manifest.commands,
        })) as unknown[];

        const deployedCount = Array.isArray(response) ? response.length : manifest.commandCount;
        logger.info(
            `[publisher] Successfully deployed ${deployedCount} global application commands.`,
        );

        return {
            success: true,
            manifest,
            deployedCount,
            strategy: 'global',
            target: 'global',
        };
    }

    throw new Error(
        `Unsupported publishing strategy: "${(options as { strategy: string }).strategy}"`,
    );
}
