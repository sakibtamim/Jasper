import { CacheType, Events, Interaction } from 'discord.js';

import { getGuildAccessPolicy } from '../core/access-policy.js';
import logger from '../core/logger.js';

export default {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: Interaction<CacheType>) {
        const guildId = interaction.guildId;

        // 1. Guard against Direct Messages (guildId is required)
        if (!guildId) {
            logger.warn(`[access] Rejected DM interaction from user ${interaction.user.id}`);
            if (interaction.isChatInputCommand()) {
                await interaction.reply({
                    content:
                        '🚫 **Access Denied**: Jasper commands can only be used within a server, not in Direct Messages.',
                    ephemeral: true,
                });
            }
            return;
        }

        // 2. Resolve installation context and verify access policy
        const policy = getGuildAccessPolicy();
        const context = await policy.resolve(guildId);
        const admitted = context !== null && policy.mayStartWork(context);

        if (!admitted) {
            logger.warn(
                `[access] Denied interaction for guild ${guildId} (state=${context?.state ?? 'unregistered'}, admitted=false)`,
            );

            if (interaction.isChatInputCommand()) {
                let reason = 'This server does not have an active Jasper installation.';
                if (context?.state === 'suspended') {
                    reason = 'This server’s Jasper installation is currently suspended.';
                } else if (context?.state === 'deleting') {
                    reason = 'This server’s Jasper installation is being deleted.';
                } else if (context?.state === 'provisioning') {
                    reason = 'This server’s Jasper installation is still being provisioned.';
                } else if (
                    context?.admissionExpiresAt &&
                    context.admissionExpiresAt.getTime() <= Date.now()
                ) {
                    reason = 'This server’s Jasper admission grant has expired.';
                }

                await interaction.reply({
                    content: `🚫 **Access Denied**: ${reason}`,
                    ephemeral: true,
                });
            }
            return;
        }

        // Attach resolved installation context to interaction for downstream command scope
        // @ts-expect-error - injecting installation context onto interaction
        interaction.installation = context;

        // 3. Handle Autocomplete Requests
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

        // 4. Handle Standard Slash Commands
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
