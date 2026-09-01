import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import music from '../core/music-player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a timestamp or percentage in the currently playing track')
        .addStringOption((option) =>
            option
                .setName('position')
                .setDescription('Position to seek to (e.g. 1:30, 90s, 2m, 50%)')
                .setRequired(true),
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await music.seek(interaction);
    },
};
