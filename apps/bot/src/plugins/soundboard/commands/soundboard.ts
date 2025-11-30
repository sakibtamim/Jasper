import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    AutocompleteInteraction,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction
} from "discord.js";
import { PluginContext } from "@jasper/types";
import { Sound } from "../types.js";
import { playSoundboardClip } from "../services/playback.js";
import { SoundService } from "../services/sound-service.js";
import axios from "axios";

export const registerCommand = (context: PluginContext) => {
    const data = new SlashCommandBuilder()
        .setName("soundboard")
        .setDescription("Jasper Soundboard System")
        .addSubcommand(sub =>
            sub
                .setName("menu")
                .setDescription("Open the soundboard selection menu (Ephemeral)")
        )
        .addSubcommand(sub =>
            sub
                .setName("play")
                .setDescription("Play a specific sound")
                .addStringOption(option =>
                    option
                        .setName("sound")
                        .setDescription("The sound to play")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("ui")
                .setDescription("Post a permanent soundboard UI in this channel")
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Add a new sound to the soundboard")
                .addAttachmentOption(option =>
                    option
                        .setName("file")
                        .setDescription("The audio file (MP3/WAV, max 10s)")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("The name of the sound")
                        .setRequired(false)
                        .setMaxLength(32)
                )
                .addStringOption(option =>
                    option
                        .setName("emoji")
                        .setDescription("The emoji for the sound")
                        .setRequired(false)
                )
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
        await interaction.reply({ content: "🚫 You must be in a voice channel to use the soundboard!", ephemeral: true });
        return;
    }

    // Fetch sounds
    const sounds = (await context.db.plugin.get("sounds") as Sound[]) || [];

    if (sounds.length === 0) {
        await interaction.reply({ content: "🔕 No sounds available. Add some via the dashboard!", ephemeral: true });
        return;
    }

    const options = sounds.slice(0, 25).map(sound => ({
        label: sound.name,
        value: sound.id,
        emoji: sound.emoji,
        description: "Click to play"
    }));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('soundboard_select')
                .setPlaceholder('Select a sound to play...')
                .addOptions(options)
        );

    const response = await interaction.reply({
        content: "🔊 **Jasper Soundboard**\nSelect a sound to play in your voice channel.",
        components: [row],
        ephemeral: true
    });

    // Handle Interaction
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.customId === 'soundboard_select') {
            const soundId = i.values[0];
            const sound = sounds.find(s => s.id === soundId);

            if (sound) {
                await i.update({ content: `🔊 Playing **${sound.emoji} ${sound.name}**...`, components: [row] });

                try {
                    await playSoundboardClip(
                        context,
                        soundId,
                        interaction.guildId!,
                        voiceChannel.id,
                        interaction.user.id,
                        interaction.channelId
                    );
                } catch (err) {
                    context.logger.error(`Playback failed: ${err}`);
                    await i.followUp({ content: "❌ Failed to play sound.", ephemeral: true });
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
        await interaction.reply({ content: "🚫 You must be in a voice channel to use the soundboard!", ephemeral: true });
        return;
    }

    // Defer reply as playback might take a moment
    await interaction.deferReply({ ephemeral: true });

    try {
        await playSoundboardClip(
            context,
            soundId,
            interaction.guildId!,
            voiceChannel.id,
            interaction.user.id,
            interaction.channelId
        );

        // Get sound details for the reply
        const sounds = (await context.db.plugin.get("sounds") as Sound[]) || [];
        const sound = sounds.find(s => s.id === soundId);
        const soundName = sound ? `${sound.emoji} ${sound.name}` : "Sound";

        await interaction.editReply({ content: `🔊 Playing **${soundName}**` });
    } catch (err) {
        context.logger.error(`Playback failed: ${err}`);
        await interaction.editReply({ content: "❌ Failed to play sound. It might not exist or there was an error." });
    }
}

async function handleUICommand(interaction: ChatInputCommandInteraction, context: PluginContext) {
    const sounds = (await context.db.plugin.get("sounds") as Sound[]) || [];

    if (sounds.length === 0) {
        await interaction.reply({ content: "🔕 No sounds available.", ephemeral: true });
        return;
    }

    // Create buttons (max 5 per row, max 5 rows = 25 buttons)
    // We will take the top 25 sounds.
    const topSounds = sounds.slice(0, 25);
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < topSounds.length; i++) {
        const sound = topSounds[i];
        const button = new ButtonBuilder()
            .setCustomId(`soundboard_play_${sound.id}`)
            .setLabel(sound.name)
            .setEmoji(sound.emoji)
            .setStyle(ButtonStyle.Primary);

        currentRow.addComponents(button);

        if (currentRow.components.length === 5 || i === topSounds.length - 1) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
        }
    }

    await interaction.reply({
        content: "🔊 **Jasper Soundboard**\nClick a button to play a sound!",
        components: rows
    });
}

async function handleAddCommand(interaction: ChatInputCommandInteraction, context: PluginContext) {
    const file = interaction.options.getAttachment('file');
    const name = interaction.options.getString('name');
    const emoji = interaction.options.getString('emoji') || '🔊';

    // If arguments are missing, show the "UI" (Modal Flow)
    if (!file || !name) {
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('soundboard_add_modal_btn')
                    .setLabel('Open Sound Wizard')
                    .setEmoji('✨')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            content: "👋 **Add a New Sound**\n\nTo add a sound quickly with custom emojis, use the command arguments:\n`/soundboard add file:[upload] name:[name] emoji:[emoji]`\n\nOr click the button below to use the interactive wizard (Note: Custom emojis are harder to use here).",
            components: [row],
            ephemeral: true
        });
        return;
    }

    // Process direct command usage
    await interaction.deferReply({ ephemeral: true });

    try {
        // Validate file type
        if (!file.contentType?.startsWith('audio/')) {
            await interaction.editReply("❌ Please upload a valid audio file (MP3/WAV).");
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
        await soundService.addSound(name, emoji, uri, interaction.user.id);

        await interaction.editReply(`✅ Sound **${emoji} ${name}** added successfully!`);
    } catch (error) {
        context.logger.error(`Failed to add sound: ${error}`);
        await interaction.editReply("❌ Failed to add sound. Please try again.");
    }
}

export const handleAutocomplete = async (interaction: AutocompleteInteraction, context: PluginContext) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const sounds = (await context.db.plugin.get("sounds") as Sound[]) || [];

    const filtered = sounds.filter(sound =>
        sound.name.toLowerCase().includes(focusedValue) ||
        sound.id.includes(focusedValue)
    );

    await interaction.respond(
        filtered.slice(0, 25).map(sound => ({ name: `${sound.emoji} ${sound.name}`, value: sound.id }))
    );
};

const activeUsers = new Set<string>();

export const handleButtonInteraction = async (interaction: ButtonInteraction, context: PluginContext) => {
    // Handle Add Sound Wizard Button
    if (interaction.customId === 'soundboard_add_modal_btn') {
        const modal = new ModalBuilder()
            .setCustomId('soundboard_add_modal')
            .setTitle('Add New Sound');

        const nameInput = new TextInputBuilder()
            .setCustomId('sound_name')
            .setLabel("Sound Name")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(32)
            .setRequired(true);

        const emojiInput = new TextInputBuilder()
            .setCustomId('sound_emoji')
            .setLabel("Emoji (Paste one)")
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
        await interaction.reply({ content: "⏳ Please wait for your previous sound to finish!", ephemeral: true });
        return;
    }

    const soundId = interaction.customId.replace('soundboard_play_', '');
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
        await interaction.reply({ content: "🚫 You must be in a voice channel!", ephemeral: true });
        return;
    }

    activeUsers.add(interaction.user.id);

    // Defer update to acknowledge the button click immediately
    await interaction.deferReply({ ephemeral: true });

    try {
        await playSoundboardClip(
            context,
            soundId,
            interaction.guildId!,
            voiceChannel.id,
            interaction.user.id,
            interaction.channelId
        );

        const sounds = (await context.db.plugin.get("sounds") as Sound[]) || [];
        const sound = sounds.find(s => s.id === soundId);
        const soundName = sound ? `${sound.emoji} ${sound.name}` : "Sound";

        await interaction.editReply({ content: `🔊 Playing **${soundName}**` });
    } catch (err) {
        context.logger.error(`Playback failed: ${err}`);
        await interaction.editReply({ content: "❌ Failed to play sound." });
    } finally {
        // Add 1s buffer before allowing next click
        setTimeout(() => {
            activeUsers.delete(interaction.user.id);
        }, 1000);
    }
};

// Handle Modal Submit
export const handleModalSubmit = async (interaction: ModalSubmitInteraction, context: PluginContext) => {
    if (interaction.customId !== 'soundboard_add_modal') return;

    const name = interaction.fields.getTextInputValue('sound_name');
    const emoji = interaction.fields.getTextInputValue('sound_emoji') || '🔊';

    await interaction.reply({
        content: `✨ **Step 2/2**: Please upload the audio file for **${name}**.\nReply to this message with the MP3/WAV file attachment.`,
        ephemeral: true
    });

    // Check if channel supports message collection
    if (!interaction.channel || !interaction.channel.isTextBased() || interaction.channel.isDMBased()) {
        await interaction.followUp({ content: "❌ Cannot collect messages in this channel type.", ephemeral: true });
        return;
    }

    const filter = (m: any) => m.author.id === interaction.user.id && m.attachments.size > 0;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    if (!collector) return;

    collector.on('collect', async (m: any) => {
        const attachment = m.attachments.first();
        if (!attachment) return;

        if (!attachment.contentType?.startsWith('audio/')) {
            await interaction.followUp({ content: "❌ Invalid file type. Please try again with an audio file.", ephemeral: true });
            return;
        }

        try {
            // Download file
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            // Save to storage
            const filename = `${Date.now()}-${attachment.name}`;
            const uri = await context.storage.save(filename, buffer);

            // Add to DB
            const soundService = new SoundService(context);
            await soundService.addSound(name, emoji, uri, interaction.user.id);

            await interaction.followUp({ content: `✅ Sound **${emoji} ${name}** added successfully!`, ephemeral: true });

            // Try to delete the user's message to keep chat clean
            try { await m.delete(); } catch (e) { }

        } catch (error) {
            context.logger.error(`Failed to add sound via wizard: ${error}`);
            await interaction.followUp({ content: "❌ Failed to save sound.", ephemeral: true });
        }
    });

    collector.on('end', (collected: any, reason: string) => {
        if (reason === 'time' && collected.size === 0) {
            interaction.followUp({ content: "❌ Timed out waiting for file upload.", ephemeral: true }).catch(() => { });
        }
    });
};
