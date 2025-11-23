import { SlashCommandBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { Command } from "../types/command.js";

export function createAlias(name: string, description: string, originalCommand: Command): Command {
    return {
        data: {
            toJSON: (): RESTPostAPIChatInputApplicationCommandsJSONBody => {
                const json = originalCommand.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody;
                json.name = name;
                json.description = description;
                return json;
            },
        },
        execute: originalCommand.execute,
        autocomplete: originalCommand.autocomplete,
    };
}
