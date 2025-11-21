import { Events, Interaction, CacheType } from "discord.js";
import logger from "../core/logger.js";

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction<CacheType>) {
    // 1. Handle Autocomplete Requests
    if (interaction.isAutocomplete()) {
      const command = (interaction.client as any).commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
      return;
    }

    // 2. Handle Standard Slash Commands
    if (!interaction.isChatInputCommand()) return;

    const command = (interaction.client as any).commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error: any) {
      logger.error(
        `Error executing command ${interaction.commandName}: ${error.stack || error.message
        }`
      );
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "Sorry, something went wrong while executing that command.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Sorry, something went wrong while executing that command.",
          ephemeral: true,
        });
      }
    }
  },
};
