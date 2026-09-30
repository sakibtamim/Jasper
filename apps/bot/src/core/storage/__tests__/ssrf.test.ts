import { describe, expect, it } from 'vitest';

import {
    isPrivateOrBlockedIPv4,
    isPrivateOrBlockedIPv6,
    isPrivateOrBlockedIp,
    safeFetch,
    validateSafeUrl,
} from '../ssrf.js';
import { SsrfBlockedError } from '../types.js';

describe('SSRF & Private/Link-Local Egress Protection', () => {
    describe('isPrivateOrBlockedIp', () => {
        it('should route IPv4 and IPv6 correctly and block invalid addresses', () => {
            expect(isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
            expect(isPrivateOrBlockedIp('::1')).toBe(true);
            expect(isPrivateOrBlockedIp('93.184.216.34')).toBe(false);
            expect(isPrivateOrBlockedIp('invalid-ip-format')).toBe(true);
        });
    });

    describe('isPrivateOrBlockedIPv4', () => {
        it('should block loopback addresses (127.0.0.0/8)', () => {
            expect(isPrivateOrBlockedIPv4('127.0.0.1')).toBe(true);
            expect(isPrivateOrBlockedIPv4('127.0.1.1')).toBe(true);
            expect(isPrivateOrBlockedIPv4('127.255.255.255')).toBe(true);
        });

        it('should block cloud metadata and link-local (169.254.0.0/16)', () => {
            expect(isPrivateOrBlockedIPv4('169.254.169.254')).toBe(true); // AWS / GCP / Azure metadata
            expect(isPrivateOrBlockedIPv4('169.254.1.1')).toBe(true);
        });

        it('should block RFC 1918 private IPv4 ranges', () => {
            // 10.0.0.0/8
            expect(isPrivateOrBlockedIPv4('10.0.0.1')).toBe(true);
            expect(isPrivateOrBlockedIPv4('10.255.255.255')).toBe(true);

            // 172.16.0.0/12
            expect(isPrivateOrBlockedIPv4('172.16.0.1')).toBe(true);
            expect(isPrivateOrBlockedIPv4('172.31.255.255')).toBe(true);

            // 192.168.0.0/16
            expect(isPrivateOrBlockedIPv4('192.168.0.1')).toBe(true);
            expect(isPrivateOrBlockedIPv4('192.168.1.100')).toBe(true);
        });

        it('should block reserved and special IPv4 ranges', () => {
            expect(isPrivateOrBlockedIPv4('0.0.0.0')).toBe(true);
            expect(isPrivateOrBlockedIPv4('100.64.0.1')).toBe(true); // CGNAT
            expect(isPrivateOrBlockedIPv4('192.0.2.1')).toBe(true); // TEST-NET-1
            expect(isPrivateOrBlockedIPv4('198.51.100.1')).toBe(true); // TEST-NET-2
            expect(isPrivateOrBlockedIPv4('203.0.113.1')).toBe(true); // TEST-NET-3
            expect(isPrivateOrBlockedIPv4('224.0.0.1')).toBe(true); // Multicast
            expect(isPrivateOrBlockedIPv4('240.0.0.1')).toBe(true); // Reserved
            expect(isPrivateOrBlockedIPv4('255.255.255.255')).toBe(true); // Broadcast
        });

        it('should allow legitimate public IPv4 addresses', () => {
            expect(isPrivateOrBlockedIPv4('8.8.8.8')).toBe(false);
            expect(isPrivateOrBlockedIPv4('1.1.1.1')).toBe(false);
            expect(isPrivateOrBlockedIPv4('93.184.216.34')).toBe(false);
        });
    });

    describe('isPrivateOrBlockedIPv6', () => {
        it('should block loopback and unspecified IPv6', () => {
            expect(isPrivateOrBlockedIPv6('::1')).toBe(true);
            expect(isPrivateOrBlockedIPv6('::')).toBe(true);
        });

        it('should block link-local and unique local IPv6', () => {
            expect(isPrivateOrBlockedIPv6('fe80::1')).toBe(true);
            expect(isPrivateOrBlockedIPv6('fc00::1')).toBe(true);
            expect(isPrivateOrBlockedIPv6('fd00::1234')).toBe(true);
        });

        it('should block IPv4-mapped IPv6 pointing to private addresses', () => {
            expect(isPrivateOrBlockedIPv6('::ffff:127.0.0.1')).toBe(true);
            expect(isPrivateOrBlockedIPv6('::ffff:169.254.169.254')).toBe(true);
            expect(isPrivateOrBlockedIPv6('::ffff:10.0.0.1')).toBe(true);
        });

        it('should allow public IPv6 addresses', () => {
            expect(isPrivateOrBlockedIPv6('2606:4700:4700::1111')).toBe(false);
            expect(isPrivateOrBlockedIPv6('2001:4860:4860::8888')).toBe(false);
        });
    });

    describe('validateSafeUrl', () => {
        it('should reject non-HTTP protocols', async () => {
            await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow(SsrfBlockedError);
            await expect(validateSafeUrl('ftp://example.com/file.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(validateSafeUrl('gopher://example.com')).rejects.toThrow(SsrfBlockedError);
        });

        it('should reject non-standard/internal ports by default', async () => {
            await expect(validateSafeUrl('http://example.com:22/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(validateSafeUrl('http://example.com:2375/v1/containers')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(validateSafeUrl('http://example.com:6379')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(validateSafeUrl('http://example.com:8080/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
        });

        it('should reject blocked hostnames', async () => {
            await expect(validateSafeUrl('http://localhost/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(
                validateSafeUrl('http://metadata.google.internal/computeMetadata'),
            ).rejects.toThrow(SsrfBlockedError);
            await expect(validateSafeUrl('http://instance-data/latest/meta-data')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(validateSafeUrl('http://app.local/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(validateSafeUrl('http://db.internal/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
        });

        it('should block direct private IP URLs', async () => {
            await expect(validateSafeUrl('http://127.0.0.1/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
            await expect(
                validateSafeUrl('http://169.254.169.254/latest/meta-data'),
            ).rejects.toThrow(SsrfBlockedError);
            await expect(validateSafeUrl('http://10.0.0.5/audio.mp3')).rejects.toThrow(
                SsrfBlockedError,
            );
        });

        it('should block hostnames that resolve via DNS to private IPs', async () => {
            const mockDns = async () => ['127.0.0.1'];
            await expect(
                validateSafeUrl('http://spoofed.evil.com/audio.mp3', { dnsLookupFn: mockDns }),
            ).rejects.toThrow(SsrfBlockedError);

            const mockMetadataDns = async () => ['169.254.169.254'];
            await expect(
                validateSafeUrl('http://spoofed.evil.com/audio.mp3', {
                    dnsLookupFn: mockMetadataDns,
                }),
            ).rejects.toThrow(SsrfBlockedError);
        });

        it('should allow legitimate public URLs', async () => {
            const mockDns = async () => ['93.184.216.34'];
            const result = await validateSafeUrl('https://example.com/audio.mp3', {
                dnsLookupFn: mockDns,
            });
            expect(result.url.hostname).toBe('example.com');
            expect(result.resolvedIps).toEqual(['93.184.216.34']);
        });
    });

    describe('safeFetch with Redirect Validation', () => {
        it('should block redirects to private IP addresses', async () => {
            // Mock a server redirecting to 169.254.169.254
            const dnsLookupFn = async (host: string) => {
                if (host === 'evil-redirect.com') return ['93.184.216.34'];
                return ['127.0.0.1'];
            };

            await expect(safeFetch('http://127.0.0.1/test', { dnsLookupFn })).rejects.toThrow(
                SsrfBlockedError,
            );
        });
    });
});
