import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    HostedAdmissionGrant,
    HostedGuildAccessPolicy,
    HostedInstallationProvider,
    HostedInstallationRecord,
    LocalGuildAccessPolicy,
    checkGuildAccess,
    getGuildAccessPolicy,
    resetGuildAccessPolicy,
    setGuildAccessPolicy,
} from '../access-policy.js';

vi.mock('../logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../worker-pool.js', () => ({
    default: {
        getWorkers: vi.fn().mockReturnValue([
            { name: 'Jasper', role: 'controller' },
            { name: 'Misty', role: 'worker' },
        ]),
    },
}));

describe('LocalGuildAccessPolicy', () => {
    it('resolves active context with zero external dependencies', async () => {
        const policy = new LocalGuildAccessPolicy();
        const context = await policy.resolve('guild-123');

        expect(context).not.toBeNull();
        expect(context?.guildId).toBe('guild-123');
        expect(context?.installationId).toBe('local:guild-123');
        expect(context?.state).toBe('active');
        expect(context?.admissionExpiresAt).toBeUndefined(); // Non-expiring local authority
        expect(context?.admissionRevision).toBe(1);
        expect(context?.configRevision).toBe(1);
        expect(context?.enabledWorkerIds.has('Jasper')).toBe(true);
        expect(context?.enabledWorkerIds.has('Misty')).toBe(true);

        expect(policy.mayStartWork(context!)).toBe(true);
    });

    it('enforces optional allowlist when configured', async () => {
        const policy = new LocalGuildAccessPolicy({
            allowedGuildIds: ['allowed-guild-1', 'allowed-guild-2'],
        });

        const allowed = await policy.resolve('allowed-guild-1');
        expect(allowed).not.toBeNull();
        expect(allowed?.state).toBe('active');

        const denied = await policy.resolve('other-guild');
        expect(denied).toBeNull();
    });

    it('returns false in mayStartWork for non-active/degraded or expired states', () => {
        const policy = new LocalGuildAccessPolicy();

        const baseContext = {
            guildId: 'g1',
            installationId: 'local:g1',
            admissionRevision: 1,
            configRevision: 1,
            enabledWorkerIds: new Set<string>(),
            enabledPluginIds: new Set<string>(),
            jasperWeight: 0.5,
        };

        expect(policy.mayStartWork({ ...baseContext, state: 'active' })).toBe(true);
        expect(policy.mayStartWork({ ...baseContext, state: 'degraded' })).toBe(true);
        expect(policy.mayStartWork({ ...baseContext, state: 'suspended' })).toBe(false);
        expect(policy.mayStartWork({ ...baseContext, state: 'deleting' })).toBe(false);
        expect(policy.mayStartWork({ ...baseContext, state: 'provisioning' })).toBe(false);

        // Expired local context if expiry date is explicitly set in past
        expect(
            policy.mayStartWork({
                ...baseContext,
                state: 'active',
                admissionExpiresAt: new Date(Date.now() - 5000),
            }),
        ).toBe(false);
    });
});

describe('HostedGuildAccessPolicy (Contract Tests)', () => {
    let mockProvider: HostedInstallationProvider;
    let sampleRecord: HostedInstallationRecord;
    let sampleGrant: HostedAdmissionGrant;

    beforeEach(() => {
        vi.clearAllMocks();

        sampleRecord = {
            guildId: 'guild-hosted-1',
            installationId: 'inst-hosted-1',
            state: 'active',
            configRevision: 1,
            revocationRevision: 0,
            enabledWorkerIds: ['Jasper', 'Misty'],
            enabledPluginIds: ['soundboard'],
            jasperWeight: 0.5,
        };

        sampleGrant = {
            guildId: 'guild-hosted-1',
            installationId: 'inst-hosted-1',
            admissionRevision: 1,
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 45 * 1000), // 45 seconds valid
        };

        mockProvider = {
            fetchInstallation: vi.fn().mockResolvedValue(sampleRecord),
            fetchAdmissionGrant: vi.fn().mockResolvedValue(sampleGrant),
        };
    });

    it('caches configuration for 15 minutes and does not re-fetch on subsequent calls', async () => {
        const policy = new HostedGuildAccessPolicy(mockProvider);

        const ctx1 = await policy.resolve('guild-hosted-1');
        expect(ctx1).not.toBeNull();
        expect(mockProvider.fetchInstallation).toHaveBeenCalledTimes(1);

        // Second call within 15 minutes uses cached configuration
        const ctx2 = await policy.resolve('guild-hosted-1');
        expect(ctx2).not.toBeNull();
        expect(mockProvider.fetchInstallation).toHaveBeenCalledTimes(1); // Not called again!
    });

    it('re-fetches configuration once the 15-minute cache expires', async () => {
        // Use custom maxConfigCacheMs of 100ms for testing
        const policy = new HostedGuildAccessPolicy(mockProvider, {
            maxConfigCacheMs: 100,
        });

        await policy.resolve('guild-hosted-1');
        expect(mockProvider.fetchInstallation).toHaveBeenCalledTimes(1);

        // Wait 120ms
        await new Promise((resolve) => setTimeout(resolve, 120));

        await policy.resolve('guild-hosted-1');
        expect(mockProvider.fetchInstallation).toHaveBeenCalledTimes(2);
    });

    it('clamps admission grants longer than 60 seconds to ≤60-second validity', async () => {
        // Provider returns a grant valid for 5 minutes (300 seconds)
        mockProvider.fetchAdmissionGrant = vi.fn().mockResolvedValue({
            guildId: 'guild-hosted-1',
            installationId: 'inst-hosted-1',
            admissionRevision: 1,
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 300 * 1000),
        });

        const policy = new HostedGuildAccessPolicy(mockProvider, {
            maxAdmissionGrantMs: 60 * 1000,
        });

        const ctx = await policy.resolve('guild-hosted-1');
        expect(ctx).not.toBeNull();
        expect(ctx?.admissionExpiresAt).toBeDefined();

        const grantDurationMs = ctx!.admissionExpiresAt!.getTime() - Date.now();
        // Clamped to at most 60,000ms (+ minor buffer for test execution time)
        expect(grantDurationMs).toBeLessThanOrEqual(60 * 1000);
        expect(grantDurationMs).toBeGreaterThan(50 * 1000);
    });

    it('cached configuration cannot independently authorize work when admission is missing or expired (fails closed)', async () => {
        // Provider returns installation config, but no admission grant (returns null)
        mockProvider.fetchAdmissionGrant = vi.fn().mockResolvedValue(null);

        const policy = new HostedGuildAccessPolicy(mockProvider);
        const ctx = await policy.resolve('guild-hosted-1');

        expect(ctx).not.toBeNull();
        // Admission is missing/expired
        expect(policy.mayStartWork(ctx!)).toBe(false);
    });

    it('fails closed when an admission grant has expired', async () => {
        // Grant that expired 1 second ago
        mockProvider.fetchAdmissionGrant = vi.fn().mockResolvedValue({
            guildId: 'guild-hosted-1',
            installationId: 'inst-hosted-1',
            admissionRevision: 1,
            grantedAt: new Date(Date.now() - 10000),
            expiresAt: new Date(Date.now() - 1000),
        });

        const policy = new HostedGuildAccessPolicy(mockProvider);
        const ctx = await policy.resolve('guild-hosted-1');

        expect(ctx).not.toBeNull();
        expect(policy.mayStartWork(ctx!)).toBe(false);
    });

    it('immediately denies admission when revocation revision exceeds grant revision', async () => {
        // Record has revocationRevision = 2, but grant has admissionRevision = 1
        sampleRecord.revocationRevision = 2;
        sampleGrant.admissionRevision = 1;

        const policy = new HostedGuildAccessPolicy(mockProvider);
        const ctx = await policy.resolve('guild-hosted-1');

        expect(ctx).not.toBeNull();
        expect(policy.mayStartWork(ctx!)).toBe(false);
    });

    it('immediately clears cached grants and denies work when installation is suspended or deleting', async () => {
        const policy = new HostedGuildAccessPolicy(mockProvider);

        // 1. Initially active
        const ctx1 = await policy.resolve('guild-hosted-1');
        expect(policy.mayStartWork(ctx1!)).toBe(true);

        // 2. State transitions to suspended
        sampleRecord.state = 'suspended';
        policy.clearCaches(); // Simulate updated state fetch

        const ctx2 = await policy.resolve('guild-hosted-1');
        expect(ctx2?.state).toBe('suspended');
        expect(policy.mayStartWork(ctx2!)).toBe(false);

        // 3. State transitions to deleting
        sampleRecord.state = 'deleting';
        policy.clearCaches();

        const ctx3 = await policy.resolve('guild-hosted-1');
        expect(ctx3?.state).toBe('deleting');
        expect(policy.mayStartWork(ctx3!)).toBe(false);
    });

    it('returns null when provider cannot find the guild installation', async () => {
        mockProvider.fetchInstallation = vi.fn().mockResolvedValue(null);
        const policy = new HostedGuildAccessPolicy(mockProvider);

        const ctx = await policy.resolve('unknown-guild');
        expect(ctx).toBeNull();
    });
});

describe('Policy Registry & checkGuildAccess helper', () => {
    beforeEach(() => {
        resetGuildAccessPolicy();
    });

    it('defaults to LocalGuildAccessPolicy', () => {
        const policy = getGuildAccessPolicy();
        expect(policy).toBeInstanceOf(LocalGuildAccessPolicy);
    });

    it('allows setting custom policy and resetting', () => {
        const customPolicy = new LocalGuildAccessPolicy({
            allowedGuildIds: ['custom-guild'],
        });
        setGuildAccessPolicy(customPolicy);
        expect(getGuildAccessPolicy()).toBe(customPolicy);

        resetGuildAccessPolicy();
        expect(getGuildAccessPolicy()).not.toBe(customPolicy);
    });

    it('checkGuildAccess returns context for admitted guild and null for unadmitted or DM', async () => {
        expect(await checkGuildAccess(null)).toBeNull();
        expect(await checkGuildAccess(undefined)).toBeNull();

        const ctx = await checkGuildAccess('valid-guild');
        expect(ctx).not.toBeNull();
        expect(ctx?.guildId).toBe('valid-guild');
    });
});
