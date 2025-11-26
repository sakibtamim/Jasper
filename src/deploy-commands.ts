import fs from "node:fs";
import path from "node:path";
import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { fileURLToPath } from "url";
import logger from "./core/logger.js";
import {
  DISCORD_CLIENT_ID,
  GUILD_ID,
  DISCORD_TOKEN,
  validateDeployConfig
} from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables for deployment
validateDeployConfig();

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsPath = path.join(__dirname, "commands");
// Support both .js (production) and .ts (development)
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = await import(filePath);
  const command = commandModule.default;
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    logger.warn(`[commands] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`[commands] Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, GUILD_ID),
      { body: commands }
    ) as unknown[];
    logger.info(`[commands] Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(`[commands] ${error instanceof Error ? error.message : String(error)}`);
  }
})();
