import { Events, ActivityType, Client } from "discord.js";
import logger from "../core/logger.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    client.user!.setPresence({
      activities: [{ name: "cat jams | /play", type: ActivityType.Listening }],
      status: "online"
    });
  }
};
