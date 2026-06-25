import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import music from '../core/music-player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('repeat')
        .setDescription('Toggle repeating the entire queue!'),
    async execute(interaction: ChatInputCommandInteraction) {
        await music.toggleRepeat(interaction);
    },
};
