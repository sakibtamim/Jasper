import db from "../db/index.js";
import { CoreDataAccessor } from "@jasper/types";
import { SongStats, UserStats } from "../db/types.js";

export class ReadOnlyCoreDataAccessor implements CoreDataAccessor {
    async getTopSongs(limit?: number): Promise<SongStats[]> {
        return await db.getTopSongs(limit);
    }

    async getTopUsers(limit?: number): Promise<UserStats[]> {
        return await db.getTopUsers(limit);
    }

    async getGlobalStats(): Promise<{ totalPlays: number; totalDuration: number }> {
        return await db.getGlobalStats();
    }

    async isPluginEnabled(pluginId: string): Promise<boolean | null> {
        return await db.isPluginEnabled(pluginId);
    }

    async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
        return await db.setPluginEnabled(pluginId, enabled);
    }

    async getAllPluginMeta(): Promise<Array<{ pluginId: string, enabled: boolean }>> {
        return await db.getAllPluginMeta();
    }
}

// Singleton instance
const coreDataAccessor = new ReadOnlyCoreDataAccessor();
export default coreDataAccessor;
