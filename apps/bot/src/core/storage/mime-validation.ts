import { Transform, TransformCallback } from 'node:stream';

import { FileTooLargeError, InvalidMimeTypeError } from './types.js';

export const DEFAULT_ALLOWED_AUDIO_MIMES = [
    'audio/mpeg',
    'audio/ogg',
    'audio/opus',
    'audio/wav',
    'audio/x-wav',
    'audio/flac',
    'audio/webm',
    'audio/aac',
];

export const DEFAULT_ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const DEFAULT_ALLOWED_MEDIA_MIMES = [
    ...DEFAULT_ALLOWED_AUDIO_MIMES,
    ...DEFAULT_ALLOWED_IMAGE_MIMES,
];

/**
 * Detects MIME type from magic bytes header in a buffer.
 */
export function detectMimeType(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) {
        return null;
    }

    // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'image/png';
    }

    // 2. JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    // 3. GIF: GIF87a or GIF89a
    if (
        buffer.length >= 6 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
    ) {
        return 'image/gif';
    }

    // 4. RIFF container: WAV or WEBP
    if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46
    ) {
        const subtype = buffer.subarray(8, 12).toString('ascii');
        if (subtype === 'WAVE') return 'audio/wav';
        if (subtype === 'WEBP') return 'image/webp';
    }

    // 5. Ogg container (Opus / Vorbis): OggS (4F 67 67 53)
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
        // Can be audio/ogg or audio/opus
        return 'audio/ogg';
    }

    // 6. FLAC: fLaC (66 4C 61 43)
    if (buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
        return 'audio/flac';
    }

    // 7. MP3 with ID3v2 tag: ID3 (49 44 33)
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
        return 'audio/mpeg';
    }

    // 8. MP3 frame sync without ID3: 0xFF followed by 0xFB, 0xF3, or 0xF2
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
        const layer = (buffer[1] >> 1) & 0x03;
        if (layer === 1) {
            // Layer III
            return 'audio/mpeg';
        }
        if (layer === 0) {
            // AAC ADTS frame sync
            return 'audio/aac';
        }
    }

    // 9. WebM / Matroska: 1A 45 DF A3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
        return 'audio/webm';
    }

    return null;
}

/**
 * Validates a buffer in-memory against maximum size and allowed MIME types.
 */
export function validateMediaBuffer(
    buffer: Buffer,
    options: {
        maxSizeBytes?: number;
        allowedMimeTypes?: string[];
        declaredMime?: string;
    },
): { mimeType: string; size: number } {
    const maxSizeBytes = options.maxSizeBytes ?? 50 * 1024 * 1024;
    const allowed = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MEDIA_MIMES;

    if (buffer.length > maxSizeBytes) {
        throw new FileTooLargeError(maxSizeBytes, buffer.length);
    }

    const detected = detectMimeType(buffer);
    const effectiveMime = detected || options.declaredMime || null;

    if (!effectiveMime || !allowed.includes(effectiveMime)) {
        throw new InvalidMimeTypeError(effectiveMime, allowed);
    }

    return { mimeType: effectiveMime, size: buffer.length };
}

/**
 * A Transform stream that validates incoming media chunks in real time:
 * - Verifies total stream size does not exceed maxSizeBytes (fails immediately upon overflow).
 * - Inspects initial magic bytes to detect and enforce allowed MIME types.
 */
export class SizeAndMimeValidatorStream extends Transform {
    private maxSizeBytes: number;
    private allowedMimeTypes: string[];
    private declaredMime?: string;
    private totalBytesRead: number = 0;
    private headerBuffer: Buffer = Buffer.alloc(0);
    private mimeVerified: boolean = false;
    private detectedMime: string | null = null;

    constructor(options: {
        maxSizeBytes?: number;
        allowedMimeTypes?: string[];
        declaredMime?: string;
    }) {
        super();
        this.maxSizeBytes = options.maxSizeBytes ?? 50 * 1024 * 1024;
        this.allowedMimeTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MEDIA_MIMES;
        this.declaredMime = options.declaredMime;
    }

    get bytesRead(): number {
        return this.totalBytesRead;
    }

    get validatedMimeType(): string {
        return this.detectedMime || this.declaredMime || 'application/octet-stream';
    }

    override _transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: TransformCallback,
    ): void {
        this.totalBytesRead += chunk.length;

        // 1. Enforce size limit
        if (this.totalBytesRead > this.maxSizeBytes) {
            callback(new FileTooLargeError(this.maxSizeBytes, this.totalBytesRead));
            return;
        }

        // 2. Accumulate header to inspect MIME type
        if (!this.mimeVerified) {
            this.headerBuffer = Buffer.concat([this.headerBuffer, chunk]);

            // Need at least 16 bytes for reliable magic number detection
            if (this.headerBuffer.length >= 16) {
                this.verifyMimeHeader(callback, chunk);
                return;
            }
        }

        this.push(chunk);
        callback();
    }

    override _flush(callback: TransformCallback): void {
        if (!this.mimeVerified && this.headerBuffer.length > 0) {
            this.verifyMimeHeader(callback);
            return;
        }
        callback();
    }

    private verifyMimeHeader(callback: TransformCallback, currentChunk?: Buffer): void {
        const detected = detectMimeType(this.headerBuffer);
        this.detectedMime = detected;
        const candidate = detected || this.declaredMime;

        if (!candidate || !this.allowedMimeTypes.includes(candidate)) {
            callback(new InvalidMimeTypeError(candidate || null, this.allowedMimeTypes));
            return;
        }

        this.mimeVerified = true;
        if (currentChunk) {
            this.push(currentChunk);
        }
        callback();
    }
}
