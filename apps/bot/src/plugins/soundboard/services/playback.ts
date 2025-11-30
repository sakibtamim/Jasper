import { PluginContext } from "../../../core/plugins/plugin-interface.js";
import { Sound, Play } from "../types.js";
import { randomUUID } from "crypto";

/**
 * Play a soundboard clip using the new core playAudio API
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

    // 3. Use core playAudio API
    try {
        await context.playAudio({
            voiceChannelId,
            guildId,
            audioPath: fsPath,
            title: `${sound.emoji} ${sound.name}`,
            requesterId: userId
        });

        logger.info(`Played soundboard clip: ${sound.name}`);
    } catch (err) {
        logger.error(`Failed to play sound: ${err}`);
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
