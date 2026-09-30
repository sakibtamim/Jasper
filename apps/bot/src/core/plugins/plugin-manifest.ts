import { JASPER_PLUGIN_SDK_VERSION, PluginCapability, PluginManifest } from '@jasper/types';
import semver from 'semver';

import logger from '../logger.js';

export interface ManifestValidationResult {
    valid: boolean;
    errors: string[];
    manifest?: PluginManifest;
}

/**
 * Validates a plugin manifest for structure, ID constraints, semver, SDK compatibility,
 * and declared capabilities (HJ-OSS-10).
 */
export function validatePluginManifest(
    rawManifest: unknown,
    coreVersion: string = JASPER_PLUGIN_SDK_VERSION,
    strict: boolean = false,
): ManifestValidationResult {
    const errors: string[] = [];

    if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest)) {
        return {
            valid: false,
            errors: ['Plugin manifest must be a non-null JSON object'],
        };
    }

    const manifest = rawManifest as Partial<PluginManifest>;

    // 1. ID Validation
    if (!manifest.id || typeof manifest.id !== 'string') {
        errors.push("Missing required field 'id'");
    } else if (!/^[a-z0-9-]+$/.test(manifest.id)) {
        errors.push(
            `Invalid plugin 'id': '${manifest.id}'. Must be lowercase, alphanumeric, and dashes only.`,
        );
    }

    // 2. Name Validation
    if (!manifest.name || typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
        errors.push("Missing required field 'name'");
    }

    // 3. Version Validation
    if (!manifest.version || typeof manifest.version !== 'string') {
        errors.push("Missing required field 'version'");
    } else if (!semver.valid(manifest.version)) {
        errors.push(`Invalid semantic version in 'version': '${manifest.version}'`);
    }

    // 4. SDK Range / Jasper Version Compatibility
    const sdkRange = manifest.sdkVersion || manifest.jasperVersion;
    if (sdkRange) {
        if (typeof sdkRange !== 'string' || !semver.validRange(sdkRange)) {
            errors.push(`Invalid semver range in 'sdkVersion': '${sdkRange}'`);
        } else if (coreVersion && !semver.satisfies(coreVersion, sdkRange)) {
            const errorMsg = `Plugin requires SDK version range '${sdkRange}', but core version is '${coreVersion}'`;
            if (strict) {
                errors.push(errorMsg);
            } else {
                logger.warn(`[plugins] Compatibility warning: ${errorMsg}`);
            }
        }
    }

    // 5. Capabilities Validation
    if (manifest.capabilities !== undefined) {
        if (!Array.isArray(manifest.capabilities)) {
            errors.push("Field 'capabilities' must be an array of capability strings");
        } else {
            for (const cap of manifest.capabilities) {
                if (typeof cap !== 'string' || cap.trim().length === 0) {
                    errors.push(`Invalid capability '${String(cap)}': must be a non-empty string`);
                }
            }
        }
    }

    // 6. Entry file traversal prevention
    if (manifest.entry && typeof manifest.entry === 'string') {
        if (
            manifest.entry.includes('..') ||
            manifest.entry.startsWith('/') ||
            manifest.entry.startsWith('\\')
        ) {
            errors.push(
                `Invalid entry path '${manifest.entry}': must be a relative path within the plugin directory`,
            );
        }
    }

    if (errors.length > 0) {
        return {
            valid: false,
            errors,
        };
    }

    return {
        valid: true,
        errors: [],
        manifest: manifest as PluginManifest,
    };
}

/**
 * Checks whether a capability is permitted for the given plugin manifest.
 * For legacy plugins omitting 'capabilities', all standard capabilities are permitted.
 * For versioned plugins declaring 'capabilities', only explicitly listed capabilities are permitted.
 */
export function isCapabilityDeclared(
    manifest: PluginManifest | undefined,
    capability: PluginCapability,
): boolean {
    if (!manifest || manifest.capabilities === undefined) {
        // Legacy plugin fallback: allow standard capabilities
        return true;
    }

    return manifest.capabilities.includes(capability) || manifest.capabilities.includes('*');
}
