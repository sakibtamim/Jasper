import { PluginContext } from '@jasper/types';
import { AutocompleteInteraction } from 'discord.js';
import Fastify, { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAutocomplete } from '../commands/soundboard.js';
import { registerRoutes } from '../routes.js';
import { playSoundboardClip } from '../services/playback.js';
import { SoundService } from '../services/sound-service.js';
import { Play, Sound } from '../types.js';

describe('Soundboard Guild Isolation & Safety (HJ-SB-01)', () => {
    let mockContext: PluginContext;
    let storedSounds: Sound[];
    let storedPlays: Play[];

    beforeEach(() => {
        vi.clearAllMocks();

        storedSounds = [];
        storedPlays = [];

        mockContext = {
            client: {
                user: { id: 'bot-123', username: 'Jasper' },
                options: { intents: [] },
            },
            logger: {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {
                plugin: {
                    get: vi.fn(async (key: string) => {
                        if (key === 'sounds') return [...storedSounds];
                        if (key === 'plays') return [...storedPlays];
                        return null;
                    }),
                    set: vi.fn(async (key: string, val: unknown) => {
                        if (key === 'sounds') storedSounds = [...(val as Sound[])];
                        if (key === 'plays') storedPlays = [...(val as Play[])];
                    }),
                },
                core: {} as unknown as PluginContext['db']['core'],
            },
            storage: {
                save: vi.fn(async (name: string) => `storage://soundboard/${name}`),
                get: vi.fn(async () => Buffer.from('audio')),
                delete: vi.fn(async () => {}),
                list: vi.fn(async () => []),
                resolve: vi.fn((uri: string) => ({
                    fsPath: `/mock/path/${uri.replace('storage://soundboard/', '')}`,
                })),
            },
            playAudio: vi.fn(async () => {}),
            server: {} as unknown as PluginContext['server'],
            registerCommand: vi.fn(),
            scheduleTask: vi.fn(),
            on: vi.fn(),
            workers: [],
        } as unknown as PluginContext;
    });

    describe('SoundService Guild Isolation', () => {
        it('should correctly attribute sounds to guild and user without placeholder identities', async () => {
            const service = new SoundService(mockContext);

            const soundA = await service.addSound(
                'Sound A',
                '🔊',
                'storage://soundboard/a.mp3',
                'user-123',
                'guild-A',
                'install-A',
            );

            expect(soundA.createdByUserId).toBe('user-123');
            expect(soundA.guildId).toBe('guild-A');
            expect(soundA.installationId).toBe('install-A');
            expect(soundA.createdByUserId).not.toBe('dashboard-user');

            const soundB = await service.addSound(
                'Sound B',
                '🎉',
                'storage://soundboard/b.mp3',
                'user-456',
                'guild-B',
            );

            expect(soundB.createdByUserId).toBe('user-456');
            expect(soundB.guildId).toBe('guild-B');
            expect(soundB.installationId).toBe('guild-B');
        });

        it('should strictly isolate sound listings by guildId', async () => {
            const service = new SoundService(mockContext);

            await service.addSound(
                'Guild A Sound',
                '🅰️',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );
            await service.addSound(
                'Guild B Sound',
                '🅱️',
                'storage://soundboard/b.mp3',
                'user-B',
                'guild-B',
            );

            const soundsForA = await service.getSounds('guild-A');
            expect(soundsForA).toHaveLength(1);
            expect(soundsForA[0].name).toBe('Guild A Sound');

            const soundsForB = await service.getSounds('guild-B');
            expect(soundsForB).toHaveLength(1);
            expect(soundsForB[0].name).toBe('Guild B Sound');
        });

        it('should include global sounds when querying any guild', async () => {
            const service = new SoundService(mockContext);

            await service.addSound(
                'Guild A Sound',
                '🅰️',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );

            // Add global sound directly to DB
            storedSounds.push({
                id: 'global-1',
                name: 'Global Horn',
                emoji: '🎺',
                fileUri: 'storage://soundboard/horn.mp3',
                createdAt: Date.now(),
                createdByUserId: 'system',
                guildId: '',
                isGlobal: true,
            });

            const soundsForA = await service.getSounds('guild-A');
            expect(soundsForA).toHaveLength(2);
            expect(soundsForA.map((s) => s.name)).toContain('Guild A Sound');
            expect(soundsForA.map((s) => s.name)).toContain('Global Horn');

            const soundsForB = await service.getSounds('guild-B');
            expect(soundsForB).toHaveLength(1);
            expect(soundsForB[0].name).toBe('Global Horn');
        });

        it('should prevent cross-guild sound mutation (update)', async () => {
            const service = new SoundService(mockContext);

            const soundA = await service.addSound(
                'Secret A',
                '🔒',
                'storage://soundboard/secret.mp3',
                'user-A',
                'guild-A',
            );

            // Guild B attempts to update Guild A's sound
            await expect(
                service.updateSound(soundA.id, { name: 'Hacked Name' }, 'guild-B'),
            ).rejects.toThrow('Unauthorized: sound belongs to a different guild');

            // Same guild update succeeds
            const updated = await service.updateSound(soundA.id, { name: 'Updated A' }, 'guild-A');
            expect(updated?.name).toBe('Updated A');
        });

        it('should prevent cross-guild sound deletion', async () => {
            const service = new SoundService(mockContext);

            const soundA = await service.addSound(
                'Delete Target',
                '🎯',
                'storage://soundboard/target.mp3',
                'user-A',
                'guild-A',
            );

            // Guild B attempts to delete Guild A's sound
            await expect(service.deleteSound(soundA.id, 'guild-B')).rejects.toThrow(
                'Unauthorized: sound belongs to a different guild',
            );

            // Verify file was NOT deleted from storage
            expect(mockContext.storage.delete).not.toHaveBeenCalled();

            // Guild B attempts to delete record only
            await expect(service.deleteSoundRecord(soundA.id, 'guild-B')).rejects.toThrow(
                'Unauthorized: sound belongs to a different guild',
            );

            // Deletion with matching guild succeeds
            const deleted = await service.deleteSound(soundA.id, 'guild-A');
            expect(deleted).toBe(true);
            expect(mockContext.storage.delete).toHaveBeenCalledWith('target.mp3');
        });

        it('should calculate stats strictly isolated per guild', async () => {
            const service = new SoundService(mockContext);

            const soundA = await service.addSound(
                'Sound A',
                '🅰️',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );
            const soundB = await service.addSound(
                'Sound B',
                '🅱️',
                'storage://soundboard/b.mp3',
                'user-B',
                'guild-B',
            );

            storedPlays.push(
                {
                    id: 'p1',
                    soundId: soundA.id,
                    soundNameSnapshot: soundA.name,
                    emojiSnapshot: soundA.emoji,
                    userId: 'user-A',
                    guildId: 'guild-A',
                    channelId: 'c1',
                    voiceChannelId: 'vc1',
                    playedAt: Date.now(),
                },
                {
                    id: 'p2',
                    soundId: soundA.id,
                    soundNameSnapshot: soundA.name,
                    emojiSnapshot: soundA.emoji,
                    userId: 'user-A',
                    guildId: 'guild-A',
                    channelId: 'c1',
                    voiceChannelId: 'vc1',
                    playedAt: Date.now(),
                },
                {
                    id: 'p3',
                    soundId: soundB.id,
                    soundNameSnapshot: soundB.name,
                    emojiSnapshot: soundB.emoji,
                    userId: 'user-B',
                    guildId: 'guild-B',
                    channelId: 'c2',
                    voiceChannelId: 'vc2',
                    playedAt: Date.now(),
                },
            );

            const statsA = await service.getStats('guild-A');
            expect(statsA.totalPlays).toBe(2);
            expect(statsA.topSounds).toHaveLength(1);
            expect(statsA.topSounds[0].soundId).toBe(soundA.id);
            expect(statsA.topSounds[0].count).toBe(2);

            const statsB = await service.getStats('guild-B');
            expect(statsB.totalPlays).toBe(1);
            expect(statsB.topSounds).toHaveLength(1);
            expect(statsB.topSounds[0].soundId).toBe(soundB.id);
            expect(statsB.topSounds[0].count).toBe(1);
        });
    });

    describe('Playback Guild Security', () => {
        it('should allow playback within the owning guild', async () => {
            const service = new SoundService(mockContext);
            const soundA = await service.addSound(
                'Sound A',
                '🅰️',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );

            await expect(
                playSoundboardClip(mockContext, soundA.id, 'guild-A', 'vc-1', 'user-A', 'text-1'),
            ).resolves.toBeUndefined();

            expect(mockContext.playAudio).toHaveBeenCalledWith(
                expect.objectContaining({
                    guildId: 'guild-A',
                    voiceChannelId: 'vc-1',
                }),
            );
        });

        it('should block playback of private sound from an unauthorized guild', async () => {
            const service = new SoundService(mockContext);
            const soundA = await service.addSound(
                'Sound A',
                '🅰️',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );

            await expect(
                playSoundboardClip(mockContext, soundA.id, 'guild-B', 'vc-2', 'user-B', 'text-2'),
            ).rejects.toThrow('Sound not found or not accessible in this guild');

            expect(mockContext.playAudio).not.toHaveBeenCalled();
            expect(mockContext.logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Guild guild-B attempted to play sound'),
            );
        });

        it('should permit playback of global sounds from any guild', async () => {
            storedSounds.push({
                id: 'global-sound',
                name: 'Global Sound',
                emoji: '🌐',
                fileUri: 'storage://soundboard/global.mp3',
                createdAt: Date.now(),
                createdByUserId: 'system',
                guildId: '',
                isGlobal: true,
            });

            await expect(
                playSoundboardClip(mockContext, 'global-sound', 'guild-B', 'vc-2', 'user-B'),
            ).resolves.toBeUndefined();

            expect(mockContext.playAudio).toHaveBeenCalledWith(
                expect.objectContaining({
                    guildId: 'guild-B',
                }),
            );
        });
    });

    describe('REST API Guild Isolation & Authentication', () => {
        let app: FastifyInstance;

        beforeEach(async () => {
            app = Fastify();
            app.addHook('onRequest', async (req) => {
                const authHeader = req.headers['authorization'];
                if (authHeader === 'Bearer valid-user') {
                    req.user = { id: 'auth-user-123' };
                }
            });
            mockContext.server = app as unknown as PluginContext['server'];
            registerRoutes(mockContext);
            await app.ready();
        });

        afterEach(async () => {
            await app.close();
        });

        it('should reject sound creation if unauthenticated (401)', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sounds',
                payload: {
                    name: 'Test Sound',
                    emoji: '🔔',
                    fileUri: 'storage://soundboard/test.mp3',
                    guildId: 'guild-123',
                },
            });

            expect(response.statusCode).toBe(401);
            const json = response.json();
            expect(json.error).toMatch(/Authentication required/i);
        });

        it('should reject sound creation if guildId is missing (400)', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sounds',
                payload: {
                    name: 'Test Sound',
                    emoji: '🔔',
                    fileUri: 'storage://soundboard/test.mp3',
                    userId: 'real-user-1',
                },
            });

            expect(response.statusCode).toBe(400);
            const json = response.json();
            expect(json.error).toMatch(/guildId is required/i);
        });

        it('should create sound when authenticated with real userId and guildId', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/sounds',
                payload: {
                    name: 'Legit Sound',
                    emoji: '🎵',
                    fileUri: 'storage://soundboard/legit.mp3',
                    guildId: 'guild-A',
                    userId: 'authenticated-user-789',
                },
            });

            expect(response.statusCode).toBe(200);
            const json = response.json();
            expect(json.name).toBe('Legit Sound');
            expect(json.guildId).toBe('guild-A');
            expect(json.createdByUserId).toBe('authenticated-user-789');
        });

        it('should return 403 when updating a sound belonging to another guild', async () => {
            const service = new SoundService(mockContext);
            const soundA = await service.addSound(
                'Target A',
                '🅰️',
                'storage://soundboard/target.mp3',
                'user-A',
                'guild-A',
            );

            const response = await app.inject({
                method: 'PATCH',
                url: `/sounds/${soundA.id}`,
                headers: { 'x-guild-id': 'guild-B' },
                payload: {
                    name: 'Intruder Update',
                    emoji: '🦹',
                },
            });

            expect(response.statusCode).toBe(403);
            const json = response.json();
            expect(json.error).toMatch(/Unauthorized/i);
        });

        it('should return 403 when deleting a sound belonging to another guild', async () => {
            const service = new SoundService(mockContext);
            const soundA = await service.addSound(
                'Target A',
                '🅰️',
                'storage://soundboard/target.mp3',
                'user-A',
                'guild-A',
            );

            const response = await app.inject({
                method: 'DELETE',
                url: `/sounds/${soundA.id}?guildId=guild-B`,
            });

            expect(response.statusCode).toBe(403);
            const json = response.json();
            expect(json.error).toMatch(/Unauthorized/i);
        });

        it('should delete only the targeted guild data when clearing data with guild scope', async () => {
            const service = new SoundService(mockContext);
            await service.addSound(
                'Sound A',
                '🅰️',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );
            await service.addSound(
                'Sound B',
                '🅱️',
                'storage://soundboard/b.mp3',
                'user-B',
                'guild-B',
            );

            // Unauthenticated clear data returns 401
            const unauthRes = await app.inject({
                method: 'DELETE',
                url: '/data?guildId=guild-A',
            });
            expect(unauthRes.statusCode).toBe(401);

            // Authenticated clear data for guild A only
            const res = await app.inject({
                method: 'DELETE',
                url: '/data?guildId=guild-A',
                headers: { authorization: 'Bearer valid-user' },
            });

            expect(res.statusCode).toBe(200);
            const remainingSounds = await service.getSounds();
            expect(remainingSounds).toHaveLength(1);
            expect(remainingSounds[0].name).toBe('Sound B');
            expect(remainingSounds[0].guildId).toBe('guild-B');
        });
    });

    describe('Autocomplete Scoping', () => {
        it('should autocomplete only sounds from the interaction guild', async () => {
            const service = new SoundService(mockContext);
            await service.addSound(
                'Alpha Horn',
                '🎺',
                'storage://soundboard/a.mp3',
                'user-A',
                'guild-A',
            );
            await service.addSound(
                'Beta Drum',
                '🥁',
                'storage://soundboard/b.mp3',
                'user-B',
                'guild-B',
            );

            const interaction = {
                guildId: 'guild-A',
                options: {
                    getFocused: vi.fn().mockReturnValue(''),
                },
                respond: vi.fn().mockResolvedValue(undefined),
            } as unknown as AutocompleteInteraction;

            await handleAutocomplete(interaction, mockContext);

            expect(interaction.respond).toHaveBeenCalledWith([
                { name: '🎺 Alpha Horn', value: expect.any(String) },
            ]);
        });
    });
});
