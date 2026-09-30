import logger from '../logger.js';

export type TelemetryEvent =
    | 'shard_lease_acquired'
    | 'shard_lease_renewed'
    | 'shard_lease_lost'
    | 'shard_drain_started'
    | 'shard_drain_completed'
    | 'shard_drain_forced'
    | 'active_work_started'
    | 'active_work_finished'
    | 'active_work_interrupted'
    | 'stale_fence_rejected'
    | 'observation_rejected';

export interface StructuredLogEntry {
    event: TelemetryEvent;
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    data: Record<string, unknown>;
}

const structuredLogBuffer: StructuredLogEntry[] = [];
const MAX_STRUCTURED_LOGS = 200;

/**
 * Emit a structured log event following the runtime vocabulary.
 */
export function emitStructuredLog(
    event: TelemetryEvent,
    data: Record<string, unknown> = {},
    level: 'info' | 'warn' | 'error' = 'info',
): StructuredLogEntry {
    const entry: StructuredLogEntry = {
        event,
        timestamp: new Date().toISOString(),
        level,
        data,
    };

    structuredLogBuffer.push(entry);
    if (structuredLogBuffer.length > MAX_STRUCTURED_LOGS) {
        structuredLogBuffer.shift();
    }

    const payload = JSON.stringify({
        event: entry.event,
        timestamp: entry.timestamp,
        level: entry.level,
        ...data,
    });

    switch (level) {
        case 'error':
            logger.error(`[telemetry] ${payload}`);
            break;
        case 'warn':
            logger.warn(`[telemetry] ${payload}`);
            break;
        case 'info':
        default:
            logger.info(`[telemetry] ${payload}`);
            break;
    }

    return entry;
}

export function getRecentStructuredLogs(): StructuredLogEntry[] {
    return [...structuredLogBuffer];
}

export function clearStructuredLogs(): void {
    structuredLogBuffer.length = 0;
}
