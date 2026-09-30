import {
    CellProviderSafetyLimits,
    ExtractionPermit,
    InstallationSafetyLimits,
    OperationalSafetyManager,
    OperationalSafetyMetrics,
    OperationalSafetyPolicy,
    SafetyCheckResult,
    SafetyResourceType,
    SafetyScope,
} from '@jasper/types';

import logger from '../logger.js';

export const DEFAULT_INSTALLATION_LIMITS: InstallationSafetyLimits = {
    maxConcurrentQueues: 3,
    maxTracksPerQueue: 500,
    maxCommandsPerMinute: 60,
    maxConcurrentExtractions: 2,
    maxUploadBytesPerMinute: 50 * 1024 * 1024, // 50 MB / min
    maxDownloadBytesPerMinute: 100 * 1024 * 1024, // 100 MB / min
};

export const DEFAULT_CELL_LIMITS: CellProviderSafetyLimits = {
    maxCellConcurrentQueues: 20,
    maxCellConcurrentExtractions: 10,
    maxCellCommandsPerMinute: 600,
    maxCellBandwidthBytesPerMinute: 500 * 1024 * 1024, // 500 MB / min
};

/**
 * Structured error thrown when operational safety constraints or resource budgets are exceeded.
 * Intentionally provider-neutral; never mentions pricing, plans, or billing tiers.
 */
export class OperationalSafetyError extends Error {
    public readonly result: SafetyCheckResult;

    constructor(result: SafetyCheckResult) {
        super(result.reason || `Operational safety threshold exceeded for ${result.resource}`);
        this.name = 'OperationalSafetyError';
        this.result = result;
    }
}

interface BandwidthRecord {
    timestamp: number;
    bytes: number;
}

export interface OperationalSafetyManagerOptions {
    policy?: OperationalSafetyPolicy;
    installationLimits?: Partial<InstallationSafetyLimits>;
    cellLimits?: Partial<CellProviderSafetyLimits>;
    maxMetricsBufferSize?: number;
}

/**
 * Default implementation of OperationalSafetyManager (HJ-OSS-20).
 * Enforces per-installation quotas and cell-wide resource budgets, preventing
 * noisy-neighbor exhaustion across queues, tracks, commands, audio extractions, and bandwidth.
 */
export class DefaultOperationalSafetyManager implements OperationalSafetyManager {
    private readonly policy?: OperationalSafetyPolicy;
    private readonly defaultInstallationLimits: InstallationSafetyLimits;
    private readonly cellLimits: CellProviderSafetyLimits;
    private readonly maxMetricsBufferSize: number;

    // Concurrency tracking
    private readonly installationQueues = new Map<string, Set<string>>(); // installationId -> Set<voiceChannelId>
    private readonly cellQueues = new Set<string>(); // Set<voiceChannelId>
    private readonly installationExtractions = new Map<string, number>(); // installationId -> active extractions count
    private cellExtractions = 0;

    // Rate limiting: sliding window timestamps
    private readonly commandTimestamps = new Map<string, number[]>(); // installationId -> timestamp[]
    private cellCommandTimestamps: number[] = [];

    // Bandwidth tracking: sliding window byte records
    private readonly uploadRecords = new Map<string, BandwidthRecord[]>(); // installationId -> records
    private readonly downloadRecords = new Map<string, BandwidthRecord[]>();
    private cellBandwidthRecords: BandwidthRecord[] = [];

    // Telemetry buffer
    private readonly metrics: OperationalSafetyMetrics[] = [];

    constructor(options: OperationalSafetyManagerOptions = {}) {
        this.policy = options.policy;
        this.defaultInstallationLimits = {
            ...DEFAULT_INSTALLATION_LIMITS,
            ...options.installationLimits,
        };
        this.cellLimits = {
            ...DEFAULT_CELL_LIMITS,
            ...options.cellLimits,
        };
        this.maxMetricsBufferSize = options.maxMetricsBufferSize ?? 1000;
    }

    private getInstallationLimits(installationId: string): InstallationSafetyLimits {
        if (this.policy) {
            return this.policy.getLimits(installationId).installationLimits;
        }
        return this.defaultInstallationLimits;
    }

    private getCellLimits(): CellProviderSafetyLimits {
        if (this.policy) {
            return this.policy.getLimits().cellLimits;
        }
        return this.cellLimits;
    }

    private recordMetric(
        resource: SafetyResourceType,
        action: 'allow' | 'throttle' | 'reject',
        scope: SafetyScope,
        current: number,
        limit: number,
        installationId?: string,
        retryAfterMs?: number,
    ): void {
        const metric: OperationalSafetyMetrics = {
            installationId,
            resource,
            action,
            scope,
            current,
            limit,
            retryAfterMs,
            timestamp: new Date(),
        };

        if (this.metrics.length >= this.maxMetricsBufferSize) {
            this.metrics.shift();
        }
        this.metrics.push(metric);

        if (action === 'throttle' || action === 'reject') {
            logger.warn?.(
                `[operational-safety] Resource threshold hit: resource=${resource} action=${action} scope=${scope} ` +
                    `installation=${installationId ?? 'cell'} current=${current} limit=${limit}` +
                    (retryAfterMs ? ` retryAfterMs=${retryAfterMs}` : ''),
            );
        }
    }

    /**
     * Check if a command invocation is permitted under rate limits.
     */
    checkCommand(installationId: string): SafetyCheckResult {
        const now = Date.now();
        const windowMs = 60_000;
        const cutoff = now - windowMs;

        const instLimits = this.getInstallationLimits(installationId);
        const cellLimits = this.getCellLimits();

        // 1. Check Installation Command Limit
        const instTimestamps = (this.commandTimestamps.get(installationId) || []).filter(
            (t) => t > cutoff,
        );
        if (instTimestamps.length >= instLimits.maxCommandsPerMinute) {
            const oldest = instTimestamps[0];
            const retryAfterMs = Math.max(1000, oldest + windowMs - now);
            this.recordMetric(
                'command',
                'throttle',
                'installation',
                instTimestamps.length,
                instLimits.maxCommandsPerMinute,
                installationId,
                retryAfterMs,
            );
            return {
                allowed: false,
                resource: 'command',
                scope: 'installation',
                retryAfterMs,
                reason: 'Command rate threshold reached for this server. Please wait before issuing more commands.',
                details: {
                    current: instTimestamps.length,
                    limit: instLimits.maxCommandsPerMinute,
                },
            };
        }

        // 2. Check Cell Command Limit (Noisy-neighbor aggregate protection)
        this.cellCommandTimestamps = this.cellCommandTimestamps.filter((t) => t > cutoff);
        if (this.cellCommandTimestamps.length >= cellLimits.maxCellCommandsPerMinute) {
            const oldestCell = this.cellCommandTimestamps[0];
            const retryAfterMs = Math.max(1000, oldestCell + windowMs - now);
            this.recordMetric(
                'command',
                'throttle',
                'cell',
                this.cellCommandTimestamps.length,
                cellLimits.maxCellCommandsPerMinute,
                installationId,
                retryAfterMs,
            );
            return {
                allowed: false,
                resource: 'command',
                scope: 'cell',
                retryAfterMs,
                reason: 'System is experiencing heavy load. Please retry your command in a moment.',
                details: {
                    current: this.cellCommandTimestamps.length,
                    limit: cellLimits.maxCellCommandsPerMinute,
                },
            };
        }

        // Permit invocation and record timestamps
        instTimestamps.push(now);
        this.commandTimestamps.set(installationId, instTimestamps);
        this.cellCommandTimestamps.push(now);

        this.recordMetric(
            'command',
            'allow',
            'installation',
            instTimestamps.length,
            instLimits.maxCommandsPerMinute,
            installationId,
        );

        return { allowed: true };
    }

    /**
     * Check if tracks can be added to an existing or new queue.
     */
    checkQueueAdmission(
        installationId: string,
        currentTrackCount: number,
        additionalTracks: number,
    ): SafetyCheckResult {
        const instLimits = this.getInstallationLimits(installationId);
        const projectedTotal = currentTrackCount + additionalTracks;

        if (projectedTotal > instLimits.maxTracksPerQueue) {
            this.recordMetric(
                'track',
                'reject',
                'installation',
                projectedTotal,
                instLimits.maxTracksPerQueue,
                installationId,
            );
            return {
                allowed: false,
                resource: 'track',
                scope: 'installation',
                reason: `Queue capacity reached (limit: ${instLimits.maxTracksPerQueue} tracks). Cannot add ${additionalTracks} more tracks.`,
                details: {
                    current: projectedTotal,
                    limit: instLimits.maxTracksPerQueue,
                },
            };
        }

        return { allowed: true };
    }

    /**
     * Acquire a concurrent queue slot.
     */
    acquireQueue(installationId: string, voiceChannelId: string): SafetyCheckResult {
        // If already tracked for this channel, permit idempotently
        const existingInstQueues = this.installationQueues.get(installationId);
        if (existingInstQueues && existingInstQueues.has(voiceChannelId)) {
            return { allowed: true };
        }

        const instLimits = this.getInstallationLimits(installationId);
        const cellLimits = this.getCellLimits();

        // 1. Check Installation Queue Concurrency
        const currentInstCount = existingInstQueues ? existingInstQueues.size : 0;
        if (currentInstCount >= instLimits.maxConcurrentQueues) {
            this.recordMetric(
                'queue',
                'reject',
                'installation',
                currentInstCount,
                instLimits.maxConcurrentQueues,
                installationId,
            );
            return {
                allowed: false,
                resource: 'queue',
                scope: 'installation',
                reason: 'Concurrent voice queue limit reached for this server. Stop an existing queue before starting a new one.',
                details: {
                    current: currentInstCount,
                    limit: instLimits.maxConcurrentQueues,
                },
            };
        }

        // 2. Check Cell Queue Concurrency
        if (this.cellQueues.size >= cellLimits.maxCellConcurrentQueues) {
            this.recordMetric(
                'queue',
                'reject',
                'cell',
                this.cellQueues.size,
                cellLimits.maxCellConcurrentQueues,
                installationId,
                5000,
            );
            return {
                allowed: false,
                resource: 'queue',
                scope: 'cell',
                retryAfterMs: 5000,
                reason: 'System voice channel capacity temporarily reached. Please retry in a moment.',
                details: {
                    current: this.cellQueues.size,
                    limit: cellLimits.maxCellConcurrentQueues,
                },
            };
        }

        // Register queue
        if (!this.installationQueues.has(installationId)) {
            this.installationQueues.set(installationId, new Set());
        }
        this.installationQueues.get(installationId)!.add(voiceChannelId);
        this.cellQueues.add(voiceChannelId);

        this.recordMetric(
            'queue',
            'allow',
            'installation',
            this.installationQueues.get(installationId)!.size,
            instLimits.maxConcurrentQueues,
            installationId,
        );

        return { allowed: true };
    }

    /**
     * Release a concurrent queue slot.
     */
    releaseQueue(installationId: string, voiceChannelId: string): void {
        const instQueues = this.installationQueues.get(installationId);
        if (instQueues) {
            instQueues.delete(voiceChannelId);
            if (instQueues.size === 0) {
                this.installationQueues.delete(installationId);
            }
        }
        this.cellQueues.delete(voiceChannelId);
        logger.debug?.(
            `[operational-safety] Released queue for voiceChannelId=${voiceChannelId} installation=${installationId}`,
        );
    }

    /**
     * Acquire audio extraction slot (yt-dlp child process) with deterministic disposal handle.
     */
    async acquireExtraction(installationId: string): Promise<ExtractionPermit> {
        const instLimits = this.getInstallationLimits(installationId);
        const cellLimits = this.getCellLimits();

        const currentInst = this.installationExtractions.get(installationId) ?? 0;

        // 1. Check Installation Extraction Limit
        if (currentInst >= instLimits.maxConcurrentExtractions) {
            const retryAfterMs = 3000;
            this.recordMetric(
                'extraction',
                'reject',
                'installation',
                currentInst,
                instLimits.maxConcurrentExtractions,
                installationId,
                retryAfterMs,
            );
            return {
                allowed: false,
                resource: 'extraction',
                scope: 'installation',
                retryAfterMs,
                reason: 'Audio processing concurrency limit reached for this server. Please wait for current track resolution to complete.',
                details: {
                    current: currentInst,
                    limit: instLimits.maxConcurrentExtractions,
                },
                dispose: () => {},
            };
        }

        // 2. Check Cell Extraction Limit
        if (this.cellExtractions >= cellLimits.maxCellConcurrentExtractions) {
            const retryAfterMs = 5000;
            this.recordMetric(
                'extraction',
                'reject',
                'cell',
                this.cellExtractions,
                cellLimits.maxCellConcurrentExtractions,
                installationId,
                retryAfterMs,
            );
            return {
                allowed: false,
                resource: 'extraction',
                scope: 'cell',
                retryAfterMs,
                reason: 'System audio processing is currently operating at maximum capacity. Please retry in a few seconds.',
                details: {
                    current: this.cellExtractions,
                    limit: cellLimits.maxCellConcurrentExtractions,
                },
                dispose: () => {},
            };
        }

        // Increment extraction counters
        this.installationExtractions.set(installationId, currentInst + 1);
        this.cellExtractions += 1;

        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            const updated = (this.installationExtractions.get(installationId) ?? 1) - 1;
            if (updated <= 0) {
                this.installationExtractions.delete(installationId);
            } else {
                this.installationExtractions.set(installationId, updated);
            }
            this.cellExtractions = Math.max(0, this.cellExtractions - 1);
            logger.debug?.(
                `[operational-safety] Disposed extraction slot for installation=${installationId}`,
            );
        };

        this.recordMetric(
            'extraction',
            'allow',
            'installation',
            currentInst + 1,
            instLimits.maxConcurrentExtractions,
            installationId,
        );

        return {
            allowed: true,
            dispose,
        };
    }

    /**
     * Check and record upload/download bandwidth consumption.
     */
    checkAndRecordBandwidth(
        installationId: string,
        bytes: number,
        direction: 'upload' | 'download',
    ): SafetyCheckResult {
        const now = Date.now();
        const windowMs = 60_000;
        const cutoff = now - windowMs;

        const instLimits = this.getInstallationLimits(installationId);
        const cellLimits = this.getCellLimits();

        const limitBytes =
            direction === 'upload'
                ? instLimits.maxUploadBytesPerMinute
                : instLimits.maxDownloadBytesPerMinute;
        const resourceType: SafetyResourceType =
            direction === 'upload' ? 'bandwidth_upload' : 'bandwidth_download';

        const recordMap = direction === 'upload' ? this.uploadRecords : this.downloadRecords;
        const records = (recordMap.get(installationId) || []).filter((r) => r.timestamp > cutoff);

        const currentInstBytes = records.reduce((sum, r) => sum + r.bytes, 0);
        if (currentInstBytes + bytes > limitBytes) {
            const oldest = records[0]?.timestamp ?? now;
            const retryAfterMs = Math.max(1000, oldest + windowMs - now);
            this.recordMetric(
                resourceType,
                'throttle',
                'installation',
                currentInstBytes + bytes,
                limitBytes,
                installationId,
                retryAfterMs,
            );
            return {
                allowed: false,
                resource: resourceType,
                scope: 'installation',
                retryAfterMs,
                reason: 'Bandwidth transfer budget temporarily reached for this server. Please retry in a moment.',
                details: {
                    current: currentInstBytes + bytes,
                    limit: limitBytes,
                },
            };
        }

        // Cell aggregate bandwidth check
        this.cellBandwidthRecords = this.cellBandwidthRecords.filter((r) => r.timestamp > cutoff);
        const currentCellBytes = this.cellBandwidthRecords.reduce((sum, r) => sum + r.bytes, 0);
        if (currentCellBytes + bytes > cellLimits.maxCellBandwidthBytesPerMinute) {
            const oldestCell = this.cellBandwidthRecords[0]?.timestamp ?? now;
            const retryAfterMs = Math.max(1000, oldestCell + windowMs - now);
            this.recordMetric(
                resourceType,
                'throttle',
                'cell',
                currentCellBytes + bytes,
                cellLimits.maxCellBandwidthBytesPerMinute,
                installationId,
                retryAfterMs,
            );
            return {
                allowed: false,
                resource: resourceType,
                scope: 'cell',
                retryAfterMs,
                reason: 'System bandwidth capacity temporarily reached. Please retry in a moment.',
                details: {
                    current: currentCellBytes + bytes,
                    limit: cellLimits.maxCellBandwidthBytesPerMinute,
                },
            };
        }

        // Record consumption
        records.push({ timestamp: now, bytes });
        recordMap.set(installationId, records);
        this.cellBandwidthRecords.push({ timestamp: now, bytes });

        this.recordMetric(
            resourceType,
            'allow',
            'installation',
            currentInstBytes + bytes,
            limitBytes,
            installationId,
        );

        return { allowed: true };
    }

    /**
     * Retrieve telemetry metrics.
     */
    getMetrics(): OperationalSafetyMetrics[] {
        return [...this.metrics];
    }

    /**
     * Reset all state counters and buffers.
     */
    reset(): void {
        this.installationQueues.clear();
        this.cellQueues.clear();
        this.installationExtractions.clear();
        this.cellExtractions = 0;
        this.commandTimestamps.clear();
        this.cellCommandTimestamps = [];
        this.uploadRecords.clear();
        this.downloadRecords.clear();
        this.cellBandwidthRecords = [];
        this.metrics.length = 0;
    }
}

// Global singleton instance
let defaultManagerInstance: OperationalSafetyManager = new DefaultOperationalSafetyManager();

export function getOperationalSafetyManager(): OperationalSafetyManager {
    return defaultManagerInstance;
}

export function setOperationalSafetyManager(manager: OperationalSafetyManager): void {
    defaultManagerInstance = manager;
}
