import {
    ApplicationIntegrationType,
    InteractionContextType,
    PermissionFlagsBits,
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
});
