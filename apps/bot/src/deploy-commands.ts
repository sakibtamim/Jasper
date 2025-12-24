import fs from "node:fs";
import path from "node:path";
import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody, Collection } from "discord.js";
import { fileURLToPath } from "url";
import logger from "./core/logger.js";
import {
  DISCORD_CLIENT_ID,
  GUILD_ID,
  DISCORD_TOKEN,
  validateDeployConfig,
  DB_TYPE,
  DATABASE_URL
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

// --- Load Plugin Commands ---
// Skip plugin loading if:
// 1. SKIP_PLUGINS env var is set
// 2. DB_TYPE is postgres but DATABASE_URL is missing (would hang on DB connection)
const skipPlugins = process.env.SKIP_PLUGINS === "true" || (DB_TYPE === "postgres" && !DATABASE_URL);

if (skipPlugins) {
  logger.info("[commands] Skipping plugin command loading (SKIP_PLUGINS or missing DATABASE_URL)");
} else {
  logger.info("[commands] Loading plugin commands...");

  // Dynamic import to avoid eager database initialization
  const { default: pluginManager } = await import("./core/plugins/plugin-manager.js");

  // Mock Client & Server for PluginManager
  const mockClient = {
    commands: new Collection(),
    on: () => { },
    off: () => { },
    emit: () => { }
  } as any;
  const mockServer = {
    register: async (fn: any) => await fn(mockServer),
    get: () => { },
    post: () => { },
    delete: () => { },
    patch: () => { },
  } as any;

  try {
    pluginManager.init(mockClient, mockServer);
    await pluginManager.loadPlugins();

    mockClient.commands.forEach((cmd: any) => {
      if (cmd.data) {
        // Handle both Builders (toJSON) and plain objects
        const cmdData = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data;
        commands.push(cmdData);
        logger.info(`[commands] Included plugin command: /${cmdData.name}`);
      }
    });
  } catch (error) {
    logger.error(`[commands] Failed to load plugin commands: ${error}`);
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
    process.exit(0);
  } catch (error) {
    logger.error(`[commands] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
