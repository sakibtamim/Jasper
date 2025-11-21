import { Client, VoiceBasedChannel, ChatInputCommandInteraction, GuildMember } from "discord.js";
import logger from "../logger.js";

export async function validateInteraction(interaction: ChatInputCommandInteraction): Promise<VoiceBasedChannel | null> {
    const member = interaction.member;
    if (!(member instanceof GuildMember)) {
        await interaction.reply({
            content: "This command can only be used in a guild.",
            ephemeral: true,
        });
        return null;
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
        await interaction.reply({
            content: "You must be in a voice channel.",
            ephemeral: true,
        });
        return null;
    }
    return voiceChannel;
}

export async function setVoiceStatus(client: Client, channelId: string, status: string): Promise<void> {
    if (!channelId) return;

    try {
        // Truncate to 500 chars just in case
        const safeStatus = status.substring(0, 500);

        // Use Raw API: /channels/{id}/voice-status
        await client.rest.put(`/channels/${channelId}/voice-status`, {
            body: { status: safeStatus },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to set voice channel status: ${message}`);
    }
}

export async function getChannelName(client: Client, channelId: string): Promise<string> {
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && 'name' in channel) {
            return channel.name ?? "unknown channel";
        }
        return "unknown channel";
    } catch {
        return "unknown channel";
    }
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s
            .toString()
            .padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
}
