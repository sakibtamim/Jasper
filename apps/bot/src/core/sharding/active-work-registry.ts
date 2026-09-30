import { ActiveWorkMarker, WorkInterruptionEvent } from '@jasper/types';

import { metrics } from '../telemetry/metrics.js';
import { emitStructuredLog } from '../telemetry/structured-logger.js';

export class ActiveWorkRegistry {
    private markers = new Map<string, ActiveWorkMarker>();
    private emptyListeners: Array<() => void> = [];

    private getKey(installationId: string, queueId: string): string {
        return `${installationId}:${queueId}`;
    }

    public registerWork(marker: ActiveWorkMarker): void {
        const key = this.getKey(marker.installationId, marker.queueId);
        this.markers.set(key, { ...marker });

        emitStructuredLog('active_work_started', {
            installationId: marker.installationId,
            queueId: marker.queueId,
            guildId: marker.guildId,
            voiceChannelId: marker.voiceChannelId,
            bootId: marker.bootId,
            fenceEpoch: marker.fenceEpoch,
            startedAt: marker.startedAt.toISOString(),
        });

        metrics.setActiveQueuesCount(this.markers.size);
    }

    public finishWork(installationId: string, queueId: string): boolean {
        const key = this.getKey(installationId, queueId);
        const marker = this.markers.get(key);
        if (!marker) return false;

        this.markers.delete(key);

        emitStructuredLog('active_work_finished', {
            installationId: marker.installationId,
            queueId: marker.queueId,
            guildId: marker.guildId,
            voiceChannelId: marker.voiceChannelId,
            finishedAt: new Date().toISOString(),
        });

        metrics.setActiveQueuesCount(this.markers.size);

        if (this.markers.size === 0) {
            for (const listener of this.emptyListeners) {
                listener();
            }
        }

        return true;
    }

    public interruptAll(
        reason: 'fence_loss' | 'drain_timeout' | 'crash' | 'partition',
    ): WorkInterruptionEvent[] {
        const events: WorkInterruptionEvent[] = [];
        const now = new Date();

        for (const marker of this.markers.values()) {
            const event: WorkInterruptionEvent = {
                installationId: marker.installationId,
                queueId: marker.queueId,
                guildId: marker.guildId,
                voiceChannelId: marker.voiceChannelId,
                bootId: marker.bootId,
                fenceEpoch: marker.fenceEpoch,
                interruptedAt: now,
                reason,
            };

            events.push(event);

            emitStructuredLog(
                'active_work_interrupted',
                {
                    installationId: event.installationId,
                    queueId: event.queueId,
                    guildId: event.guildId,
                    voiceChannelId: event.voiceChannelId,
                    bootId: event.bootId,
                    fenceEpoch: event.fenceEpoch,
                    interruptedAt: event.interruptedAt.toISOString(),
                    reason: event.reason,
                },
                'warn',
            );

            metrics.activeWorkInterrupted(reason);
        }

        // Ephemeral queue boundary: clear markers, never auto-replay or resume
        this.markers.clear();
        metrics.setActiveQueuesCount(0);

        for (const listener of this.emptyListeners) {
            listener();
        }

        return events;
    }

    public getActiveMarkers(): ActiveWorkMarker[] {
        return Array.from(this.markers.values()).map((m) => ({ ...m }));
    }

    public getCount(): number {
        return this.markers.size;
    }

    public onWorkEmpty(callback: () => void): () => void {
        this.emptyListeners.push(callback);
        return () => {
            const idx = this.emptyListeners.indexOf(callback);
            if (idx >= 0) this.emptyListeners.splice(idx, 1);
        };
    }

    public clear(): void {
        this.markers.clear();
        metrics.setActiveQueuesCount(0);
    }
}

export const defaultActiveWorkRegistry = new ActiveWorkRegistry();
