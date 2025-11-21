require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { Collection } = require("discord.js");
const logger = require("./core/logger");
const workerPool = require("./core/workerPool");

(async () => {
  // 1. Create all bot clients
  workerPool.createBots();

  // 2. Get Controller (Jasper)
  const controllerWorker = workerPool.getController();
  if (!controllerWorker) {
    logger.error("No controller bot found! Check configuration.");
    process.exit(1);
  }
  const client = controllerWorker.client;

  // 3. Setup Controller (Commands & Events)
  client.commands = new Collection();

  // Load commands
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      logger.info(`Loaded command /${command.data.name}`);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  // Load events
  const eventsPath = path.join(__dirname, "events");
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    // Register events for the controller
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    logger.info(`Registered event listener for ${event.name}`);
  }

  // 4. Login all bots
  await workerPool.loginBots();

})();
