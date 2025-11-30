import { ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } from "discord.js";
import { PluginContext } from "../../../core/plugins/plugin-interface.js";
import { Sound } from "../types.js";
import { playSoundboardClip } from "../services/playback.js";

export const registerCommand = (context: PluginContext) => {
    context.registerCommand({
        data: {
            name: "soundboard",
            description: "Open the Jasper Soundboard",
        },
        execute: async (interaction: ChatInputCommandInteraction) => {
            if (!interaction.guild) return;

            const member = interaction.guild.members.cache.get(interaction.user.id);
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

            // Create UI
            // We'll use buttons for the first 25 sounds (5x5 grid max per message, but actually 5 buttons per row * 5 rows = 25)
            // If more, we might need pagination or a select menu.
            // For MVP, let's use a Select Menu if > 25, or just show top 25.
            // Or better: A select menu is cleaner for many sounds.
            // Let's use a StringSelectMenu.

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
        },
    });
};
