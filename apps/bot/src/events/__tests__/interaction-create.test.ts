import { CacheType, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    GuildAccessPolicy,
    GuildInstallationContext,
    resetGuildAccessPolicy,
    setGuildAccessPolicy,
} from '../../core/access-policy.js';
import interactionCreateHandler from '../interaction-create.js';

vi.mock('../../core/logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('interactionCreate event handler - Guild Access Guard', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockCommand: { execute: ReturnType<typeof vi.fn>; autocomplete?: ReturnType<typeof vi.fn> };
    let mockCommandsMap: Map<string, unknown>;

    beforeEach(() => {
        vi.clearAllMocks();
        resetGuildAccessPolicy();

        mockCommand = {
            execute: vi.fn().mockResolvedValue(undefined),
            autocomplete: vi.fn().mockResolvedValue(undefined),
        };

        mockCommandsMap = new Map();
        mockCommandsMap.set('play', mockCommand);

        mockInteraction = {
            commandName: 'play',
            user: { id: 'user-1' } as unknown as ChatInputCommandInteraction['user'],
            isChatInputCommand: vi.fn().mockReturnValue(true),
            isAutocomplete: vi.fn().mockReturnValue(false),
            reply: vi.fn().mockResolvedValue(undefined),
            followUp: vi.fn().mockResolvedValue(undefined),
            client: {
                commands: mockCommandsMap,
            } as unknown as ChatInputCommandInteraction['client'],
        };
    });

    it('rejects DM interactions where guildId is absent', async () => {
        mockInteraction.guildId = null;

        await interactionCreateHandler.execute(mockInteraction as Interaction<CacheType>);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining(
                'Jasper commands can only be used within a server, not in Direct Messages.',
            ),
            ephemeral: true,
        });
        expect(mockCommand.execute).not.toHaveBeenCalled();
    });

    it('rejects interactions when guild has no active installation', async () => {
        mockInteraction.guildId = 'unregistered-guild';

        const mockPolicy: GuildAccessPolicy = {
            resolve: vi.fn().mockResolvedValue(null),
            mayStartWork: vi.fn().mockReturnValue(false),
        };
        setGuildAccessPolicy(mockPolicy);

        await interactionCreateHandler.execute(mockInteraction as Interaction<CacheType>);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining(
                'This server does not have an active Jasper installation.',
            ),
            ephemeral: true,
        });
        expect(mockCommand.execute).not.toHaveBeenCalled();
    });

    it('rejects interactions when installation is suspended', async () => {
        mockInteraction.guildId = 'suspended-guild';

        const context: GuildInstallationContext = {
            guildId: 'suspended-guild',
            installationId: 'inst-1',
            state: 'suspended',
            admissionRevision: 0,
            configRevision: 1,
            enabledWorkerIds: new Set(),
            enabledPluginIds: new Set(),
            jasperWeight: 0.5,
        };

        const mockPolicy: GuildAccessPolicy = {
            resolve: vi.fn().mockResolvedValue(context),
            mayStartWork: vi.fn().mockReturnValue(false),
        };
        setGuildAccessPolicy(mockPolicy);

        await interactionCreateHandler.execute(mockInteraction as Interaction<CacheType>);

        expect(mockInteraction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining(
                'This server’s Jasper installation is currently suspended.',
            ),
            ephemeral: true,
        });
        expect(mockCommand.execute).not.toHaveBeenCalled();
    });

    it('admits active guild installation and attaches context to interaction', async () => {
        mockInteraction.guildId = 'active-guild';

        await interactionCreateHandler.execute(mockInteraction as Interaction<CacheType>);

        // Should attach installation context
        // @ts-expect-error - accessing attached property
        expect(mockInteraction.installation).toBeDefined();
        // @ts-expect-error - accessing attached property
        expect(mockInteraction.installation.guildId).toBe('active-guild');

        // Should execute command
        expect(mockCommand.execute).toHaveBeenCalledWith(mockInteraction);
    });
});
