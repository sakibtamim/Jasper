import path from 'node:path';

import { PathTraversalError } from './types.js';

/**
 * Validates and sanitizes a single scope identifier (such as installationId or pluginId).
 * Rejects any path separators, traversal dots, or dangerous characters.
 */
export function sanitizeIdentifier(id: string, name: string = 'identifier'): string {
    if (!id || typeof id !== 'string') {
        throw new PathTraversalError(`Invalid ${name}: identifier cannot be empty`);
    }

    const trimmed = id.trim();
    if (!trimmed) {
        throw new PathTraversalError(`Invalid ${name}: identifier cannot be blank`);
    }

    // Check for null bytes, slashes, or traversal sequences
    if (
        trimmed.includes('\0') ||
        trimmed.includes('/') ||
        trimmed.includes('\\') ||
        trimmed.includes('..') ||
        trimmed.includes('%')
    ) {
        throw new PathTraversalError(
            `Access denied: ${name} contains illegal characters or traversal tokens`,
        );
    }

    // Must match safe token format (alphanumeric, dash, underscore, colon, dot)
    if (!/^[a-zA-Z0-9_\-.:]+$/.test(trimmed) || trimmed === '.' || trimmed === '..') {
        throw new PathTraversalError(
            `Access denied: ${name} "${trimmed}" contains invalid characters`,
        );
    }

    return trimmed;
}

/**
 * Sanitizes and validates a relative path inside a scoped store.
 * Disallows traversal tokens ('..'), null bytes, backslashes, or absolute escaping.
 */
export function sanitizeRelativePath(relPath: string): string {
    if (!relPath || typeof relPath !== 'string') {
        throw new PathTraversalError('Relative path cannot be empty');
    }

    // Check for null bytes
    if (relPath.includes('\0')) {
        throw new PathTraversalError('Path contains null byte');
    }

    // Attempt URL decoding to detect obfuscated traversal attempts
    let decoded = relPath;
    try {
        decoded = decodeURIComponent(relPath);
    } catch {
        throw new PathTraversalError('Path contains malformed URL-encoded characters');
    }

    if (decoded.includes('\0')) {
        throw new PathTraversalError('Path contains null byte after decoding');
    }

    // Reject backslashes to avoid Windows/POSIX translation traversal bugs
    if (relPath.includes('\\') || decoded.includes('\\')) {
        throw new PathTraversalError('Backslashes are not permitted in storage paths');
    }

    // Check for traversal tokens before normalization
    const rawSegments = decoded.split('/');
    for (const segment of rawSegments) {
        if (segment === '..' || segment === '%2e%2e' || segment === '%2E%2E') {
            throw new PathTraversalError('Directory traversal ("..") is strictly prohibited');
        }
    }

    // Normalize path using POSIX rules
    const normalized = path.posix.normalize(relPath.replace(/^\/+/, ''));

    if (normalized.startsWith('..') || normalized === '.' || normalized.includes('/../')) {
        throw new PathTraversalError('Path resolves outside of root directory');
    }

    return normalized;
}

/**
 * Safely resolves a path under a base root directory.
 * Ensures the target path cannot escape the base directory.
 */
export function resolveSafePath(baseRoot: string, ...segments: string[]): string {
    const canonicalBase = path.resolve(baseRoot);

    // Sanitize every segment
    const sanitizedSegments: string[] = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (i === segments.length - 1 && segments.length > 1) {
            // Last segment might be a relative path with subdirectories
            sanitizedSegments.push(sanitizeRelativePath(seg));
        } else {
            // Intermediate segments are scope IDs (e.g. installationId, pluginId)
            sanitizedSegments.push(sanitizeIdentifier(seg));
        }
    }

    const fullPath = path.resolve(canonicalBase, ...sanitizedSegments);

    // Strict boundary enforcement: fullPath must be canonicalBase or a child inside it
    if (fullPath !== canonicalBase && !fullPath.startsWith(canonicalBase + path.sep)) {
        throw new PathTraversalError(
            `Resolved path "${fullPath}" escapes root boundary "${canonicalBase}"`,
        );
    }

    return fullPath;
}
