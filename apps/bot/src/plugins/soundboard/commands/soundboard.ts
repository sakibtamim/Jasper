import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
    SlashCommandBuilder,
    AutocompleteInteraction,
    ButtonInteraction
} from "discord.js";
import { PluginContext } from "@jasper/types";
import { Sound } from "../types.js";
import { playSoundboardClip } from "../services/playback.js";

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
            }
        },
    });
};

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
