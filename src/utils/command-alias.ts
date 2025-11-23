import { ChatInputCommandInteraction, AutocompleteInteraction, SlashCommandBuilder } from "discord.js";

interface Command {
    data: SlashCommandBuilder | { toJSON: () => any };
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export function createAlias(name: string, description: string, originalCommand: Command) {
    return {
        data: {
            toJSON: () => {
                const json = originalCommand.data.toJSON();
                json.name = name;
                json.description = description;
                return json;
            },
        },
        execute: originalCommand.execute,
        autocomplete: originalCommand.autocomplete,
    };
}
