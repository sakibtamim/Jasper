const { Events, ActivityType } = require("discord.js");
const logger = require("../core/logger");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "cat jams | /play", type: ActivityType.Listening }],
      status: "online"
    });
  }
};
