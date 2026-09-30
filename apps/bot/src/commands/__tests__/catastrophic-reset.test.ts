import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import musicPlayer from '../../core/music-player.js';
import workerPool from '../../core/worker-pool.js';
import catastrophicResetCommand from '../catastrophic-reset.js';

vi.mock('../../core/logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../core/music-player.js', () => ({
    default: {
        clearGuildQueues: vi.fn(),
        clearAllQueues: vi.fn(),
    },
}));

vi.mock('../../core/worker-pool.js', () => ({
    default: {
        getLeases: vi.fn(),
        releaseWorker: vi.fn(),
    },
}));

describe('catastrophic-reset command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockInteraction = {
            guildId: 'guild-target',
            user: {
                id: 'admin-user',
                tag: 'Admin#0001',
            } as unknown as ChatInputCommandInteraction['user'],
            memberPermissions: {
                has: vi
                    .fn()
                    .mockImplementation((perm: bigint) => perm === PermissionFlagsBits.ManageGuild),
            } as unknown as ChatInputCommandInteraction['memberPermissions'],
            reply: vi.fn().mockResolvedValue(undefined),
        };

        vi.mocked(workerPool.getLeases).mockReturnValue([
            {
                state: 'active',
                guildId: 'guild-target',
                installationId: 'inst-target',
                workerId: 'worker-1',
                voiceChannelId: 'vc-1',
                generation: 1,
                acquiredAt: new Date(),
                lastActivityAt: new Date(),
            },
        ]);
    });

    it('rejects DM execution when guildId is missing', async () => {
        mockInteraction.guildId = null;

        await catastrophicResetCommand.execute(mockInteraction as ChatInputCommandInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('This command can only be executed in a server.'),
            ephemeral: true,
        });
        expect(musicPlayer.clearGuildQueues).not.toHaveBeenCalled();
    });

    it('rejects execution when member lacks ManageGuild or Administrator permission', async () => {
        mockInteraction.memberPermissions = {
            has: vi.fn().mockReturnValue(false),
        } as unknown as ChatInputCommandInteraction['memberPermissions'];

        await catastrophicResetCommand.execute(mockInteraction as ChatInputCommandInteraction);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining(
                'You need `Manage Server` permission to perform a catastrophic reset.',
            ),
            ephemeral: true,
        });
        expect(musicPlayer.clearGuildQueues).not.toHaveBeenCalled();
    });

    it('clears queues and worker leases strictly for the invoking guild when authorized', async () => {
        await catastrophicResetCommand.execute(mockInteraction as ChatInputCommandInteraction);

        // Clears queues for this guild only
        expect(musicPlayer.clearGuildQueues).toHaveBeenCalledWith('guild-target');

        // Releases active leases for this guild
        expect(workerPool.getLeases).toHaveBeenCalledWith('guild-target');
        expect(workerPool.releaseWorker).toHaveBeenCalledWith('vc-1', {
            guildId: 'guild-target',
            installationId: 'inst-target',
            generation: 1,
        });

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('CATASTROPHIC RESET COMPLETE'),
            ephemeral: false,
        });
    });
});
