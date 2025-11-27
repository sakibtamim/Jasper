// Import env.ts first to ensure environment variables are loaded
import { validateBotConfig } from './config/env.js';

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { Collection } from "discord.js";
import logger from "./core/logger.js";
import workerPool from "./core/worker-pool.js";
import { initializeCache, startCacheCleanup } from "./core/cache-manager.js";
import { handleGracefulExit } from "./core/graceful-exit.js";
import { sendAnnouncement } from "./core/announcer.js";
import { startServer, server } from "./api/server.js";
import pluginManager from "./core/plugins/plugin-manager.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables early
validateBotConfig();

// Register process signal handlers immediately
process.on("SIGINT", () => handleGracefulExit("SIGINT"));
process.on("SIGTERM", () => handleGracefulExit("SIGTERM"));

// Global error handlers
process.on("uncaughtException", (error) => {
  logger.error(`[core] Uncaught Exception: ${error instanceof Error ? error.stack : String(error)}`);
  handleGracefulExit("uncaughtException", error instanceof Error ? error : new Error(String(error)));
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`[core] Unhandled Rejection at: ${promise}, reason: ${reason}`);
  // We don't exit on unhandledRejection to keep the bot running, 
  // but we log it. If it's critical, uncaughtException might eventually trigger.
});

(async () => {
  // 1. Create all bot clients
  workerPool.createBots();

  // 2. Get Controller (Jasper)
  const controllerWorker = workerPool.getController();
  if (!controllerWorker) {
    logger.error("[core] No controller bot found! Check configuration.");
    process.exit(1);
  }
  const client = controllerWorker.client;

  // 3. Setup Controller (Commands & Events)
  client.commands = new Collection();

  // Load commands
  const commandsPath = path.join(__dirname, "commands");
  // Support both .js (production) and .ts (development)
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js") || file.endsWith(".ts"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(filePath);
    const command = commandModule.default;
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      logger.info(`[core] Loaded command /${command.data.name}`);
    } else {
      logger.warn(`[core] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  // 4. Login all bots
  await workerPool.loginBots();

  // 5. Initialize cache system (if enabled)
  await initializeCache();
  startCacheCleanup();

  // 6. Startup Announcement
  await sendAnnouncement("✅ **Jasper System Online**\nReady to serve the Heavenly Council of Fur.");

  // 7. Load Plugins (Must be before server starts)
  pluginManager.init(client, server);
  await pluginManager.loadPlugins();

  // 8. Start Web UI Server
  await startServer();

})();
