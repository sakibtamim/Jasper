/**
 * Utility to parse seek position inputs from user commands.
 * Supports:
 * - Percentages (e.g. "50%", "25.5%")
 * - Timestamps (e.g. "1:30", "02:45", "01:15:30")
 * - Shorthand duration strings (e.g. "90s", "2m30s", "1h20m", "1.5m")
 * - Raw second numbers (e.g. "90", "120")
 */
export function parseSeekPosition(input: string, totalDurationInSec: number = 0): number | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;

    // 1. Percentage (e.g., "50%", "25.5%")
    const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        if (isNaN(percent) || percent < 0 || percent > 100) return null;
        if (totalDurationInSec <= 0) {
            return percent === 0 ? 0 : null;
        }
        return Math.floor((percent / 100) * totalDurationInSec);
    }

    // 2. Colon-separated timestamps: "MM:SS" or "HH:MM:SS"
    const colonMatch = trimmed.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (colonMatch) {
        const hours = colonMatch[1] ? parseInt(colonMatch[1], 10) : 0;
        const minutes = parseInt(colonMatch[2], 10);
        const seconds = parseInt(colonMatch[3], 10);

        if (minutes >= 60 && hours > 0) return null;
        if (seconds >= 60) return null;

        const total = hours * 3600 + minutes * 60 + seconds;
        return validateDuration(total, totalDurationInSec);
    }

    // 3. Shorthand unit notation: e.g. "1h20m30s", "2m30s", "90s", "1.5m", "10m"
    const unitRegex =
        /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?)?$/i;
    const unitMatch = trimmed.match(unitRegex);
    if (unitMatch && (unitMatch[1] || unitMatch[2] || unitMatch[3])) {
        const hours = unitMatch[1] ? parseFloat(unitMatch[1]) : 0;
        const minutes = unitMatch[2] ? parseFloat(unitMatch[2]) : 0;
        const seconds = unitMatch[3] ? parseFloat(unitMatch[3]) : 0;

        const total = Math.floor(hours * 3600 + minutes * 60 + seconds);
        return validateDuration(total, totalDurationInSec);
    }

    // 4. Raw seconds: e.g. "90", "120"
    const rawNumberMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (rawNumberMatch) {
        const total = Math.floor(parseFloat(rawNumberMatch[1]));
        return validateDuration(total, totalDurationInSec);
    }

    return null;
}

function validateDuration(seconds: number, totalDurationInSec: number): number | null {
    if (isNaN(seconds) || seconds < 0) return null;
    if (totalDurationInSec > 0 && seconds > totalDurationInSec) return null;
    return seconds;
}
