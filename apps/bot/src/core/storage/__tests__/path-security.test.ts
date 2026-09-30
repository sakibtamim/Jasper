import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveSafePath, sanitizeIdentifier, sanitizeRelativePath } from '../path-security.js';
import { PathTraversalError } from '../types.js';

describe('Storage Path Security', () => {
    const baseDir = path.join(process.cwd(), 'data', 'test-storage');

    describe('sanitizeIdentifier', () => {
        it('should allow valid alphanumeric tokens with dash, underscore, colon', () => {
            expect(sanitizeIdentifier('tenant-123')).toBe('tenant-123');
            expect(sanitizeIdentifier('plugin_soundboard')).toBe('plugin_soundboard');
            expect(sanitizeIdentifier('guild:999888777')).toBe('guild:999888777');
            expect(sanitizeIdentifier('v1.0')).toBe('v1.0');
        });

        it('should reject traversal attempts and slashes in identifiers', () => {
            expect(() => sanitizeIdentifier('..')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('../etc')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('foo/bar')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('foo\\bar')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('foo%2fbar')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('foo\0bar')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('')).toThrow(PathTraversalError);
            expect(() => sanitizeIdentifier('   ')).toThrow(PathTraversalError);
        });
    });

    describe('sanitizeRelativePath', () => {
        it('should allow clean relative paths and nested subdirectories', () => {
            expect(sanitizeRelativePath('sound.mp3')).toBe('sound.mp3');
            expect(sanitizeRelativePath('sounds/effects/boom.wav')).toBe('sounds/effects/boom.wav');
            expect(sanitizeRelativePath('/leading/slash.mp3')).toBe('leading/slash.mp3');
        });

        it('should strictly reject directory traversal attempts', () => {
            expect(() => sanitizeRelativePath('../secret.txt')).toThrow(PathTraversalError);
            expect(() => sanitizeRelativePath('sounds/../../etc/passwd')).toThrow(
                PathTraversalError,
            );
            expect(() => sanitizeRelativePath('..\\secret.txt')).toThrow(PathTraversalError);
            expect(() => sanitizeRelativePath('%2e%2e/secret.txt')).toThrow(PathTraversalError);
            expect(() => sanitizeRelativePath('sound\0.mp3')).toThrow(PathTraversalError);
            expect(() => sanitizeRelativePath('')).toThrow(PathTraversalError);
        });
    });

    describe('resolveSafePath', () => {
        it('should safely resolve paths within the base directory', () => {
            const resolved = resolveSafePath(baseDir, 'tenant-1', 'audio', 'clip.mp3');
            expect(resolved).toBe(path.join(baseDir, 'tenant-1', 'audio', 'clip.mp3'));
            expect(resolved.startsWith(baseDir)).toBe(true);
        });

        it('should throw PathTraversalError when path resolution escapes base directory', () => {
            expect(() => resolveSafePath(baseDir, '..', 'escaped.txt')).toThrow(PathTraversalError);
            expect(() => resolveSafePath(baseDir, 'tenant-1', '../../escaped.txt')).toThrow(
                PathTraversalError,
            );
        });
    });
});
