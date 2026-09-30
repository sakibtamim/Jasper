import {
    CapabilityContext,
    CapabilityDecision,
    CapabilityDecisionPort,
    GuildInstallationContext,
} from '@jasper/types';

import logger from './logger.js';

/**
 * Error thrown when a capability check fails under assertion.
 */
export class CapabilityDeniedError extends Error {
    readonly capabilityId: string;
    readonly reason: string;
    readonly guildId?: string;
    readonly installationId?: string;

    constructor(
        capabilityId: string,
        reason: string = 'Capability not granted',
        context?: CapabilityContext | GuildInstallationContext,
    ) {
        super(`Capability '${capabilityId}' denied: ${reason}`);
        this.name = 'CapabilityDeniedError';
        this.capabilityId = capabilityId;
        this.reason = reason;
        this.guildId = context?.guildId;
        this.installationId = context?.installationId;
    }
}

export interface LocalCapabilityResolverOptions {
    /**
     * Optional explicit set of allowed capabilities for local testing.
     * When undefined (default), all capabilities are unconditionally allowed.
     */
    allowedCapabilities?: ReadonlySet<string> | string[];
    /**
     * Optional explicit set of denied capabilities for local testing.
     */
    deniedCapabilities?: ReadonlySet<string> | string[];
    /**
     * Default reason string when granting access.
     */
    defaultReason?: string;
}

/**
 * Default provider-neutral local capability resolver (HJ-OSS-17).
 *
 * Implements an unconditional all-free resolver for local/self-hosted environments.
 * Core contains no plan, price, payment provider, trial, or subscription concepts.
 * Grants every requested capability by default.
 */
export class LocalCapabilityResolver implements CapabilityDecisionPort {
    private allowed?: ReadonlySet<string>;
    private denied?: ReadonlySet<string>;
    private defaultReason: string;

    constructor(options?: LocalCapabilityResolverOptions) {
        if (options?.allowedCapabilities) {
            this.allowed =
                options.allowedCapabilities instanceof Set
                    ? options.allowedCapabilities
                    : new Set(options.allowedCapabilities);
        }
        if (options?.deniedCapabilities) {
            this.denied =
                options.deniedCapabilities instanceof Set
                    ? options.deniedCapabilities
                    : new Set(options.deniedCapabilities);
        }
        this.defaultReason = options?.defaultReason ?? 'Granted by local capability resolver';
    }

    async decide(
        context: CapabilityContext | GuildInstallationContext,
        capabilityId: string,
    ): Promise<CapabilityDecision> {
        if (!capabilityId) {
            return {
                allowed: false,
                reason: 'Capability ID must be provided',
            };
        }

        // Check explicit denial set if configured
        if (this.denied && this.denied.has(capabilityId)) {
            logger.debug(
                `[capabilities] Capability '${capabilityId}' denied for guild ${context.guildId} by local policy`,
            );
            return {
                allowed: false,
                reason: `Capability '${capabilityId}' is disabled by local configuration`,
            };
        }

        // Check explicit allow set if configured
        if (this.allowed && !this.allowed.has(capabilityId)) {
            logger.debug(
                `[capabilities] Capability '${capabilityId}' not in allowed set for guild ${context.guildId}`,
            );
            return {
                allowed: false,
                reason: `Capability '${capabilityId}' is not in local allowlist`,
            };
        }

        // Unconditional local grant (default behavior)
        return {
            allowed: true,
            reason: this.defaultReason,
        };
    }
}

// Active capability resolver registry
let activeResolver: CapabilityDecisionPort = new LocalCapabilityResolver();

/**
 * Retrieve the active capability decision resolver port.
 */
export function getCapabilityResolver(): CapabilityDecisionPort {
    return activeResolver;
}

/**
 * Inject a custom capability decision resolver port.
 */
export function setCapabilityResolver(resolver: CapabilityDecisionPort): void {
    activeResolver = resolver;
}

/**
 * Reset the active capability decision resolver port to default LocalCapabilityResolver.
 */
export function resetCapabilityResolver(): void {
    activeResolver = new LocalCapabilityResolver();
}

/**
 * Evaluate capability decision for the given context and capabilityId.
 */
export async function checkCapability(
    context: CapabilityContext | GuildInstallationContext,
    capabilityId: string,
): Promise<CapabilityDecision> {
    const resolver = getCapabilityResolver();
    return await resolver.decide(context, capabilityId);
}

/**
 * Returns true if capability is allowed, false otherwise.
 */
export async function hasCapability(
    context: CapabilityContext | GuildInstallationContext,
    capabilityId: string,
): Promise<boolean> {
    const decision = await checkCapability(context, capabilityId);
    return decision.allowed;
}

/**
 * Asserts that the capability is allowed, throwing CapabilityDeniedError if denied.
 */
export async function assertCapability(
    context: CapabilityContext | GuildInstallationContext,
    capabilityId: string,
): Promise<void> {
    const decision = await checkCapability(context, capabilityId);
    if (!decision.allowed) {
        throw new CapabilityDeniedError(capabilityId, decision.reason, context);
    }
}

export default {
    LocalCapabilityResolver,
    CapabilityDeniedError,
    getCapabilityResolver,
    setCapabilityResolver,
    resetCapabilityResolver,
    checkCapability,
    hasCapability,
    assertCapability,
};
