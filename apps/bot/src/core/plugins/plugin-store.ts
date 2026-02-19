import { PluginStore } from '@jasper/types';

import db from '../db/index.js';

export class ScopedPluginStore implements PluginStore {
    private pluginName: string;

    constructor(pluginName: string) {
        this.pluginName = pluginName;
    }

    async get(key: string): Promise<any | null> {
        return await db.getPluginData(this.pluginName, key);
    }

    async set(key: string, value: any): Promise<void> {
        await db.setPluginData(this.pluginName, key, value);
    }

    async delete(key: string): Promise<void> {
        await db.deletePluginData(this.pluginName, key);
    }

    async clear(): Promise<void> {
        await db.clearPluginData(this.pluginName);
    }
}
