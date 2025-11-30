import { Collection } from "discord.js";
import { Command } from "./command.js";

declare module "discord.js" {
    interface Client {
        commands: Collection<string, Command>;
    }
}
