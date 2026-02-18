import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";

/**
 * Interface for Discord slash commands
 * Provides type safety and autocomplete for command properties
 */
export interface Command {
  data:
    | SlashCommandBuilder
    | { toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
