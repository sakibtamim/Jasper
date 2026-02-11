import { Events, Client, ActivityType } from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    // @ts-expect-error - Accessed custom property injected in worker-pool
    const role = (client as any).role;

    if (role === "controller") {
      client.user!.setPresence({
        activities: [
          { name: "Managing the Heavenly Council", type: ActivityType.Custom },
        ],
        status: "online",
      });
    } else {
      client.user!.setPresence({
        activities: [
          { name: "Waiting for tasks...", type: ActivityType.Custom },
        ],
        status: "idle",
      });
    }
  },
};
