import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { helpEmbed } from '../utils/embed-factory.js';

export default {
    data: new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [helpEmbed()] });
    },
};
