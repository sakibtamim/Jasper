import { ChatInputCommandInteraction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import musicPlayer from '../../core/music-player.js';
import workerPool from '../../core/worker-pool.js';
import musicStatusCommand from '../music-status.js';

vi.mock('../../core/music-player.js', () => ({
    default: {
        getQueues: vi.fn(),
    },
}));

vi.mock('../../core/worker-pool.js', () => ({
    default: {
        getWorkers: vi.fn(),
        getController: vi.fn(),
    },
}));

describe('music-status command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockQueues: Map<string, unknown>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockQueues = new Map();
        vi.mocked(musicPlayer.getQueues).mockReturnValue(
            mockQueues as unknown as ReturnType<typeof musicPlayer.getQueues>,
        );

        mockInteraction = {
            guildId: 'guild-current',
            reply: vi.fn().mockResolvedValue(undefined),
        };
    });

    it('displays active cat in current guild and idle cats without duplicating controller', async () => {
        const controller = {
            name: 'Jasper',
            role: 'controller',
            leases: new Map([
                [
                    'guild-current',
                    {
                        voiceChannelId: 'vc-jasper-1',
                        installationId: 'inst-1',
                        generation: 1,
                    },
                ],
            ]),
        };

        const misty = {
            name: 'Misty',
            role: 'worker',
            leases: new Map([
                [
                    'guild-OTHER',
                    {
                        voiceChannelId: 'vc-misty-other',
                        installationId: 'inst-2',
                        generation: 1,
                    },
                ],
            ]),
        };

        const tuki = {
            name: 'Tuki',
            role: 'worker',
            leases: new Map(),
        };

        vi.mocked(workerPool.getController).mockReturnValue(
            controller as unknown as ReturnType<typeof workerPool.getController>,
        );
        // Note: getWorkers() returns all cats including controller
        vi.mocked(workerPool.getWorkers).mockReturnValue([
            controller,
            misty,
            tuki,
        ] as unknown as ReturnType<typeof workerPool.getWorkers>);

        mockQueues.set('vc-jasper-1', {
            nowPlaying: { title: 'Cosmic Meow Sonata' },
        });

        await musicStatusCommand.execute(mockInteraction as ChatInputCommandInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledTimes(1);
        const replyArg = vi.mocked(mockInteraction.reply).mock.calls[0][0] as {
            embeds: Array<{ data: { fields: Array<{ name: string; value: string }> } }>;
        };
        const fields = replyArg.embeds[0].data.fields;

        const activeField = fields.find((f) => f.name.includes('Active Sessions'));
        const idleField = fields.find((f) => f.name.includes('Idle Cats'));

        expect(activeField).toBeDefined();
        expect(idleField).toBeDefined();

        // Jasper should be active in guild-current
        expect(activeField?.value).toContain('**Jasper** → <#vc-jasper-1>');
        expect(activeField?.value).toContain('Cosmic Meow Sonata');

        // Jasper should NOT be duplicated in either active or idle
        const jasperOccurrences = ((activeField?.value || '') + (idleField?.value || '')).match(
            /Jasper/g,
        );
        expect(jasperOccurrences).toHaveLength(1);

        // Misty is busy in guild-OTHER, so in guild-current Misty is IDLE!
        expect(idleField?.value).toContain('**Misty**');

        // Tuki is also idle
        expect(idleField?.value).toContain('**Tuki**');
    });

    it('rejects DM execution when guildId is missing', async () => {
        mockInteraction.guildId = null;

        await musicStatusCommand.execute(mockInteraction as ChatInputCommandInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('This command can only be executed in a server.'),
            ephemeral: true,
        });
    });
});
