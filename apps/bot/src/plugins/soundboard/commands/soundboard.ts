import { PluginContext } from '@jasper/types';
import axios from 'axios';
import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    MessageFlags,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';

import { playSoundboardClip } from '../services/playback.js';
import { SoundService } from '../services/sound-service.js';
import { Sound } from '../types.js';

export const registerCommand = (context: PluginContext) => {
    const data = new SlashCommandBuilder()
        .setName('soundboard')
        .setDescription('Jasper Soundboard System')
        .addSubcommand((sub) =>
            sub.setName('menu').setDescription('Open the soundboard selection menu (Ephemeral)'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('play')
                .setDescription('Play a specific sound')
                .addStringOption((option) =>
                    option
                        .setName('sound')
                        .setDescription('The sound to play')
                        .setRequired(true)
                        .setAutocomplete(true),
                ),
        )
        .addSubcommand((sub) =>
            sub.setName('ui').setDescription('Post a permanent soundboard UI in this channel'),
        )
        .addSubcommand((sub) =>
            sub
                .setName('add')
                .setDescription('Add a new sound to the soundboard')
                .addAttachmentOption((option) =>
                    option
                        .setName('file')
                        .setDescription('The audio file (MP3/WAV, max 10s)')
                        .setRequired(false),
                )
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('The name of the sound')
                        .setRequired(false)
                        .setMaxLength(32),
                )
                .addStringOption((option) =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji for the sound')
                        .setRequired(false),
                ),
        );

    context.registerCommand({
        data: data.toJSON(),
        execute: async (interaction: ChatInputCommandInteraction) => {
            if (!interaction.guild) return;

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'menu') {
                await handleMenuCommand(interaction, context);
            } else if (subcommand === 'play') {
                await handlePlayCommand(interaction, context);
            } else if (subcommand === 'ui') {
                await handleUICommand(interaction, context);
            } else if (subcommand === 'add') {
                await handleAddCommand(interaction, context);
            }
        },
    });
};

// ... (handleMenuCommand, handlePlayCommand, handleUICommand remain same)

async function handleMenuCommand(interaction: ChatInputCommandInteraction, context: PluginContext) {
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
        await interaction.reply({
            content: '🚫 You must be in a voice channel to use the soundboard!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Fetch sounds
    const sounds = ((await context.db.plugin.get('sounds')) as Sound[]) || [];

    if (sounds.length === 0) {
        await interaction.reply({
            content: '🔕 No sounds available. Add some via the dashboard!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const options = sounds.slice(0, 25).map((sound) => {
        // Simple heuristic: if emoji is short and alphanumeric, it's likely invalid text (e.g. "abc")
        // Unicode emojis are not alphanumeric. Custom emoji IDs are numeric but long.
        const isValid = !/^[a-zA-Z0-9]{1,10}$/.test(sound.emoji);
        return {
            label: sound.name,
            value: sound.id,
            emoji: isValid ? sound.emoji : '🔊',
            description: 'Click to play',
        };
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('soundboard_select')
            .setPlaceholder('Select a sound to play...')
            .addOptions(options),
    );

    const response = await interaction.reply({
        content: '🔊 **Jasper Soundboard**\nSelect a sound to play in your voice channel.',
        components: [row],
        flags: MessageFlags.Ephemeral,
    });

    // Handle Interaction
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
    });

    collector.on('collect', async (i) => {
        if (i.customId === 'soundboard_select') {
            const soundId = i.values[0];
            const sound = sounds.find((s) => s.id === soundId);

            if (sound) {
                await i.update({
                    content: `🔊 Playing **${sound.emoji} ${sound.name}**...`,
                    components: [row],
                });

                try {
                    await playSoundboardClip(
                        context,
                        soundId,
                        interaction.guildId!,
                        voiceChannel.id,
                        interaction.user.id,
                        interaction.channelId,
                    );
                } catch (err) {
                    context.logger.error(`Playback failed: ${err}`);
                    await i.followUp({
                        content: '❌ Failed to play sound.',
                        ephemeral: true,
                    });
                }
            }
        }
    });
}

async function handlePlayCommand(interaction: ChatInputCommandInteraction, context: PluginContext) {
    const soundId = interaction.options.getString('sound', true);
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
        await interaction.reply({
            content: '🚫 You must be in a voice channel to use the soundboard!',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Defer reply as playback might take a moment
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        await playSoundboardClip(
            context,
            soundId,
            interaction.guildId!,
            voiceChannel.id,
            interaction.user.id,
            interaction.channelId,
        );

        // Get sound details for the reply
        const sounds = ((await context.db.plugin.get('sounds')) as Sound[]) || [];
        const sound = sounds.find((s) => s.id === soundId);
        const soundName = sound ? `${sound.emoji} ${sound.name}` : 'Sound';

        await interaction.editReply({ content: `🔊 Playing **${soundName}**` });
    } catch (err) {
        context.logger.error(`Playback failed: ${err}`);
        await interaction.editReply({
            content: '❌ Failed to play sound. It might not exist or there was an error.',
        });
    }
}

async function handleUICommand(interaction: ChatInputCommandInteraction, context: PluginContext) {
    const sounds = ((await context.db.plugin.get('sounds')) as Sound[]) || [];

    if (sounds.length === 0) {
        await interaction.reply({
            content: '🔕 No sounds available.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Create buttons (max 5 per row, max 5 rows = 25 buttons)
    // We will take the top 25 sounds.
    const topSounds = sounds.slice(0, 25);
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < topSounds.length; i++) {
        const sound = topSounds[i];

        // Simple heuristic: if emoji is short and alphanumeric, it's likely invalid text (e.g. "abc")
        const isValid = !/^[a-zA-Z0-9]{1,10}$/.test(sound.emoji);
        const emojiToUse = isValid ? sound.emoji : '🔊';

        const button = new ButtonBuilder()
            .setCustomId(`soundboard_play_${sound.id}`)
            .setLabel(sound.name)
            .setEmoji(emojiToUse)
            .setStyle(ButtonStyle.Primary);

        currentRow.addComponents(button);

        if (currentRow.components.length === 5 || i === topSounds.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
        }
    }

    await interaction.reply({
        content: '🔊 **Jasper Soundboard**\nClick a button to play a sound!',
        components: rows,
    });
}

async function handleAddCommand(interaction: ChatInputCommandInteraction, context: PluginContext) {
    const file = interaction.options.getAttachment('file');
    const name = interaction.options.getString('name');
    const emoji = interaction.options.getString('emoji') || '🔊';

    // If arguments are missing, show the "UI" (Modal Flow)
    if (!file || !name) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId('soundboard_add_modal_btn')
                .setLabel('Open Sound Wizard')
                .setEmoji('✨')
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.reply({
            content:
                '👋 **Add a New Sound**\n\nTo add a sound quickly with custom emojis, use the command arguments:\n`/soundboard add file:[upload] name:[name] emoji:[emoji]`\n\nOr click the button below to use the interactive wizard (Note: Custom emojis are harder to use here).',
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Process direct command usage
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            await interaction.editReply('❌ File too large. Maximum size is 2MB.');
            return;
        }

        // Validate file type (audio/* or specific extensions)
        const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.amr', '.aac'];
        const isAudioType = file.contentType?.startsWith('audio/');
        const hasValidExtension = validExtensions.some((ext) =>
            file.name.toLowerCase().endsWith(ext),
        );

        if (!isAudioType && !hasValidExtension) {
            await interaction.editReply(
                `❌ Invalid file format. Supported formats: ${validExtensions.join(', ')}`,
            );
            return;
        }

        // Download file
        const response = await axios.get(file.url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Save to storage
        const filename = `${Date.now()}-${file.name}`;
        const uri = await context.storage.save(filename, buffer);

        // Add to DB
        const soundService = new SoundService(context);
        const newSound = await soundService.addSound(name, emoji, uri, interaction.user.id);

        await interaction.editReply(`✅ Sound **${emoji} ${name}** added successfully!`);

        // Public Announcement
        const playButton = new ButtonBuilder()
            .setCustomId(`soundboard_play_${newSound.id}`)
            .setLabel('Play')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(playButton);

        if (
            interaction.channel &&
            !interaction.channel.isDMBased() &&
            interaction.channel.isTextBased()
        ) {
            await interaction.channel.send({
                content: `🎉 **New Sound Added!**\n${emoji} **${name}** has been added to the soundboard by <@${interaction.user.id}>.`,
                components: [row],
            });
        }
    } catch (error) {
        context.logger.error(`Failed to add sound: ${error}`);
        await interaction.editReply('❌ Failed to add sound. Please try again.');
    }
}

export const handleAutocomplete = async (
    interaction: AutocompleteInteraction,
    context: PluginContext,
) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const sounds = ((await context.db.plugin.get('sounds')) as Sound[]) || [];

    const filtered = sounds.filter(
        (sound) =>
            sound.name.toLowerCase().includes(focusedValue) || sound.id.includes(focusedValue),
    );

    await interaction.respond(
        filtered.slice(0, 25).map((sound) => ({
            name: `${sound.emoji} ${sound.name}`,
            value: sound.id,
        })),
    );
};

const activeUsers = new Set<string>();

/**
 * Clear the active users rate-limiting set.
 * Called during plugin unload to prevent memory leaks.
 */
export function clearActiveUsers() {
    activeUsers.clear();
}

export const handleButtonInteraction = async (
    interaction: ButtonInteraction,
    context: PluginContext,
) => {
    // Handle Add Sound Wizard Button
    if (interaction.customId === 'soundboard_add_modal_btn') {
        const modal = new ModalBuilder()
            .setCustomId('soundboard_add_modal')
            .setTitle('Add New Sound');

        const nameInput = new TextInputBuilder()
            .setCustomId('sound_name')
            .setLabel('Sound Name')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(32)
            .setRequired(true);

        const emojiInput = new TextInputBuilder()
            .setCustomId('sound_emoji')
            .setLabel('Emoji (Paste one)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(4)
            .setPlaceholder('🔊')
            .setRequired(false);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(emojiInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
        return;
    }

    if (!interaction.customId.startsWith('soundboard_play_')) return;

    if (activeUsers.has(interaction.user.id)) {
        try {
            await interaction.reply({
                content: '⏳ Please wait for your previous sound to finish!',
                flags: MessageFlags.Ephemeral,
            });
        } catch (e) {
            context.logger.warn(`[Soundboard] Failed to reply to interaction: ${e}`);
        }
        return;
    }

    const soundId = interaction.customId.replace('soundboard_play_', '');
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
        try {
            await interaction.reply({
                content: '🚫 You must be in a voice channel!',
                flags: MessageFlags.Ephemeral,
            });
        } catch (e) {
            context.logger.warn(`[Soundboard] Failed to send 'not in voice' reply: ${e}`);
        }
        return;
    }

    activeUsers.add(interaction.user.id);

    // Defer update to acknowledge the button click immediately
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch (err) {
        activeUsers.delete(interaction.user.id);
        context.logger.warn(`[Soundboard] Failed to defer reply: ${err}`);
        return;
    }

    try {
        await playSoundboardClip(
            context,
            soundId,
            interaction.guildId!,
            voiceChannel.id,
            interaction.user.id,
            interaction.channelId,
        );

        const sounds = ((await context.db.plugin.get('sounds')) as Sound[]) || [];
        const sound = sounds.find((s) => s.id === soundId);
        const soundName = sound ? `${sound.emoji} ${sound.name}` : 'Sound';

        await interaction.editReply({ content: `🔊 Playing **${soundName}**` });
    } catch (err) {
        context.logger.error(`Playback failed: ${err}`);
        try {
            await interaction.editReply({ content: '❌ Failed to play sound.' });
        } catch (e) {
            context.logger.warn(`[Soundboard] Failed to send error reply: ${e}`);
        }
    } finally {
        // Add 1s buffer before allowing next click
        setTimeout(() => {
            activeUsers.delete(interaction.user.id);
        }, 1000);
    }
};

// Handle Modal Submit
export const handleModalSubmit = async (
    interaction: ModalSubmitInteraction,
    context: PluginContext,
) => {
    if (interaction.customId !== 'soundboard_add_modal') return;

    const name = interaction.fields.getTextInputValue('sound_name');
    const emoji = interaction.fields.getTextInputValue('sound_emoji') || '🔊';

    try {
        await interaction.reply({
            content: `✨ **Step 2/2**: Please upload the audio file for **${name}**.\nUpload the file in this channel and **mention me** (@${context.client.user?.username}).`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (e) {
        context.logger.warn(`[Soundboard] Failed to reply to modal: ${e}`);
        return;
    }

    // Check if channel supports message collection
    if (
        !interaction.channel ||
        !interaction.channel.isTextBased() ||
        interaction.channel.isDMBased()
    ) {
        try {
            await interaction.followUp({
                content: '❌ Cannot collect messages in this channel type.',
                flags: MessageFlags.Ephemeral,
            });
        } catch (e) {
            context.logger.warn(`[Soundboard] Failed to send 'collection error' reply: ${e}`);
        }
        return;
    }

    const filter = (m: any) =>
        m.author.id === interaction.user.id &&
        m.attachments.size > 0 &&
        m.mentions.has(context.client.user!.id);
    const collector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1,
    });

    if (!collector) return;

    collector.on('collect', async (m: any) => {
        const attachment = m.attachments.first();
        if (!attachment) return;

        // Validate file size (max 2MB)
        if (attachment.size > 2 * 1024 * 1024) {
            await interaction.followUp({
                content: '❌ File too large. Maximum size is 2MB.',
                flags: MessageFlags.Ephemeral,
            });
            // Try to delete the large file message
            try {
                await m.delete();
            } catch (e) {
                /* ignore */
            }
            return;
        }

        // Validate file type
        const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.amr', '.aac'];
        const isAudioType = attachment.contentType?.startsWith('audio/');
        const hasValidExtension = validExtensions.some((ext) =>
            attachment.name.toLowerCase().endsWith(ext),
        );

        if (!isAudioType && !hasValidExtension) {
            await interaction.followUp({
                content: `❌ Invalid file format. Supported formats: ${validExtensions.join(', ')}`,
                flags: MessageFlags.Ephemeral,
            });
            try {
                await m.delete();
            } catch (e) {
                /* ignore */
            }
            return;
        }

        try {
            // Download file
            const response = await axios.get(attachment.url, {
                responseType: 'arraybuffer',
            });
            const buffer = Buffer.from(response.data);

            // Save to storage
            const filename = `${Date.now()}-${attachment.name}`;
            const uri = await context.storage.save(filename, buffer);

            // Add to DB
            const soundService = new SoundService(context);
            await soundService.addSound(name, emoji, uri, interaction.user.id);

            await interaction.followUp({
                content: `✅ Sound **${emoji} ${name}** added successfully!`,
                flags: MessageFlags.Ephemeral,
            });

            // Try to delete the user's message to keep chat clean
            try {
                await m.delete();
            } catch (e) {
                /* ignore */
            }

            // Stop collector
            collector.stop('success');
        } catch (error) {
            context.logger.error(`Failed to add sound via wizard: ${error}`);
            await interaction.followUp({
                content: '❌ Failed to save sound.',
                flags: MessageFlags.Ephemeral,
            });
        }
    });

    collector.on('end', (collected: any, reason: string) => {
        if (reason === 'time' && collected.size === 0) {
            interaction
                .followUp({
                    content: '❌ Timed out waiting for file upload.',
                    flags: MessageFlags.Ephemeral,
                })
                .catch(() => {
                    /* ignore */
                });
        }
    });
};
