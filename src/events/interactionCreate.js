const { Events } = require("discord.js");
const logger = require("../core/logger");

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}: ${error.stack || error.message}`);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "Sorry, something went wrong while executing that command.",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "Sorry, something went wrong while executing that command.",
          ephemeral: true
        });
      }
    }
  }
};
