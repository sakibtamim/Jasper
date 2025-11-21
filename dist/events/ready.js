import { Events, ActivityType } from "discord.js";
import logger from "../core/logger.js";
export default {
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
