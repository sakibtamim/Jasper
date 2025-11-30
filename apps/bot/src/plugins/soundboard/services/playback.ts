import { PluginContext } from "../../../core/plugins/plugin-interface.js";
import { Sound, Play } from "../types.js";
import { randomUUID } from "crypto";
import musicPlayer from "../../../core/music-player.js";

/**
 * Simple soundboard playback - enqueue the sound file like a regular song
 */
export async function playSoundboardClip(
    context: PluginContext,
    soundId: string,
    guildId: string,
    voiceChannelId: string,
    userId: string,
    channelId?: string
) {
    const { db, storage, logger } = context;

    // 1. Get Sound Metadata
    const sounds = (await db.plugin.get("sounds") as Sound[]) || [];
    const sound = sounds.find(s => s.id === soundId);

    if (!sound) {
        throw new Error("Sound not found");
    }

    // 2. Resolve File Path
    let fileUri = sound.fileUri;

    // Validate it's a string
    if (typeof fileUri !== 'string') {
        logger.error(`Invalid fileUri type for sound ${soundId}: ${typeof fileUri}`);
        throw new Error("Invalid sound data - please delete and re-upload");
    }

    // Extract filename if it's a storage:// URI
    let filename = fileUri;
    if (filename.startsWith("storage://")) {
        const parts = filename.split("/");
        filename = parts[parts.length - 1];
    }

    // Resolve to absolute path
    let fsPath: string;
    try {
        const resolved = storage.resolve(fileUri);
        fsPath = resolved.fsPath;
    } catch (e) {
        logger.error(`Failed to resolve sound file: ${fileUri}`);
        throw new Error("Sound file not found");
    }

    // 3. Enqueue sound as a "song"
    const soundAsSong = {
        title: `${sound.emoji} ${sound.name}`,
        url: fsPath,
        requesterId: userId,
        duration: 0, // Unknown duration
        thumbnail: "", // No thumbnail
        fromSearch: false,
    };

    try {
        // Use the enqueue function from music player
        await musicPlayer.enqueue(guildId, voiceChannelId, soundAsSong);
        logger.info(`Enqueued sound: ${sound.name}`);
    } catch (err) {
        logger.error(`Failed to enqueue sound: ${err}`);
        throw err;
    }

    // 4. Log Stats
    const playRecord: Play = {
        id: randomUUID(),
        soundId: sound.id,
        soundNameSnapshot: sound.name,
        emojiSnapshot: sound.emoji,
        userId: userId,
        guildId: guildId,
        channelId: channelId || null,
        voiceChannelId: voiceChannelId,
        playedAt: Date.now()
    };

    const plays = (await db.plugin.get("plays") as Play[]) || [];
    plays.push(playRecord);
    await db.plugin.set("plays", plays);
}
