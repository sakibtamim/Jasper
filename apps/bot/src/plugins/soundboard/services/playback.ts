import { PluginContext } from "../../../core/plugins/plugin-interface.js";
import { Sound, Play } from "../types.js";
import { randomUUID } from "crypto";
import { getQueue } from "../../../core/audio/queue-manager.js";
import { createAudioResource, StreamType } from "@discordjs/voice";
import fs from "fs";

/**
 * Ultra-simple soundboard playback - if queue exists, play sound directly on that worker
 * This is the simplest possible implementation
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

    // 2. Validate and resolve file
    let fileUri = sound.fileUri;

    if (typeof fileUri !== 'string') {
        logger.error(`Invalid fileUri type for sound ${soundId}: ${typeof fileUri}`);
        throw new Error("Invalid sound data - please delete this sound and re-upload it");
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

    if (!fs.existsSync(fsPath)) {
        throw new Error("Sound file does not exist on disk");
    }

    // 3. Get existing queue (user must already be in a voice channel with the bot)
    const queue = getQueue(voiceChannelId);

    if (!queue) {
        throw new Error("No active music session. Please use /play first to start a session, then use /soundboard");
    }

    // 4. Play sound directly on the existing player
    try {
        const resource = createAudioResource(fs.createReadStream(fsPath), {
            inputType: StreamType.Arbitrary
        });

        queue.player.play(resource);
        logger.info(`Playing soundboard clip: ${sound.name} in ${voiceChannelId}`);
    } catch (err) {
        logger.error(`Failed to play sound: ${err}`);
        throw new Error("Failed to play sound effect");
    }

    // 5. Log Stats
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
