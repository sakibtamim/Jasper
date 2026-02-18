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

        const activeLines: string[] = [];
        const idleLines: string[] = [];

        // Helper: get track info from queue
        const getTrackInfo = (voiceChannelId: string) => {
            const queue = queues.get(voiceChannelId);
            if (!queue || !queue.nowPlaying) return '—';
            return queue.nowPlaying.title || 'Unknown Track';
        };

        // Controller status
        if (controller) {
            if (controller.busy && controller.voiceChannelId) {
                const track = getTrackInfo(controller.voiceChannelId);
                activeLines.push(
                    `**${controller.name}** → <#${controller.voiceChannelId}>\n🎵 *${track}*`,
                );
            } else {
                idleLines.push(`**${controller.name}**`);
            }
        }

        // Worker statuses
        for (const worker of workers) {
            if (worker.busy && worker.voiceChannelId) {
                const track = getTrackInfo(worker.voiceChannelId);
                activeLines.push(`**${worker.name}** → <#${worker.voiceChannelId}>\n🎵 *${track}*`);
            } else {
                idleLines.push(`**${worker.name}**`);
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
