import { PluginContext } from "@jasper/types";
import { Sound, Play, SoundboardStats } from "../types.js";
import { randomUUID } from "crypto";

export class SoundService {
    constructor(private context: PluginContext) { }

    private async getDbSounds(): Promise<Sound[]> {
        return (await this.context.db.plugin.get("sounds") as Sound[]) || [];
    }

    private async saveDbSounds(sounds: Sound[]) {
        await this.context.db.plugin.set("sounds", sounds);
    }

    private async getDbPlays(): Promise<Play[]> {
        return (await this.context.db.plugin.get("plays") as Play[]) || [];
    }

    async getSounds(): Promise<Sound[]> {
        return this.getDbSounds();
    }

    async addSound(name: string, emoji: string, fileUri: string, userId: string): Promise<Sound> {
        const sounds = await this.getDbSounds();

        const newSound: Sound = {
            id: randomUUID(),
            name,
            emoji,
            fileUri,
            createdAt: Date.now(),
            createdByUserId: userId,
        };

        sounds.push(newSound);
        await this.saveDbSounds(sounds);

        return newSound;
    }

    async deleteSound(id: string): Promise<boolean> {
        const sounds = await this.getDbSounds();
        const soundIndex = sounds.findIndex(s => s.id === id);

        if (soundIndex === -1) return false;

        const sound = sounds[soundIndex];

        // Delete file from storage
        let filename = sound.fileUri;
        if (filename.startsWith("storage://")) {
            const parts = filename.split("/");
            filename = parts[parts.length - 1];
        }

        try {
            await this.context.storage.delete(filename);
        } catch (err) {
            this.context.logger.warn(`Failed to delete file ${filename}: ${err}`);
        }

        sounds.splice(soundIndex, 1);
        await this.saveDbSounds(sounds);

        return true;
    }

    /**
     * Delete only the database record for a sound, without attempting to delete the file.
     * Useful for cleanup of orphaned database entries where the file is already missing.
     */
    async deleteSoundRecord(id: string): Promise<boolean> {
        const sounds = await this.getDbSounds();
        const soundIndex = sounds.findIndex(s => s.id === id);

        if (soundIndex === -1) return false;

        sounds.splice(soundIndex, 1);
        await this.saveDbSounds(sounds);

        return true;
    }

    async updateSound(id: string, updates: { name?: string; emoji?: string }): Promise<Sound | null> {
        const sounds = await this.getDbSounds();
        const soundIndex = sounds.findIndex(s => s.id === id);

        if (soundIndex === -1) return null;

        const sound = sounds[soundIndex];

        if (updates.name) sound.name = updates.name;
        if (updates.emoji) sound.emoji = updates.emoji;

        sounds[soundIndex] = sound;
        await this.saveDbSounds(sounds);

        return sound;
    }

    async getStats(): Promise<SoundboardStats> {
        const plays = await this.getDbPlays();
        const sounds = await this.getDbSounds();

        const soundMap = new Map<string, { name: string, emoji: string, count: number }>();

        // Initialize map
        for (const sound of sounds) {
            soundMap.set(sound.id, { name: sound.name, emoji: sound.emoji, count: 0 });
        }

        // Count plays
        for (const play of plays) {
            const entry = soundMap.get(play.soundId);
            if (entry) {
                entry.count++;
            }
        }

        const topSounds = Array.from(soundMap.entries())
            .map(([id, data]) => ({ soundId: id, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalPlays: plays.length,
            topSounds
        };
    }
}
