import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import musicPlayer from '../core/music-player.js';
import workerPool from '../core/worker-pool.js';

export default {
    data: new SlashCommandBuilder()
        .setName('music-status')
        .setDescription('Shows which HCoF cats are currently playing music and where.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const workers = workerPool.getWorkers();
        const controller = workerPool.getController();
        const queues = musicPlayer.getQueues();
        const guildId = interaction.guildId;

        if (!guildId) {
            await interaction.reply({
                content: '🚫 **Access Denied**: This command can only be executed in a server.',
                ephemeral: true,
            });
            return;
        }

        const activeLines: string[] = [];
        const idleLines: string[] = [];

        // Helper: get track info from queue
        const getTrackInfo = (voiceChannelId: string) => {
            const queue = queues.get(voiceChannelId);
            if (!queue || !queue.nowPlaying) return '—';
            return queue.nowPlaying.title || 'Unknown Track';
        };

        // Combine cats without duplicating the controller
        const allCats = controller
            ? [controller, ...workers.filter((w) => w.name !== controller.name)]
            : workers;

        for (const cat of allCats) {
            let voiceChannelId: string | null = null;
            if (guildId && cat.leases?.has(guildId)) {
                voiceChannelId = cat.leases.get(guildId)!.voiceChannelId;
            } else if (guildId && cat.guildId === guildId && cat.voiceChannelId) {
                voiceChannelId = cat.voiceChannelId;
            } else if (!guildId && cat.busy && cat.voiceChannelId) {
                voiceChannelId = cat.voiceChannelId;
            }

            if (voiceChannelId) {
                const track = getTrackInfo(voiceChannelId);
                activeLines.push(`**${cat.name}** → <#${voiceChannelId}>\n🎵 *${track}*`);
            } else {
                idleLines.push(`**${cat.name}**`);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0xffc857)
            .setTitle('🐾 Heavenly Council of Fur — Music Cluster Status')
            .addFields(
                {
                    name: '🎧 Active Sessions',
                    value:
                        activeLines.length > 0
                            ? activeLines.join('\n\n')
                            : 'No cats are currently playing music.',
                },
                {
                    name: '🌙 Idle Cats',
                    value: idleLines.length > 0 ? idleLines.join('\n') : 'None',
                },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};
