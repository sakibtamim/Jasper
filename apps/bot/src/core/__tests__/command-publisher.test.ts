import {
    ApplicationIntegrationType,
    InteractionContextType,
    PermissionFlagsBits,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes,
} from 'discord.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as envModule from '../../config/env.js';
import {
    assertControllerCredentials,
    canonicalJsonStringify,
    collectCoreCommandDescriptors,
    collectPluginCommandDescriptors,
    compareCommandNames,
    computeCommandDigest,
    generateCommandManifest,
    normalizeCommandPayload,
    publishCommands,
} from '../command-publisher.js';

describe('Command Publisher & Manifest Generator (HJ-OSS-06)', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'jasper-pub-test-'));
    });

    afterEach(async () => {
        if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
        vi.restoreAllMocks();
    });

    describe('Controller vs Worker Credential Assertion', () => {
        it('should permit controller credentials', () => {
            expect(() =>
                assertControllerCredentials({
                    token: 'controller-valid-token-123',
                    callerRole: 'controller',
                }),
            ).not.toThrow();
        });

        it('should reject worker caller role', () => {
            expect(() =>
                assertControllerCredentials({
                    token: 'some-token',
                    callerRole: 'worker',
                }),
            ).toThrow(/Worker credentials cannot publish application commands/);
        });

        it('should reject token matching a known worker token', () => {
            vi.spyOn(envModule, 'getWorkerTokens').mockReturnValue([
                { name: 'Worker Alpha', token: 'worker-token-xyz' },
            ]);

            expect(() =>
                assertControllerCredentials({
                    token: 'worker-token-xyz',
                }),
            ).toThrow(/Worker credentials cannot publish application commands/);
        });

        it('should reject empty or missing token', () => {
            expect(() =>
                assertControllerCredentials({
                    token: '',
                }),
            ).toThrow(/controller bot token is required/);
        });
    });

    describe('Command Payload Normalization & Isolation', () => {
        it('should normalize commands to guild-only contexts and deny DMs', () => {
            const raw = {
                name: 'custom-play',
                description: 'Play a custom track',
                options: [
                    {
                        name: 'query',
                        description: 'Search terms',
                        type: 3,
                        required: true,
                    },
                ],
            };

            const normalized = normalizeCommandPayload(raw, 'test');

            expect(normalized.name).toBe('custom-play');
            expect(normalized.description).toBe('Play a custom track');
            // Must declare Guild-only context
            expect(normalized.contexts).toEqual([InteractionContextType.Guild]);
            // Must declare GuildInstall integration type
            expect(normalized.integration_types).toEqual([ApplicationIntegrationType.GuildInstall]);
            // Must explicitly deny DM execution
            expect(normalized.dm_permission).toBe(false);
            expect(normalized.options).toHaveLength(1);
        });

        it('should assign safe default permissions for catastrophic-reset', () => {
            const raw = {
                name: 'catastrophic-reset',
                description: 'Emergency reset',
            };

            const normalized = normalizeCommandPayload(raw, 'test');
            expect(normalized.default_member_permissions).toBe(
                PermissionFlagsBits.ManageGuild.toString(),
            );
        });

        it('should reject invalid command names or descriptions', () => {
            expect(() =>
                normalizeCommandPayload(
                    { name: 'Invalid Name With Spaces', description: 'desc' },
                    'test',
                ),
            ).toThrow(/Invalid command name/);

            expect(() =>
                normalizeCommandPayload({ name: 'a'.repeat(33), description: 'desc' }, 'test'),
            ).toThrow(/Invalid command name/);

            expect(() =>
                normalizeCommandPayload({ name: 'valid-name', description: '' }, 'test'),
            ).toThrow(/Invalid command description/);

            expect(() =>
                normalizeCommandPayload(
                    { name: 'valid-name', description: 'a'.repeat(101) },
                    'test',
                ),
            ).toThrow(/Invalid command description/);
        });
    });

    describe('Canonical Digest & Determinism', () => {
        it('should compute identical digests regardless of object key order', () => {
            const cmdA = {
                name: 'play',
                description: 'Play music',
                options: [],
                dm_permission: false,
            };

            const cmdB = {
                description: 'Play music',
                dm_permission: false,
                name: 'play',
                options: [],
            };

            expect(canonicalJsonStringify(cmdA)).toBe(canonicalJsonStringify(cmdB));
            expect(
                computeCommandDigest([cmdA as RESTPostAPIChatInputApplicationCommandsJSONBody]),
            ).toBe(computeCommandDigest([cmdB as RESTPostAPIChatInputApplicationCommandsJSONBody]));
        });

        it('should compute identical digests regardless of command array order', () => {
            const cmd1 = {
                name: 'autoplay',
                description: 'Toggle autoplay',
            } as RESTPostAPIChatInputApplicationCommandsJSONBody;
            const cmd2 = {
                name: 'skip',
                description: 'Skip song',
            } as RESTPostAPIChatInputApplicationCommandsJSONBody;

            const digest1 = computeCommandDigest([cmd1, cmd2]);
            const digest2 = computeCommandDigest([cmd2, cmd1]);

            expect(digest1).toBe(digest2);
        });
    });

    describe('Expand-Contract Evolution & Idempotence', () => {
        it('should produce distinct digests when adding or changing commands', () => {
            const baseline: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
                { name: 'play', description: 'Play music' },
                { name: 'stop', description: 'Stop music' },
            ];

            const expanded: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
                ...baseline,
                { name: 'seek', description: 'Seek to position' },
            ];

            const contracted: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
                { name: 'play', description: 'Play music' },
            ];

            const digestBaseline = computeCommandDigest(baseline);
            const digestExpanded = computeCommandDigest(expanded);
            const digestContracted = computeCommandDigest(contracted);

            expect(digestBaseline).not.toBe(digestExpanded);
            expect(digestBaseline).not.toBe(digestContracted);
            expect(digestExpanded).not.toBe(digestContracted);

            // Re-evaluating baseline produces exact same digest (Idempotence)
            expect(computeCommandDigest(baseline)).toBe(digestBaseline);
        });

        it('should fail closed when command name collision occurs', async () => {
            const commands = [
                { name: 'play', description: 'Play track 1' },
                { name: 'play', description: 'Play track 2' },
            ];

            await expect(
                generateCommandManifest({
                    strategy: 'dry-run',
                    applicationId: 'app-123',
                    customCommands: commands,
                }),
            ).rejects.toThrow(/Command name collision detected for "\/play"/);
        });

        it('should reject manifest generation if command count exceeds 100', async () => {
            const commands = Array.from({ length: 101 }, (_, i) => ({
                name: `cmd-${i}`,
                description: `Command ${i}`,
            }));

            await expect(
                generateCommandManifest({
                    strategy: 'dry-run',
                    applicationId: 'app-123',
                    customCommands: commands,
                }),
            ).rejects.toThrow(/Maximum Discord application command limit exceeded/);
        });
    });

    describe('Pure Descriptors & Plugin Isolation', () => {
        it('should read plugin command descriptors without executing onLoad or side effects', async () => {
            const pluginDir = path.join(tempDir, 'plugins', 'sample-plugin');
            await fs.promises.mkdir(pluginDir, { recursive: true });

            // Create a fake plugin that throws if onLoad is called
            const pluginCode = `
                export default {
                    name: 'sample-plugin',
                    version: '1.0.0',
                    commands: [
                        {
                            data: {
                                name: 'sample-cmd',
                                description: 'A pure command description',
                            },
                        },
                    ],
                    onLoad: () => {
                        throw new Error('SIDE EFFECT: onLoad was called!');
                    },
                };
            `;
            await fs.promises.writeFile(path.join(pluginDir, 'index.js'), pluginCode, 'utf8');

            const discovered = await collectPluginCommandDescriptors(
                path.join(tempDir, 'plugins'),
                { filterTestPlugins: false },
            );

            expect(discovered).toHaveLength(1);
            expect(discovered[0].name).toBe('sample-cmd');
            expect(discovered[0].data.description).toBe('A pure command description');
        });

        it('should exclude test plugins when filterTestPlugins is active', async () => {
            const pluginsRoot = path.join(tempDir, 'plugins');
            // Create a test plugin directory
            const testPluginDir = path.join(pluginsRoot, 'db-test-plugin');
            await fs.promises.mkdir(testPluginDir, { recursive: true });
            await fs.promises.writeFile(
                path.join(testPluginDir, 'index.js'),
                `export default { name: 'db-test-plugin', commands: [{ data: { name: 'db-test', description: 'test' } }] };`,
            );

            // Create a production plugin directory
            const prodPluginDir = path.join(pluginsRoot, 'production-plugin');
            await fs.promises.mkdir(prodPluginDir, { recursive: true });
            await fs.promises.writeFile(
                path.join(prodPluginDir, 'index.js'),
                `export default { name: 'production-plugin', commands: [{ data: { name: 'prod-cmd', description: 'prod' } }] };`,
            );

            // Filter test plugins (as in production release)
            const filtered = await collectPluginCommandDescriptors(pluginsRoot, {
                filterTestPlugins: true,
                environment: 'production',
            });

            expect(filtered).toHaveLength(1);
            expect(filtered[0].name).toBe('prod-cmd');
        });
    });

    describe('Publishing Strategies', () => {
        const sampleCommands = [
            { name: 'play', description: 'Play music' },
            { name: 'pause', description: 'Pause music' },
        ];

        it('should perform dry-run without invoking Discord REST API', async () => {
            const putSpy = vi.fn();
            const restClient = { put: putSpy };

            const result = await publishCommands({
                strategy: 'dry-run',
                applicationId: 'app-test-id',
                token: 'mock-controller-token',
                customCommands: sampleCommands,
                restClient,
            });

            expect(result.success).toBe(true);
            expect(result.strategy).toBe('dry-run');
            expect(result.target).toBe('dry-run');
            expect(result.deployedCount).toBe(2);
            expect(result.manifest.digest).toBeDefined();
            // Rest API must never be called on dry-run
            expect(putSpy).not.toHaveBeenCalled();
        });

        it('should publish guild commands using guild strategy', async () => {
            const putSpy = vi.fn().mockResolvedValue(['res1', 'res2']);
            const restClient = { put: putSpy };

            const result = await publishCommands({
                strategy: 'guild',
                applicationId: 'app-test-id',
                token: 'mock-controller-token',
                guildId: 'guild-12345',
                customCommands: sampleCommands,
                restClient,
            });

            expect(result.success).toBe(true);
            expect(result.strategy).toBe('guild');
            expect(result.target).toBe('guild:guild-12345');
            expect(result.deployedCount).toBe(2);

            expect(putSpy).toHaveBeenCalledWith(
                Routes.applicationGuildCommands('app-test-id', 'guild-12345'),
                expect.objectContaining({
                    body: expect.arrayContaining([
                        expect.objectContaining({ name: 'pause' }),
                        expect.objectContaining({ name: 'play' }),
                    ]),
                }),
            );
        });

        it('should require guildId when using guild strategy', async () => {
            await expect(
                publishCommands({
                    strategy: 'guild',
                    applicationId: 'app-test-id',
                    token: 'mock-controller-token',
                    guildId: '',
                    customCommands: sampleCommands,
                }),
            ).rejects.toThrow(/guildId .* is required when using the "guild" publishing strategy/);
        });

        it('should publish globally using global strategy', async () => {
            const putSpy = vi.fn().mockResolvedValue(['res1', 'res2']);
            const restClient = { put: putSpy };

            const result = await publishCommands({
                strategy: 'global',
                applicationId: 'app-hosted-id',
                token: 'mock-controller-token',
                customCommands: sampleCommands,
                restClient,
            });

            expect(result.success).toBe(true);
            expect(result.strategy).toBe('global');
            expect(result.target).toBe('global');
            expect(result.deployedCount).toBe(2);

            expect(putSpy).toHaveBeenCalledWith(
                Routes.applicationCommands('app-hosted-id'),
                expect.objectContaining({
                    body: expect.arrayContaining([
                        expect.objectContaining({ name: 'pause' }),
                        expect.objectContaining({ name: 'play' }),
                    ]),
                }),
            );
        });
    });

    describe('Core Commands Collection Integration', () => {
        it('should collect and normalize all core commands from codebase', async () => {
            const coreCommands = await collectCoreCommandDescriptors();

            expect(coreCommands.length).toBeGreaterThan(15);

            const names = coreCommands.map((c) => c.name);
            expect(names).toContain('play');
            expect(names).toContain('pause');
            expect(names).toContain('stop');
            expect(names).toContain('skip');
            expect(names).toContain('music-status');
            expect(names).toContain('catastrophic-reset');

            for (const cmd of coreCommands) {
                expect(cmd.data.contexts).toEqual([InteractionContextType.Guild]);
                expect(cmd.data.integration_types).toEqual([
                    ApplicationIntegrationType.GuildInstall,
                ]);
                expect(cmd.data.dm_permission).toBe(false);
            }
        });
    });

    describe('Deterministic Code-Point Sorting', () => {
        it('should sort commands deterministically by Unicode code points', () => {
            const names = ['zeta', 'alpha', 'beta_test', 'beta-test', 'alpha1', '123'];
            const sorted = names.map((n) => ({ name: n })).sort(compareCommandNames);

            expect(sorted.map((s) => s.name)).toEqual([
                '123',
                'alpha',
                'alpha1',
                'beta-test',
                'beta_test',
                'zeta',
            ]);
        });
    });

    describe('Plugin Discovery Enhancements (Symlinks, Filters, Fallbacks)', () => {
        it('should discover commands from symlinked plugin directories', async () => {
            const externalPluginDir = path.join(tempDir, 'external-plugin');
            await fs.promises.mkdir(externalPluginDir, { recursive: true });

            await fs.promises.writeFile(
                path.join(externalPluginDir, 'jasper-plugin.json'),
                JSON.stringify({ id: 'linked-plugin', name: 'Linked Plugin', entry: 'index.js' }),
            );
            await fs.promises.writeFile(
                path.join(externalPluginDir, 'index.js'),
                `export default {
                    name: 'Linked Plugin',
                    commands: [{ data: { name: 'linked-cmd', description: 'From symlink' } }]
                };`,
            );

            const testPluginsRoot = path.join(tempDir, 'plugins-root');
            await fs.promises.mkdir(testPluginsRoot, { recursive: true });
            await fs.promises.symlink(
                externalPluginDir,
                path.join(testPluginsRoot, 'linked-plugin'),
                'dir',
            );

            const discovered = await collectPluginCommandDescriptors(testPluginsRoot);
            expect(discovered.some((c) => c.name === 'linked-cmd')).toBe(true);
        });

        it('should respect disabledPlugins and enabledPlugins filters', async () => {
            const pluginsRoot = path.join(tempDir, 'filter-plugins');
            await fs.promises.mkdir(path.join(pluginsRoot, 'plugin-a'), { recursive: true });
            await fs.promises.mkdir(path.join(pluginsRoot, 'plugin-b'), { recursive: true });

            await fs.promises.writeFile(
                path.join(pluginsRoot, 'plugin-a', 'index.js'),
                `export default { name: 'A', commands: [{ data: { name: 'cmd-a', description: 'Desc A' } }] };`,
            );
            await fs.promises.writeFile(
                path.join(pluginsRoot, 'plugin-b', 'index.js'),
                `export default { name: 'B', commands: [{ data: { name: 'cmd-b', description: 'Desc B' } }] };`,
            );

            // Filter out plugin-a using disabledPlugins
            const disabledResult = await collectPluginCommandDescriptors(pluginsRoot, {
                disabledPlugins: ['plugin-a'],
            });
            expect(disabledResult.map((c) => c.name)).toEqual(['cmd-b']);

            // Filter using enabledPlugins whitelist
            const enabledResult = await collectPluginCommandDescriptors(pluginsRoot, {
                enabledPlugins: ['plugin-a'],
            });
            expect(enabledResult.map((c) => c.name)).toEqual(['cmd-a']);
        });

        it('should skip plugins marked disabled in jasper-plugin.json manifest', async () => {
            const pluginsRoot = path.join(tempDir, 'manifest-disabled-plugins');
            const pluginDir = path.join(pluginsRoot, 'disabled-plugin');
            await fs.promises.mkdir(pluginDir, { recursive: true });

            await fs.promises.writeFile(
                path.join(pluginDir, 'jasper-plugin.json'),
                JSON.stringify({ id: 'disabled-plugin', name: 'Disabled', enabled: false }),
            );
            await fs.promises.writeFile(
                path.join(pluginDir, 'index.js'),
                `export default { name: 'Disabled', commands: [{ data: { name: 'hidden-cmd', description: 'Hidden' } }] };`,
            );

            const result = await collectPluginCommandDescriptors(pluginsRoot);
            expect(result.some((c) => c.name === 'hidden-cmd')).toBe(false);
        });

        it('should fallback to commands.js or commands/ directory if plugin.commands is missing', async () => {
            const pluginsRoot = path.join(tempDir, 'fallback-plugins');
            const pluginDir = path.join(pluginsRoot, 'unmigrated-plugin');
            const commandsSubdir = path.join(pluginDir, 'commands');
            await fs.promises.mkdir(commandsSubdir, { recursive: true });

            // Plugin index has no commands array
            await fs.promises.writeFile(
                path.join(pluginDir, 'index.js'),
                `export default { name: 'Unmigrated', onLoad: () => {} };`,
            );
            // commands/custom.js defines the command
            await fs.promises.writeFile(
                path.join(commandsSubdir, 'custom.js'),
                `export default { data: { name: 'fallback-cmd', description: 'Discovered via fallback' } };`,
            );

            const result = await collectPluginCommandDescriptors(pluginsRoot);
            expect(result.some((c) => c.name === 'fallback-cmd')).toBe(true);
        });
    });
});
