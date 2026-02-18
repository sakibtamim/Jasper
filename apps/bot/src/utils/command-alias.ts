import { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { Command } from "../types/command.js";
import logger from "../core/logger.js";

export function createAlias(
  name: string,
  description: string,
  originalCommand: Command,
): Command {
  const origName =
    "name" in originalCommand.data ? originalCommand.data.name : "unknown";
  logger.info(`[commands] Creating alias: ${name} -> ${origName}`);
  const alias = {
    data: {
      name,
      toJSON: (): RESTPostAPIChatInputApplicationCommandsJSONBody => {
        const json =
          originalCommand.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody;
        json.name = name;
        json.description = description;
        logger.debug(
          `toJSON called for alias ${name}, returning: ${JSON.stringify({ name: json.name, description: json.description })}`,
        );
        return json;
      },
    },
    execute: originalCommand.execute,
    autocomplete: originalCommand.autocomplete,
  };
  logger.info(
    `[commands] Alias ${name} created successfully with data.name=${alias.data.name}`,
  );
  return alias;
}
