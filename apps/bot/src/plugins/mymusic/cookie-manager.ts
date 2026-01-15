import { Innertube } from 'youtubei.js';

export interface CookieValidationResult {
    valid: boolean;
    format: 'header' | 'netscape';
    normalizedHeader: string;
    warnings: string[];
    hasAuthCookies: boolean;
    error?: string;
    userAgent?: string;
    healthStatus?: 'valid' | 'suspected_broken' | 'expired';
}

export interface ProbeResult {
    valid: boolean;
    error?: string;
    healthStatus: 'valid' | 'suspected_broken' | 'expired';
}

export class CookieManager {
    /**
     * Normalizes and validates a cookie string (Header or Netscape format).
     */
    static normalizeAndValidate(input: string, userAgent?: string): CookieValidationResult {
        if (!input || !input.trim()) {
            return {
                valid: false,
                format: 'header',
                normalizedHeader: '',
                warnings: [],
                hasAuthCookies: false,
                error: 'Cookie content is empty'
            };
        }

        let format: 'header' | 'netscape' = 'header';
        let header = input.trim();

        // Detect Netscape format
        if (input.includes('# Netscape HTTP Cookie File') || input.split('\n').some(l => l.includes('\t'))) {
            format = 'netscape';
            try {
                header = this.parseNetscapeCookies(input);
            } catch (e) {
                return {
                    valid: false,
                    format: 'netscape',
                    normalizedHeader: '',
                    warnings: [],
                    hasAuthCookies: false,
                    error: 'Failed to parse Netscape cookie file'
                };
            }
        }

        // Ensure SOCS=CAI is present
        if (!header.includes('SOCS=')) {
            header += '; SOCS=CAI';
        } else if (!header.includes('SOCS=CAI')) {
            // If SOCS exists but not CAI, we might want to append or replace.
            // For safety, let's just append SOCS=CAI to ensure it overrides if possible,
            // or rely on the user providing it correctly.
            // But the requirement says "If SOCS is missing... append".
            // If it's present but wrong, we might leave it or append.
            // Let's append to be safe as duplicates are often handled by taking the last one or specific one.
            // Actually, best to just append if missing.
        }

        // Tier 1 & 2 Validation
        const warnings: string[] = [];
        let hasAuthCookies = false;

        const hasLoginInfo = header.includes('LOGIN_INFO');
        const hasSapisid = header.includes('SAPISID') || header.includes('__Secure-3PAPISID');

        if (hasLoginInfo && hasSapisid) {
            hasAuthCookies = true;
        } else {
            if (!hasLoginInfo) warnings.push("Missing LOGIN_INFO cookie");
            if (!hasSapisid) warnings.push("Missing SAPISID/__Secure-3PAPISID cookie");
        }

        // Basic structural check
        if (!header.includes('youtube.com') && !header.includes('google.com') && !header.includes('SID')) {
            // If it's a header string, it might not have domain info.
            // So we check for common keys.
            if (!header.includes('SID=') && !header.includes('VISITOR_INFO1_LIVE=')) {
                // It might be valid but very minimal.
            }
        }

        return {
            valid: true,
            format,
            normalizedHeader: header,
            warnings,
            hasAuthCookies,
            userAgent,
            healthStatus: 'valid' // Default assumption until probed
        };
    }

    /**
     * Parses Netscape cookie format into a header string.
     */
    private static parseNetscapeCookies(content: string): string {
        const lines = content.split('\n');
        const cookies: string[] = [];

        for (const line of lines) {
            if (!line.trim() || line.startsWith('#')) continue;

            const parts = line.split('\t');
            if (parts.length < 7) continue;

            const domain = parts[0];
            const name = parts[5];
            const value = parts[6];

            // Filter for relevant domains
            if (domain.includes('youtube.com') || domain.includes('google.com')) {
                cookies.push(`${name}=${value.trim()}`);
            }
        }

        return cookies.join('; ');
    }

    /**
     * Tier 3: Live probe using Innertube.
     */
    /**
     * Tier 3: Live probe using Innertube.
     */
    static async probeCookie(cookieHeader: string, userAgent?: string): Promise<ProbeResult> {
        try {
            const yt = await Innertube.create({
                cookie: cookieHeader
                // userAgent note: youtubei.js does not support explicit UA in create options directly.
                // It uses internal constraints based on device_category.
            });

            // Perform a check. getGuide() is good.
            await yt.getGuide();

            return { valid: true, healthStatus: 'valid' };
        } catch (error: any) {
            const msg = error.message || '';
            let status: 'suspected_broken' | 'expired' = 'suspected_broken';

            if (msg.includes('401') || msg.includes('auth') || msg.includes('login')) {
                status = 'expired';
            }

            return {
                valid: false,
                error: msg || 'Unknown error during probe',
                healthStatus: status
            };
        }
    }

    /**
     * Converts a cookie header string to Netscape format.
     * Uses dummy values for domain/path/expiry where missing.
     */
    static toNetscape(header: string): string {
        const cookies = header.split(';').map(c => c.trim()).filter(Boolean);
        const lines = [
            '# Netscape HTTP Cookie File',
            '# This file was generated by Jasper MyMusic Plugin',
            ''
        ];

        for (const cookie of cookies) {
            const parts = cookie.split('=');
            if (parts.length < 2) continue;
            const name = parts[0];
            const value = parts.slice(1).join('='); // Handle values with =

            // Domain Flag Path Secure Expiration Name Value
            lines.push(`.youtube.com\tTRUE\t/\tFALSE\t2147483647\t${name}\t${value}`);
            lines.push(`.google.com\tTRUE\t/\tFALSE\t2147483647\t${name}\t${value}`);
        }

        return lines.join('\n');
    }
}
