import db from "../db/index.js";
import { CoreDataAccessor } from "./plugin-interface.js";
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
}

// Singleton instance
const coreDataAccessor = new ReadOnlyCoreDataAccessor();
export default coreDataAccessor;
