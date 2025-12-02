import { Events, ActivityType, Client } from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    client.user!.setPresence({
      status: "online"
    });
  }
};
