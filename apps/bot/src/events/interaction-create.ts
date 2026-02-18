import { CacheType, Events, Interaction } from 'discord.js';

import logger from '../core/logger.js';

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction<CacheType>) {
        // 1. Handle Autocomplete Requests
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                logger.error(`[events] No command matching ${interaction.commandName} was found.`, {
                    suppressOnWebUI: true,
                });
                return;
            }

            if (command.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    logger.error(
                        `[events] Autocomplete error: ${error instanceof Error ? error.message : String(error)}`,
                        { suppressOnWebUI: true },
                    );
                }
            }
            return;
        }

        // 2. Handle Standard Slash Commands
        if (!interaction.isChatInputCommand()) return;

        logger.debug(`[events] Received command: ${interaction.commandName}`);
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            logger.error(`[events] No command matching ${interaction.commandName} was found.`);
            return;
        }
        logger.debug(`[events] Found command ${interaction.commandName}, executing...`);

        try {
            await command.execute(interaction);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.stack || error.message : String(error);
            logger.error(`[events] Error executing command ${interaction.commandName}: ${msg}`);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({
                        content: 'Sorry, something went wrong while executing that command.',
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content: 'Sorry, something went wrong while executing that command.',
                        ephemeral: true,
                    });
                }
            } catch (handlerError) {
                logger.error(
                    `[events] Failed to send error message to user: ${handlerError instanceof Error ? handlerError.message : String(handlerError)}`,
                );
            }
        }
    },
};
