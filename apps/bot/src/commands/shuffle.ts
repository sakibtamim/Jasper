import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import music from '../core/music-player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle all upcoming songs in the queue!'),
    async execute(interaction: ChatInputCommandInteraction) {
        await music.shuffleQueue(interaction);
    },
};
