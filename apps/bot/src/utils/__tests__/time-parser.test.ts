import { describe, expect, it } from 'vitest';

import { parseSeekPosition } from '../time-parser.js';

describe('time-parser: parseSeekPosition', () => {
    const TRACK_DURATION = 300; // 5 minutes (300 seconds)

    it('should parse percentages correctly', () => {
        expect(parseSeekPosition('50%', TRACK_DURATION)).toBe(150);
        expect(parseSeekPosition('25%', TRACK_DURATION)).toBe(75);
        expect(parseSeekPosition('0%', TRACK_DURATION)).toBe(0);
        expect(parseSeekPosition('100%', TRACK_DURATION)).toBe(300);
        expect(parseSeekPosition('33.3%', TRACK_DURATION)).toBe(99);
        expect(parseSeekPosition('150%', TRACK_DURATION)).toBeNull();
        expect(parseSeekPosition('-10%', TRACK_DURATION)).toBeNull();
        expect(parseSeekPosition('50%', 0)).toBeNull();
        expect(parseSeekPosition('0%', 0)).toBe(0);
    });

    it('should parse timestamps (MM:SS and HH:MM:SS) correctly', () => {
        expect(parseSeekPosition('1:30', TRACK_DURATION)).toBe(90);
        expect(parseSeekPosition('01:30', TRACK_DURATION)).toBe(90);
        expect(parseSeekPosition('0:45', TRACK_DURATION)).toBe(45);
        expect(parseSeekPosition('4:59', TRACK_DURATION)).toBe(299);
        expect(parseSeekPosition('01:02:03', 4000)).toBe(3723);
        expect(parseSeekPosition('1:00:00', 4000)).toBe(3600);
        expect(parseSeekPosition('1:75', TRACK_DURATION)).toBeNull(); // Invalid seconds >= 60
        expect(parseSeekPosition('5:01', TRACK_DURATION)).toBeNull(); // Exceeds duration
    });

    it('should parse shorthand notations correctly', () => {
        expect(parseSeekPosition('90s', TRACK_DURATION)).toBe(90);
        expect(parseSeekPosition('2m30s', TRACK_DURATION)).toBe(150);
        expect(parseSeekPosition('2m', TRACK_DURATION)).toBe(120);
        expect(parseSeekPosition('1.5m', TRACK_DURATION)).toBe(90);
        expect(parseSeekPosition('1h', 4000)).toBe(3600);
        expect(parseSeekPosition('1h10m', 5000)).toBe(4200);
        expect(parseSeekPosition('10m', TRACK_DURATION)).toBeNull(); // Exceeds duration
    });

    it('should parse raw seconds correctly', () => {
        expect(parseSeekPosition('120', TRACK_DURATION)).toBe(120);
        expect(parseSeekPosition('0', TRACK_DURATION)).toBe(0);
        expect(parseSeekPosition('300', TRACK_DURATION)).toBe(300);
        expect(parseSeekPosition('301', TRACK_DURATION)).toBeNull(); // Exceeds duration
    });

    it('should return null for invalid inputs', () => {
        expect(parseSeekPosition('', TRACK_DURATION)).toBeNull();
        expect(parseSeekPosition('abc', TRACK_DURATION)).toBeNull();
        expect(parseSeekPosition('invalid:time', TRACK_DURATION)).toBeNull();
        expect(parseSeekPosition('::', TRACK_DURATION)).toBeNull();
        expect(parseSeekPosition('-50', TRACK_DURATION)).toBeNull();
    });
});
