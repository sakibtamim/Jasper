require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

const { CLIENT_ID, GUILD_ID, DISCORD_TOKEN } = process.env;

if (!CLIENT_ID || !GUILD_ID || !DISCORD_TOKEN) {
  console.error("Missing CLIENT_ID, GUILD_ID, or DISCORD_TOKEN in environment.");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[WARN] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})();
