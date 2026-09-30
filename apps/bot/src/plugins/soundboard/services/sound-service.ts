import { PluginContext } from '@jasper/types';
import { randomUUID } from 'crypto';

import { Play, Sound, SoundboardStats } from '../types.js';

export class SoundService {
    constructor(private context: PluginContext) {}

    private async getDbSounds(): Promise<Sound[]> {
        return ((await this.context.db.plugin.get('sounds')) as Sound[]) || [];
    }

    private async saveDbSounds(sounds: Sound[]) {
        await this.context.db.plugin.set('sounds', sounds);
    }

    private async getDbPlays(): Promise<Play[]> {
        return ((await this.context.db.plugin.get('plays')) as Play[]) || [];
    }

    async getSounds(guildId?: string): Promise<Sound[]> {
        const sounds = await this.getDbSounds();
        if (!guildId) return sounds;
        return sounds.filter((s) => s.guildId === guildId || (!s.guildId && s.isGlobal));
    }

    async addSound(
        name: string,
        emoji: string,
        fileUri: string,
        userId: string,
        guildId: string = 'global',
        installationId?: string,
    ): Promise<Sound> {
        const sounds = await this.getDbSounds();

        const newSound: Sound = {
            id: randomUUID(),
            name,
            emoji,
            fileUri,
            createdAt: Date.now(),
            createdByUserId: userId,
            guildId,
            installationId: installationId || guildId,
        };

        sounds.push(newSound);
        await this.saveDbSounds(sounds);

        return newSound;
    }

    async deleteSound(id: string, guildId?: string): Promise<boolean> {
        const sounds = await this.getDbSounds();
        const soundIndex = sounds.findIndex((s) => s.id === id);

        if (soundIndex === -1) return false;

        const sound = sounds[soundIndex];

        // Guild isolation check
        if (guildId && sound.guildId && sound.guildId !== guildId) {
            throw new Error('Unauthorized: sound belongs to a different guild');
        }

        // Delete file from storage
        let filename = sound.fileUri;
        if (filename.startsWith('storage://')) {
            const parts = filename.split('/');
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
    async deleteSoundRecord(id: string, guildId?: string): Promise<boolean> {
        const sounds = await this.getDbSounds();
        const soundIndex = sounds.findIndex((s) => s.id === id);

        if (soundIndex === -1) return false;

        const sound = sounds[soundIndex];
        if (guildId && sound.guildId && sound.guildId !== guildId) {
            throw new Error('Unauthorized: sound belongs to a different guild');
        }

        sounds.splice(soundIndex, 1);
        await this.saveDbSounds(sounds);

        return true;
    }

    async updateSound(
        id: string,
        updates: { name?: string; emoji?: string },
        guildId?: string,
    ): Promise<Sound | null> {
        const sounds = await this.getDbSounds();
        const soundIndex = sounds.findIndex((s) => s.id === id);

        if (soundIndex === -1) return null;

        const sound = sounds[soundIndex];

        // Guild isolation check
        if (guildId && sound.guildId && sound.guildId !== guildId) {
            throw new Error('Unauthorized: sound belongs to a different guild');
        }

        if (updates.name) sound.name = updates.name;
        if (updates.emoji) sound.emoji = updates.emoji;

        sounds[soundIndex] = sound;
        await this.saveDbSounds(sounds);

        return sound;
    }

    async getStats(guildId?: string): Promise<SoundboardStats> {
        const plays = await this.getDbPlays();
        const sounds = await this.getDbSounds();

        const scopedPlays = guildId ? plays.filter((p) => p.guildId === guildId) : plays;
        const scopedSounds = guildId
            ? sounds.filter((s) => s.guildId === guildId || (!s.guildId && s.isGlobal))
            : sounds;

        const soundMap = new Map<string, { name: string; emoji: string; count: number }>();

        // Initialize map
        for (const sound of scopedSounds) {
            soundMap.set(sound.id, {
                name: sound.name,
                emoji: sound.emoji,
                count: 0,
            });
        }

        // Count plays
        for (const play of scopedPlays) {
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
            totalPlays: scopedPlays.length,
            topSounds,
        };
    }
}
