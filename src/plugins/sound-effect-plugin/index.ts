import { Plugin, PluginContext, QueueCreateData, SongPlayData } from "../../core/plugins/plugin-interface.js";
import logger from "../../core/logger.js";
import { createAudioResource, StreamType } from "@discordjs/voice";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SoundEffectPlugin: Plugin = {
    name: "Sound Effect Plugin",
    version: "1.0.0",
    description: "Plays a sound effect when the bot joins a channel.",

    onLoad: async (context: PluginContext) => {
        logger.info("[SoundEffectPlugin] Loaded!");

        // Hook: QUEUE_CREATE
        context.on<QueueCreateData>('QUEUE_CREATE', async ({ queue }) => {
            const soundPath = path.join(__dirname, 'welcome.mp3');

            if (fs.existsSync(soundPath)) {
                logger.info(`[SoundEffectPlugin] Queue created in ${queue.voiceChannelId}. Playing welcome sound...`);
                const resource = createAudioResource(fs.createReadStream(soundPath), { inputType: StreamType.Arbitrary });
                queue.player.play(resource);
            } else {
                logger.warn(`[SoundEffectPlugin] Welcome sound not found at ${soundPath}`);
            }
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
