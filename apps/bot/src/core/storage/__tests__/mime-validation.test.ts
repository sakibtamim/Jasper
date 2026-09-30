import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { describe, expect, it } from 'vitest';

import {
    SizeAndMimeValidatorStream,
    detectMimeType,
    validateMediaBuffer,
} from '../mime-validation.js';
import { FileTooLargeError, InvalidMimeTypeError } from '../types.js';

describe('Storage MIME & Stream Size Validation', () => {
    // Fixture buffers with real magic bytes
    const mp3Buffer = Buffer.concat([
        Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // ID3v2
        Buffer.alloc(64, 0xff),
    ]);

    const wavBuffer = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([0x24, 0x00, 0x00, 0x00]), // file size
        Buffer.from('WAVE', 'ascii'),
        Buffer.alloc(64, 0),
    ]);

    const oggBuffer = Buffer.concat([
        Buffer.from('OggS', 'ascii'),
        Buffer.from([0x00, 0x02]),
        Buffer.alloc(64, 0),
    ]);

    const pngBuffer = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.alloc(64, 0),
    ]);

    const jpegBuffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 0)]);

    describe('detectMimeType', () => {
        it('should correctly detect media formats from magic bytes', () => {
            expect(detectMimeType(mp3Buffer)).toBe('audio/mpeg');
            expect(detectMimeType(wavBuffer)).toBe('audio/wav');
            expect(detectMimeType(oggBuffer)).toBe('audio/ogg');
            expect(detectMimeType(pngBuffer)).toBe('image/png');
            expect(detectMimeType(jpegBuffer)).toBe('image/jpeg');
        });

        it('should return null for unrecognized buffers', () => {
            expect(detectMimeType(Buffer.from('Hello world this is plain text'))).toBeNull();
            expect(detectMimeType(Buffer.alloc(2))).toBeNull();
        });
    });

    describe('validateMediaBuffer', () => {
        it('should validate allowed media buffers successfully', () => {
            const result = validateMediaBuffer(mp3Buffer, { maxSizeBytes: 1024 });
            expect(result.mimeType).toBe('audio/mpeg');
            expect(result.size).toBe(mp3Buffer.length);
        });

        it('should throw FileTooLargeError when buffer exceeds maxSizeBytes', () => {
            expect(() => validateMediaBuffer(mp3Buffer, { maxSizeBytes: 10 })).toThrow(
                FileTooLargeError,
            );
        });

        it('should throw InvalidMimeTypeError when media type is not allowed', () => {
            const htmlBuffer = Buffer.from('<!DOCTYPE html><html><body>malicious</body></html>');
            expect(() =>
                validateMediaBuffer(htmlBuffer, {
                    allowedMimeTypes: ['audio/mpeg', 'audio/wav'],
                }),
            ).toThrow(InvalidMimeTypeError);
        });
    });

    describe('SizeAndMimeValidatorStream', () => {
        it('should stream-validate valid media without errors', async () => {
            const validator = new SizeAndMimeValidatorStream({
                maxSizeBytes: 1024 * 1024,
                allowedMimeTypes: ['audio/mpeg'],
            });

            const source = Readable.from([mp3Buffer]);
            const chunks: Buffer[] = [];

            validator.on('data', (c) => chunks.push(c));

            await pipeline(source, validator);

            const received = Buffer.concat(chunks);
            expect(received).toEqual(mp3Buffer);
            expect(validator.validatedMimeType).toBe('audio/mpeg');
            expect(validator.bytesRead).toBe(mp3Buffer.length);
        });

        it('should immediately abort and destroy stream when max size is exceeded', async () => {
            const validator = new SizeAndMimeValidatorStream({
                maxSizeBytes: 30, // Smaller than mp3Buffer length
                allowedMimeTypes: ['audio/mpeg'],
            });

            const source = Readable.from([mp3Buffer]);

            await expect(pipeline(source, validator)).rejects.toThrow(FileTooLargeError);
        });

        it('should abort stream when detected MIME type is disallowed', async () => {
            const textSource = Readable.from([Buffer.from('Unauthorized shell script content\n')]);
            const validator = new SizeAndMimeValidatorStream({
                maxSizeBytes: 1024,
                allowedMimeTypes: ['audio/mpeg', 'audio/wav'],
            });

            await expect(pipeline(textSource, validator)).rejects.toThrow(InvalidMimeTypeError);
        });
    });
});
