import logger from "../logger.js";

export async function validateInteraction(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        await interaction.reply({
            content: "You must be in a voice channel.",
            ephemeral: true,
        });
        return null;
    }
    return voiceChannel;
}

export async function setVoiceStatus(client, channelId, status) {
    if (!channelId) return;

    try {
        // Truncate to 500 chars just in case
        const safeStatus = status.substring(0, 500);

        // Use Raw API: /channels/{id}/voice-status
        await client.rest.put(`/channels/${channelId}/voice-status`, {
            body: { status: safeStatus },
        });
    } catch (error) {
        logger.warn(`Failed to set voice channel status: ${error.message}`);
    }
}

export async function getChannelName(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        return channel ? channel.name : "unknown channel";
    } catch {
        return "unknown channel";
    }
}

export function formatDuration(seconds) {
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
