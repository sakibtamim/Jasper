import { PluginContext } from '@jasper/types';
import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    GatewayIntentBits,
    ModalSubmitInteraction,
} from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    handleButtonInteraction,
    handleModalSubmit,
    isMessageContentSupported,
    registerCommand,
} from '../commands/soundboard.js';

describe('Soundboard Upload & Intent Gating', () => {
    const originalEnv = process.env.RUNTIME_PROFILE;
    let mockContext: PluginContext;
    let registeredCommandHandler: (interaction: ChatInputCommandInteraction) => Promise<void>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = {
            client: {
                user: { id: 'bot-123', username: 'Jasper' },
                options: {
                    intents: [
                        GatewayIntentBits.Guilds,
                        GatewayIntentBits.GuildVoiceStates,
                        GatewayIntentBits.GuildMessages,
                        GatewayIntentBits.MessageContent,
                    ],
                },
            },
            logger: {
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            },
            db: {
                plugin: {
                    get: vi.fn(),
                    set: vi.fn(),
                },
                core: {} as unknown as PluginContext['db']['core'],
            },
            storage: {
                save: vi.fn(),
                get: vi.fn(),
                delete: vi.fn(),
                list: vi.fn(),
            },
            registerCommand: vi.fn((cmd) => {
                registeredCommandHandler = cmd.execute;
            }),
            playAudio: vi.fn(),
            scheduleTask: vi.fn(),
            on: vi.fn(),
            workers: [],
            server: {} as unknown as PluginContext['server'],
        } as unknown as PluginContext;

        registerCommand(mockContext);
    });

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.RUNTIME_PROFILE = originalEnv;
        } else {
            delete process.env.RUNTIME_PROFILE;
        }
    });

    describe('isMessageContentSupported', () => {
        it('should return false in hosted mode', () => {
            process.env.RUNTIME_PROFILE = 'hosted';
            expect(isMessageContentSupported(mockContext)).toBe(false);
        });

        it('should return true in self-hosted mode when MessageContent is available', () => {
            process.env.RUNTIME_PROFILE = 'self-hosted';
            expect(isMessageContentSupported(mockContext)).toBe(true);
        });

        it('should return false if client intents omit MessageContent even in self-hosted mode', () => {
            process.env.RUNTIME_PROFILE = 'self-hosted';
            mockContext.client.options = {
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildVoiceStates,
                    GatewayIntentBits.GuildMessages,
                ],
            };
            expect(isMessageContentSupported(mockContext)).toBe(false);
        });
    });

    describe('/soundboard add command gating', () => {
        it('should gate interactive wizard and inform user in hosted mode when options are missing', async () => {
            process.env.RUNTIME_PROFILE = 'hosted';

            const interaction = {
                guild: { id: 'guild-1' },
                options: {
                    getSubcommand: vi.fn().mockReturnValue('add'),
                    getAttachment: vi.fn().mockReturnValue(null),
                    getString: vi.fn().mockReturnValue(null),
                },
                reply: vi.fn().mockResolvedValue(undefined),
            } as unknown as ChatInputCommandInteraction;

            await registeredCommandHandler(interaction);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining(
                        'Interactive chat message upload is disabled in hosted mode',
                    ),
                    flags: expect.anything(),
                }),
            );
            // Verify no wizard button was provided
            const call = vi.mocked(interaction.reply).mock.calls[0][0] as {
                components?: unknown;
            };
            expect(call.components).toBeUndefined();
        });

        it('should display the wizard button in self-hosted mode when options are missing', async () => {
            process.env.RUNTIME_PROFILE = 'self-hosted';

            const interaction = {
                guild: { id: 'guild-1' },
                options: {
                    getSubcommand: vi.fn().mockReturnValue('add'),
                    getAttachment: vi.fn().mockReturnValue(null),
                    getString: vi.fn().mockReturnValue(null),
                },
                reply: vi.fn().mockResolvedValue(undefined),
            } as unknown as ChatInputCommandInteraction;

            await registeredCommandHandler(interaction);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('interactive wizard'),
                    components: expect.arrayContaining([expect.anything()]),
                }),
            );
        });
    });

    describe('wizard button interaction gating', () => {
        it('should reject wizard modal button in hosted mode', async () => {
            process.env.RUNTIME_PROFILE = 'hosted';

            const interaction = {
                customId: 'soundboard_add_modal_btn',
                reply: vi.fn().mockResolvedValue(undefined),
                showModal: vi.fn(),
            } as unknown as ButtonInteraction;

            await handleButtonInteraction(interaction, mockContext);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining(
                        'The interactive sound wizard is disabled in hosted mode',
                    ),
                }),
            );
            expect(interaction.showModal).not.toHaveBeenCalled();
        });

        it('should open modal for wizard button in self-hosted mode', async () => {
            process.env.RUNTIME_PROFILE = 'self-hosted';

            const interaction = {
                customId: 'soundboard_add_modal_btn',
                reply: vi.fn(),
                showModal: vi.fn().mockResolvedValue(undefined),
            } as unknown as ButtonInteraction;

            await handleButtonInteraction(interaction, mockContext);

            expect(interaction.showModal).toHaveBeenCalled();
            expect(interaction.reply).not.toHaveBeenCalled();
        });
    });

    describe('wizard modal submit gating', () => {
        it('should reject modal submission in hosted mode', async () => {
            process.env.RUNTIME_PROFILE = 'hosted';

            const interaction = {
                customId: 'soundboard_add_modal',
                reply: vi.fn().mockResolvedValue(undefined),
                channel: {
                    isTextBased: vi.fn().mockReturnValue(true),
                    isDMBased: vi.fn().mockReturnValue(false),
                    createMessageCollector: vi.fn(),
                },
            } as unknown as ModalSubmitInteraction;

            await handleModalSubmit(interaction, mockContext);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining(
                        'The interactive sound wizard is disabled in hosted mode',
                    ),
                }),
            );
            expect(interaction.channel?.createMessageCollector).not.toHaveBeenCalled();
        });
    });
});
