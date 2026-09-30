import {
    CapabilityContext,
    CapabilityDecision,
    CapabilityDecisionPort,
    GuildInstallationContext,
} from '@jasper/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    CapabilityDeniedError,
    LocalCapabilityResolver,
    assertCapability,
    checkCapability,
    getCapabilityResolver,
    hasCapability,
    resetCapabilityResolver,
    setCapabilityResolver,
} from '../capabilities.js';

describe('Capability Decision Port & Local Resolver (HJ-OSS-17)', () => {
    beforeEach(() => {
        resetCapabilityResolver();
    });

    afterEach(() => {
        resetCapabilityResolver();
    });

    describe('Default LocalCapabilityResolver', () => {
        it('should default to an instance of LocalCapabilityResolver', () => {
            const resolver = getCapabilityResolver();
            expect(resolver).toBeInstanceOf(LocalCapabilityResolver);
        });

        it('should unconditionally allow any capability for any guild context', async () => {
            const context: CapabilityContext = {
                guildId: 'guild-100',
                installationId: 'local:guild-100',
            };

            const decision = await checkCapability(context, 'soundboard.custom_upload');
            expect(decision.allowed).toBe(true);
            expect(decision.reason).toMatch(/local capability resolver/i);

            const allowed = await hasCapability(context, 'soundboard.custom_upload');
            expect(allowed).toBe(true);

            await expect(
                assertCapability(context, 'soundboard.custom_upload'),
            ).resolves.toBeUndefined();
        });

        it('should grant multiple arbitrary capabilities without plan or pricing knowledge', async () => {
            const installationContext: GuildInstallationContext = {
                guildId: 'guild-200',
                installationId: 'install-200',
                state: 'active',
                admissionRevision: 1,
                configRevision: 1,
                enabledWorkerIds: new Set(['cat-1']),
                enabledPluginIds: new Set(['soundboard']),
                jasperWeight: 100,
            };

            const capabilities = [
                'audio.lossless',
                'queue.infinite',
                'radio.broadcast',
                'plugins.commercial_preview',
                'export.stems',
            ];

            for (const cap of capabilities) {
                const decision = await checkCapability(installationContext, cap);
                expect(decision.allowed).toBe(true);
                expect(await hasCapability(installationContext, cap)).toBe(true);
            }
        });

        it('should reject when capabilityId is missing or empty', async () => {
            const context: CapabilityContext = { guildId: 'guild-100' };
            const decision = await checkCapability(context, '');
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toMatch(/must be provided/i);
        });

        it('should allow configuring local denial and allow lists for localized testing', async () => {
            const resolver = new LocalCapabilityResolver({
                deniedCapabilities: ['radio.experimental'],
                allowedCapabilities: ['audio.standard', 'soundboard.play'],
            });

            const context: CapabilityContext = { guildId: 'guild-local' };

            // Explicitly denied
            const denied = await resolver.decide(context, 'radio.experimental');
            expect(denied.allowed).toBe(false);
            expect(denied.reason).toMatch(/disabled by local configuration/i);

            // Not in allowed list
            const notAllowed = await resolver.decide(context, 'audio.lossless');
            expect(notAllowed.allowed).toBe(false);
            expect(notAllowed.reason).toMatch(/not in local allowlist/i);

            // In allowed list
            const allowed = await resolver.decide(context, 'audio.standard');
            expect(allowed.allowed).toBe(true);
        });
    });

    describe('Pluggable Resolver Injection', () => {
        it('should allow injecting a custom capability decision provider', async () => {
            const mockCustomResolver: CapabilityDecisionPort = {
                decide: vi.fn(async (context, capabilityId) => {
                    if (capabilityId === 'audio.hi_res') {
                        return {
                            allowed: true,
                            reason: 'Special preview granted',
                        };
                    }
                    return {
                        allowed: false,
                        reason: 'Not in preview tier',
                    };
                }),
            };

            setCapabilityResolver(mockCustomResolver);

            const context: CapabilityContext = {
                guildId: 'guild-preview',
                userId: 'user-vip',
            };

            const resAllowed = await checkCapability(context, 'audio.hi_res');
            expect(resAllowed.allowed).toBe(true);
            expect(resAllowed.reason).toBe('Special preview granted');

            const resDenied = await checkCapability(context, 'radio.broadcast');
            expect(resDenied.allowed).toBe(false);
            expect(resDenied.reason).toBe('Not in preview tier');

            expect(mockCustomResolver.decide).toHaveBeenCalledTimes(2);
        });

        it('should reset back to LocalCapabilityResolver when reset is called', () => {
            const dummyResolver: CapabilityDecisionPort = {
                decide: vi.fn(),
            };

            setCapabilityResolver(dummyResolver);
            expect(getCapabilityResolver()).toBe(dummyResolver);

            resetCapabilityResolver();
            expect(getCapabilityResolver()).toBeInstanceOf(LocalCapabilityResolver);
        });
    });

    describe('Denial Paths and Assertion', () => {
        it('should throw CapabilityDeniedError on assertCapability when denied', async () => {
            const rejectingResolver: CapabilityDecisionPort = {
                decide: async (_ctx, cap) => ({
                    allowed: false,
                    reason: `Tenant does not have capability ${cap}`,
                }),
            };

            setCapabilityResolver(rejectingResolver);

            const context: CapabilityContext = {
                guildId: 'guild-denied',
                installationId: 'install-denied',
            };

            await expect(assertCapability(context, 'video.transcode')).rejects.toThrow(
                CapabilityDeniedError,
            );

            try {
                await assertCapability(context, 'video.transcode');
            } catch (err: unknown) {
                expect(err).toBeInstanceOf(CapabilityDeniedError);
                const capErr = err as CapabilityDeniedError;
                expect(capErr.capabilityId).toBe('video.transcode');
                expect(capErr.reason).toBe('Tenant does not have capability video.transcode');
                expect(capErr.guildId).toBe('guild-denied');
                expect(capErr.installationId).toBe('install-denied');
            }
        });

        it('should return validUntil when provided by resolver', async () => {
            const expiry = new Date(Date.now() + 60000);
            const timeBoundedResolver: CapabilityDecisionPort = {
                decide: async () => ({
                    allowed: true,
                    reason: 'Time-limited capability grant',
                    validUntil: expiry,
                }),
            };

            setCapabilityResolver(timeBoundedResolver);

            const decision: CapabilityDecision = await checkCapability(
                { guildId: 'g1' },
                'feature.timed',
            );
            expect(decision.allowed).toBe(true);
            expect(decision.validUntil).toEqual(expiry);
        });
    });
});
