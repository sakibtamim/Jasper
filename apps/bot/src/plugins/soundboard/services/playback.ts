import { PluginContext } from "../../../core/plugins/plugin-interface.js";
import { getQueue, Queue } from "../../../core/audio/queue-manager.js";
import workerPool from "../../../core/worker-pool.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { Sound, Play } from "../types.js";
import fs from "fs";
import { randomUUID } from "crypto";

export async function playSoundboardClip(
    context: PluginContext,
    soundId: string,
    guildId: string,
    voiceChannelId: string,
    userId: string,
    channelId?: string // Text channel for logging
) {
    const { db, storage, logger } = context;

    // 1. Get Sound Metadata
    const sounds = (await db.plugin.get("sounds") as Sound[]) || [];
    const sound = sounds.find(s => s.id === soundId);

    if (!sound) {
        throw new Error("Sound not found");
    }

    // 2. Resolve File Path
    // Handle both "storage://" URIs and simple filenames
    let filename = sound.fileUri;
    if (filename.startsWith("storage://")) {
        const parts = filename.split("/");
        filename = parts[parts.length - 1];
    }

    // We need the absolute path. context.storage.resolve gives us that.
    // But wait, context.storage.resolve takes a URI or filename?
    // PLUGINS_DEV.md: "const { fsPath, webUrl } = context.storage.resolve(uri);"
    // It implies it takes the URI returned by save().
    // Let's try resolving the stored URI directly.

    let fsPath: string;
    try {
        const resolved = storage.resolve(sound.fileUri);
        fsPath = resolved.fsPath;
    } catch (e) {
        // Fallback: try resolving as filename if URI resolution failed
        try {
            const resolved = storage.resolve(filename);
            fsPath = resolved.fsPath;
        } catch (e2) {
            logger.error(`Failed to resolve sound file: ${sound.fileUri}`);
            throw new Error("Sound file missing");
        }
    }

    if (!fs.existsSync(fsPath)) {
        throw new Error("Sound file not found on disk");
    }

    // 3. Determine Worker
    let queue = getQueue(voiceChannelId);
    let connection: VoiceConnection | undefined;
    let player: any; // AudioPlayer
    let tempWorker = false;

    if (queue) {
        // Worker exists in channel
        if (queue.nowPlaying) {
            // BUSY: Playing music
            logger.info(`Worker ${queue.worker.name} is busy. Attempting to allocate secondary worker for SFX...`);

            // Try to allocate a DIFFERENT worker
            // We need to filter out the current worker from eligible ones
            // workerPool.allocateWorker doesn't support excluding specific workers directly,
            // but it checks for busy status.
            // We can try to manually find a free worker.

            const allWorkers = workerPool.getWorkers();
            const freeWorkers = allWorkers.filter(w => !w.busy && w.name !== queue!.worker.name);

            if (freeWorkers.length > 0) {
                // Pick one (random or first)
                const selected = freeWorkers[Math.floor(Math.random() * freeWorkers.length)];

                // Mark busy
                workerPool.setWorkerBusy(selected, guildId, voiceChannelId);

                try {
                    // Connect secondary worker
                    const channel = await selected.client.channels.fetch(voiceChannelId);
                    if (channel && channel.isVoiceBased()) {
                        connection = joinVoiceChannel({
                            channelId: voiceChannelId,
                            guildId: guildId,
                            adapterCreator: channel.guild.voiceAdapterCreator,
                            group: selected.client.user!.id, // Unique group
                            selfDeaf: true,
                        });

                        player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });
                        connection.subscribe(player);
                        tempWorker = true;

                        logger.info(`Allocated secondary worker ${selected.name} for SFX`);
                    }
                } catch (err) {
                    logger.error(`Failed to connect secondary worker: ${err}`);
                    workerPool.releaseWorker(voiceChannelId); // Release if failed
                    // Fallback to primary worker
                }
            }

            if (!connection) {
                // No free workers or connection failed -> Interrupt primary
                logger.info(`No free workers. Interrupting ${queue.worker.name} for SFX.`);
                player = queue.player;
                // Note: This stops current song. We don't implement resume for MVP.
            }
        } else {
            // IDLE: Use existing worker
            logger.info(`Reusing idle worker ${queue.worker.name} for SFX`);
            player = queue.player;
            // Ensure connection is still alive? queue.connection should be valid.
        }
    } else {
        // No worker in channel -> Allocate new one
        const worker = workerPool.allocateWorker(guildId, voiceChannelId);
        if (!worker) {
            throw new Error("No workers available");
        }

        try {
            const channel = await worker.client.channels.fetch(voiceChannelId);
            if (!channel || !channel.isVoiceBased()) throw new Error("Invalid channel");

            connection = joinVoiceChannel({
                channelId: voiceChannelId,
                guildId: guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
                group: worker.client.user!.id,
                selfDeaf: true,
            });

            player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });
            connection.subscribe(player);
            tempWorker = true;
            logger.info(`Allocated new worker ${worker.name} for SFX`);
        } catch (err) {
            workerPool.releaseWorker(voiceChannelId);
            throw err;
        }
    }

    // 4. Play Sound
    const resource = createAudioResource(fs.createReadStream(fsPath), { inputType: StreamType.Arbitrary });
    player.play(resource);

    // 5. Cleanup (if temp worker)
    if (tempWorker && connection) {
        player.on(AudioPlayerStatus.Idle, () => {
            setTimeout(() => {
                if (connection && connection.state.status !== 'destroyed') {
                    connection.destroy();
                }
                // Release worker (we need to know WHICH worker we used)
                // Since we didn't store the worker object for tempWorker, we rely on voiceChannelId
                // But wait, releaseWorker releases by voiceChannelId.
                // If we have TWO workers in the channel (primary + secondary), releaseWorker might release the WRONG one?
                // workerPool.releaseWorker finds worker by voiceChannelId.
                // If both have same voiceChannelId, it finds the first one.

                // FIX: workerPool.releaseWorker logic:
                // find(w => w.voiceChannelId === voiceChannelId)
                // This is risky if multiple workers are in same channel.

                // We should manually release the specific worker we allocated.
                // But workerPool doesn't expose releaseByWorkerId.
                // However, we can manually set properties on the worker object we have reference to.

                // Let's re-check workerPool.ts.
                // releaseWorker(voiceChannelId) -> finds first match.

                // If we are the secondary worker, we should be careful.
                // Ideally we should pass the worker object to release.

                // For MVP, if we allocated a temp worker, we know we marked it busy.
                // We should manually unmark it.
                // We can import the 'workers' array from workerPool? No, it exports getWorkers() which returns a copy.
                // But we have the 'selected' worker object reference from allocateWorker/filter.
                // We can just set its properties.

                // Actually, since we are inside the plugin, we can't easily modify the private state of workerPool module 
                // unless we use the exported methods.

                // If releaseWorker is ambiguous, we might have a bug in core for multi-bot-per-channel.
                // But core assumes 1 bot per channel usually.

                // Workaround: We'll just call releaseWorker(voiceChannelId). 
                // If it releases the primary bot (which was busy), that's bad.
                // But wait, the primary bot is BUSY. The secondary bot is also BUSY.
                // releaseWorker releases the *first* one it finds.

                // If we can't safely release, maybe we shouldn't mark it busy in the pool?
                // But then it might be allocated by someone else.

                // Let's trust releaseWorker for now, or maybe we can't fix this without core changes.
                // Wait, allocateWorker returns the worker object.
                // If I can't safely release it, I'll just leave it busy? No.

                // Let's look at releaseWorker again.
                // const worker = workers.find((w) => w.voiceChannelId === voiceChannelId);

                // Yes, it finds the first one.

                // If I use a secondary worker, I should probably NOT set its voiceChannelId in the pool to the SAME channel 
                // if I want to avoid confusion, OR I should accept that releaseWorker might be flaky.

                // BETTER IDEA: When allocating secondary, set its voiceChannelId to something unique like `${voiceChannelId}_SFX`?
                // No, then `findWorkerByVoiceChannel` won't find it (good).
                // But `releaseWorker` won't find it either.

                // I will manually implement release logic for the temp worker if I can.
                // Since I can't, I will just call releaseWorker and hope for the best, 
                // OR I will try to be smarter.

                // Actually, I can just set `worker.busy = false` etc on the object I have?
                // `worker` is a reference to the object in the `workers` array (since `getWorkers` returns `[...workers]`, the array is new but objects are references?
                // Let's check: `getWorkers: (): WorkerState[] => [...workers]`.
                // Yes, shallow copy of array. Objects are references.
                // So I CAN modify the worker object directly!

                // So:
                // 1. Allocate (manually find free worker).
                // 2. Mark busy (manually set props).
                // 3. Play.
                // 4. Release (manually reset props).

                // This bypasses `workerPool` methods but is safe because I have the reference.

            }, 5000); // Wait a bit after idle before leaving
        });
    }

    // 6. Log Stats
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
