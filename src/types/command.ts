import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";

/**
 * Interface for Discord slash commands
 * Provides type safety and autocomplete for command properties
 */
export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
