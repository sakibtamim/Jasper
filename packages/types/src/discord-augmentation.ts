import { Collection } from 'discord.js';

import { Command } from './bot-types.js';

declare module 'discord.js' {
    interface Client {
        commands: Collection<string, Command>;
    }
}
