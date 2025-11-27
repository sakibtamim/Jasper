import { Plugin, PluginContext, QueueCreateData, SongPlayData } from "../../core/plugins/plugin-interface.js";
import { createAudioResource, StreamType } from "@discordjs/voice";
import type { ChatInputCommandInteraction } from "discord.js";
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
        context.logger.info("Loaded!");

        // Hook: QUEUE_CREATE
        context.on<QueueCreateData>('QUEUE_CREATE', async ({ queue }) => {
            const soundPath = path.join(__dirname, 'welcome.mp3');

            if (fs.existsSync(soundPath)) {
                context.logger.info(`Queue created in ${queue.voiceChannelId}. Playing welcome sound...`);
                const resource = createAudioResource(fs.createReadStream(soundPath), { inputType: StreamType.Arbitrary });
                queue.player.play(resource);
            } else {
                context.logger.warn(`Welcome sound not found at ${soundPath}`);
            }
        });

        // Hook: PRE_MUSIC_PLAY
        context.on<SongPlayData>('PRE_MUSIC_PLAY', ({ song }) => {
            context.logger.info(`About to play: ${song.title}`);
        });

        // Hook: POST_MUSIC_PLAY
        context.on<SongPlayData>('POST_MUSIC_PLAY', ({ song }) => {
            context.logger.info(`Started playing: ${song.title}`);
        });

        // Register a test command
        context.registerCommand({
            data: {
                name: "ping-plugin",
                description: "Replies with Pong from the plugin!",
            },
            execute: async (interaction: ChatInputCommandInteraction) => {
                await interaction.reply("Pong! 🏓 (from SoundEffectPlugin)");
            },
        });
    },

    onUnload: async (context: PluginContext) => {
        context.logger.info("Unloaded!");
    }
};

export default SoundEffectPlugin;
