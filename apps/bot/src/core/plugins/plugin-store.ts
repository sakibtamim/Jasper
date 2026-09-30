import { PluginStore } from '@jasper/types';

import db from '../db/index.js';

export class ScopedPluginStore implements PluginStore {
    private pluginName: string;
    private installationId?: string;

    constructor(pluginName: string, installationId?: string) {
        this.pluginName = pluginName;
        this.installationId = installationId;
    }

    async get(key: string): Promise<unknown | null> {
        return await db.getPluginData(this.pluginName, key, this.installationId);
    }

    async set(key: string, value: unknown): Promise<void> {
        await db.setPluginData(this.pluginName, key, value, this.installationId);
    }

    async delete(key: string): Promise<void> {
        await db.deletePluginData(this.pluginName, key, this.installationId);
    }

    async clear(): Promise<void> {
        await db.clearPluginData(this.pluginName, this.installationId);
    }

    forGuild(guildId: string): PluginStore {
        return new ScopedPluginStore(this.pluginName, guildId);
    }
}
