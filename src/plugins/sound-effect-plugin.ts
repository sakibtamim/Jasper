import { Plugin, PluginContext, QueueCreateData, SongPlayData } from "../core/plugins/plugin-interface.js";
import logger from "../core/logger.js";
import { createAudioResource, StreamType } from "@discordjs/voice";
import fs from "fs";
import path from "path";

const SoundEffectPlugin: Plugin = {
    name: "Sound Effect Plugin",
    version: "1.0.0",
    description: "Plays a sound effect when the bot joins a channel.",

    onLoad: async (context: PluginContext) => {
        logger.info("[SoundEffectPlugin] Loaded!");

        // Hook: QUEUE_CREATE
        context.on<QueueCreateData>('QUEUE_CREATE', async ({ queue }) => {
            logger.info(`[SoundEffectPlugin] Queue created in ${queue.voiceChannelId}. Playing hello sound...`);

            // In a real scenario, we would stream a file. 
            // For this test, we'll just log, as we don't have a guaranteed sound file.
            // If we had one:
            // const resource = createAudioResource(fs.createReadStream('hello.mp3'));
            // queue.player.play(resource);
        });

        // Hook: PRE_MUSIC_PLAY
        context.on<SongPlayData>('PRE_MUSIC_PLAY', ({ song }) => {
            logger.info(`[SoundEffectPlugin] About to play: ${song.title}`);
        });

        // Hook: POST_MUSIC_PLAY
        context.on<SongPlayData>('POST_MUSIC_PLAY', ({ song }) => {
            logger.info(`[SoundEffectPlugin] Started playing: ${song.title}`);
        });

        // Register a test command
        context.registerCommand({
            data: {
                name: "ping-plugin",
                description: "Replies with Pong from the plugin!",
            },
            execute: async (interaction: any) => {
                await interaction.reply("Pong! 🏓 (from SoundEffectPlugin)");
            },
        });
    },

    onUnload: async () => {
        logger.info("[SoundEffectPlugin] Unloaded!");
    }
};

export default SoundEffectPlugin;
