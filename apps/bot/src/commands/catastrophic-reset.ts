import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

import logger from '../core/logger.js';
import musicPlayer from '../core/music-player.js';
import workerPool from '../core/worker-pool.js';

export default {
    data: new SlashCommandBuilder()
        .setName('catastrophic-reset')
        .setDescription('🚨 Emergency: Clear all queues and reset all bots to idle in this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        logger.info(`[catastrophicreset] Initiated by ${interaction.user.tag}`);

        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                content: '🚫 **Access Denied**: This command can only be executed in a server.',
                ephemeral: true,
            });
            return;
        }

        // Authorization check: User must have ManageGuild or Administrator
        const memberPermissions = interaction.memberPermissions;
        const isAuthorized =
            memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
            memberPermissions?.has(PermissionFlagsBits.Administrator);

        if (!isAuthorized) {
            logger.warn(
                `[catastrophicreset] Unauthorized reset attempt by ${interaction.user.id} in guild ${guildId}`,
            );
            await interaction.reply({
                content:
                    '🚫 **Permission Denied**: You need `Manage Server` permission to perform a catastrophic reset.',
                ephemeral: true,
            });
            return;
        }

        // 1. Clear queues and voice connections strictly for this guild
        musicPlayer.clearGuildQueues(guildId);

        // 2. Release any remaining worker leases for this guild
        const activeLeases = workerPool.getLeases(guildId);
        for (const lease of activeLeases) {
            workerPool.releaseWorker(lease.voiceChannelId, {
                guildId,
                installationId: lease.installationId,
                generation: lease.generation,
            });
        }

        await interaction.reply({
            content:
                '🔥 **CATASTROPHIC RESET COMPLETE**\n' +
                '✅ Server queues cleared\n' +
                '✅ Bot voice connections disconnected\n' +
                '✅ Server workers reset to idle\n' +
                '✅ Voice statuses cleared',
            ephemeral: false,
        });

        logger.info(`[catastrophicreset] Reset complete for guild ${guildId}`);
    },
};
