import dns from 'node:dns';
import net from 'node:net';

import logger from '../logger.js';
import { SafeFetchOptions, SsrfBlockedError } from './types.js';

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'instance-data',
    'metadata',
]);

const DEFAULT_ALLOWED_PORTS = [80, 443];

/**
 * Checks whether an IPv4 address is in a private, link-local, loopback, or reserved range.
 */
export function isPrivateOrBlockedIPv4(ip: string): boolean {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return true; // Malformed IPv4 is blocked
    }

    const [a, b, c] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 10.0.0.0/8 (RFC 1918 Private)
    if (a === 10) return true;

    // 100.64.0.0/10 (Shared Address Space / Carrier Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 169.254.0.0/16 (Link-Local / AWS/Azure/GCP Cloud Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (RFC 1918 Private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;

    // 192.168.0.0/16 (RFC 1918 Private)
    if (a === 192 && b === 168) return true;

    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved) & 255.255.255.255 (Broadcast)
    if (a >= 240) return true;

    return false;
}

/**
 * Checks whether an IPv6 address is in a private, link-local, loopback, or reserved range.
 */
export function isPrivateOrBlockedIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase().trim();

    // Check for IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
    const ipv4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (ipv4MappedMatch) {
        return isPrivateOrBlockedIPv4(ipv4MappedMatch[1]);
    }

    // Unspecified ::/128
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    // Loopback ::1/128
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

    // IPv4-compatible (::x.x.x.x)
    const ipv4CompatMatch = normalized.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (ipv4CompatMatch) {
        return isPrivateOrBlockedIPv4(ipv4CompatMatch[1]);
    }

    // Link-local: fe80::/10 (fe8x, fe9x, feax, febx)
    if (/^fe[89ab][0-9a-f]/i.test(normalized)) return true;

    // Unique Local: fc00::/7 (fcxx, fdxx)
    if (/^f[cd][0-9a-f]{2}/i.test(normalized)) return true;

    // Multicast: ff00::/8
    if (/^ff[0-9a-f]{2}/i.test(normalized)) return true;

    // Discard-only: 100::/64
    if (normalized.startsWith('100:')) return true;

    // Documentation: 2001:db8::/32
    if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return true;

    return false;
}

/**
 * Validates any IP address (IPv4 or IPv6) against blocked ranges.
 */
export function isPrivateOrBlockedIp(ip: string): boolean {
    const ipType = net.isIP(ip);
    if (ipType === 4) {
        return isPrivateOrBlockedIPv4(ip);
    } else if (ipType === 6) {
        return isPrivateOrBlockedIPv6(ip);
    }
    // If not recognized as a valid IP, block it for safety
    return true;
}

/**
 * Validates a target URL against SSRF rules:
 * - Scheme must be http: or https:
 * - Hostname cannot be private or internal
 * - Resolves all DNS records and ensures none point to private/link-local/loopback IPs
 */
export async function validateSafeUrl(
    urlString: string,
    options?: SafeFetchOptions,
): Promise<{ url: URL; resolvedIps: string[] }> {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(urlString);
    } catch {
        throw new SsrfBlockedError(`Invalid URL format: "${urlString}"`);
    }

    // Enforce protocol
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new SsrfBlockedError(
            `Unsupported protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are permitted`,
        );
    }

    // Enforce port
    const port = parsedUrl.port
        ? parseInt(parsedUrl.port, 10)
        : parsedUrl.protocol === 'https:'
          ? 443
          : 80;

    const allowedPorts = options?.allowedPorts ?? DEFAULT_ALLOWED_PORTS;
    if (!allowedPorts.includes(port)) {
        throw new SsrfBlockedError(
            `Port ${port} is not permitted for remote ingestion. Allowed ports: ${allowedPorts.join(', ')}`,
        );
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Check blocked hostnames
    if (
        BLOCKED_HOSTNAMES.has(hostname) ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.lan') ||
        hostname.endsWith('.home.arpa')
    ) {
        throw new SsrfBlockedError(`Access to internal hostname "${hostname}" is blocked`);
    }

    // If hostname is directly an IP address
    const directIpType = net.isIP(hostname);
    if (directIpType > 0) {
        if (isPrivateOrBlockedIp(hostname)) {
            throw new SsrfBlockedError(
                `Access to private/link-local/loopback IP "${hostname}" is blocked`,
            );
        }
        return { url: parsedUrl, resolvedIps: [hostname] };
    }

    // DNS resolution to verify all target IPs
    let resolvedIps: string[] = [];
    if (options?.dnsLookupFn) {
        resolvedIps = await options.dnsLookupFn(hostname);
    } else {
        try {
            const records = await dns.promises.lookup(hostname, { all: true });
            resolvedIps = records.map((r) => r.address);
        } catch (err) {
            throw new SsrfBlockedError(
                `DNS lookup failed for host "${hostname}": ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    if (!resolvedIps.length) {
        throw new SsrfBlockedError(
            `DNS resolution returned no IP addresses for host "${hostname}"`,
        );
    }

    for (const ip of resolvedIps) {
        if (isPrivateOrBlockedIp(ip)) {
            throw new SsrfBlockedError(
                `Host "${hostname}" resolved to prohibited IP address "${ip}". Egress blocked.`,
            );
        }
    }

    return { url: parsedUrl, resolvedIps };
}

/**
 * Performs a safe HTTP fetch with SSRF validation across initial request and all redirects.
 */
export async function safeFetch(urlString: string, options?: SafeFetchOptions): Promise<Response> {
    const maxRedirects = options?.maxRedirects ?? 3;
    const timeoutMs = options?.timeoutMs ?? 15000;

    let currentUrl = urlString;
    let redirectCount = 0;

    while (redirectCount <= maxRedirects) {
        // Validate URL and resolved IPs before connecting
        const { url: validatedUrl } = await validateSafeUrl(currentUrl, options);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(validatedUrl.toString(), {
                method: 'GET',
                headers: options?.headers,
                signal: controller.signal,
                redirect: 'manual', // Crucial: inspect redirects manually
            });

            // Check if response is a redirect
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                redirectCount++;
                if (redirectCount > maxRedirects) {
                    throw new SsrfBlockedError(
                        `Maximum redirect limit of ${maxRedirects} exceeded`,
                    );
                }

                const location = response.headers.get('location');
                if (!location) {
                    throw new SsrfBlockedError('Redirect response missing Location header');
                }

                // Resolve relative redirect against current URL
                currentUrl = new URL(location, validatedUrl).toString();
                logger.debug(
                    `[storage:ssrf] Following safe redirect (${redirectCount}/${maxRedirects}) to ${currentUrl}`,
                );
                continue;
            }

            return response;
        } catch (err) {
            if (err instanceof SsrfBlockedError) {
                throw err;
            }
            if (err instanceof Error && err.name === 'AbortError') {
                throw new Error(`Fetch request timed out after ${timeoutMs}ms`);
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    throw new SsrfBlockedError(`Exceeded maximum redirect limit (${maxRedirects})`);
}
