import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import music from '../core/music-player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle looping the current track!'),
    async execute(interaction: ChatInputCommandInteraction) {
        await music.toggleLoop(interaction);
    },
};
