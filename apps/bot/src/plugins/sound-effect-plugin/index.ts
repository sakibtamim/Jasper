import { Plugin, PluginContext, QueueCreateData, SongPlayData } from "@jasper/types";
import { createAudioResource, StreamType, AudioPlayerStatus } from "@discordjs/voice";
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
                // NOTE: There is a potential race condition here. If this hook is triggered by a /play command,
                // the core logic will immediately call playSong, which might interrupt this welcome sound.
                // This is a known limitation for now.
                const resource = createAudioResource(fs.createReadStream(soundPath), { inputType: StreamType.Arbitrary });

                // Add a small delay before playing the sound effect
                await new Promise(resolve => setTimeout(resolve, 2000));

                queue.player.play(resource);

                // Wait for the player to go Idle (sound finishes)
                // This ensures the welcome sound is not interrupted by the song starting.
                await new Promise<void>(resolve => {
                    const onIdle = () => {
                        queue.player.off(AudioPlayerStatus.Idle, onIdle);
                        resolve();
                    };
                    queue.player.on(AudioPlayerStatus.Idle, onIdle);
                });
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
