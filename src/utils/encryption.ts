import crypto from 'crypto';
import { PBKDF2_ITERATIONS } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives a key from the encryption key using PBKDF2
 */
function deriveKey(key: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(key, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

/**
 * Encrypts a string value
 * @param text - The plaintext to encrypt
 * @param encryptionKey - The encryption key from environment
 * @returns Base64-encoded encrypted data with format: salt:iv:authTag:encrypted
 */
export function encrypt(text: string, encryptionKey: string): string {
    if (!text) return text;

    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(encryptionKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine: salt:iv:authTag:encrypted
    return `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string value
 * @param encryptedData - The encrypted data in format: salt:iv:authTag:encrypted
 * @param encryptionKey - The encryption key from environment
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedData: string, encryptionKey: string): string {
    if (!encryptedData) return encryptedData;

    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
    }

    const [saltB64, ivB64, authTagB64, encrypted] = parts;

    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const key = deriveKey(encryptionKey, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
