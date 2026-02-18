import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import music from '../core/music-player.js';

export default {
    data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
    async execute(interaction: ChatInputCommandInteraction) {
        await music.skip(interaction);
    },
};
