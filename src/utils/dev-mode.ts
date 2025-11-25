/**
 * Development mode utilities
 */

/**
 * Check if the app is running in development mode
 * @returns true if NODE_ENV is set to 'development'
 */
export function isDevMode(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Get dev mode prefix for messages
 * @returns "[DEV] " if in dev mode, empty string otherwise
 */
export function getDevPrefix(): string {
    return isDevMode() ? '[DEV] ' : '';
}
