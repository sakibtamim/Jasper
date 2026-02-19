const fs = require('fs');
const path = require('path');

/**
 * Parses the .env file in the current working directory.
 * @returns {Object} Key-value pairs of environment variables.
 */
function parseEnv() {
    const envPath = path.join(process.cwd(), '.env');
    const envVars = {};

    if (fs.existsSync(envPath)) {
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) return;

                const match = trimmed.match(/^([^=]+)=(.*)$/);
                if (match) {
                    let key = match[1].trim();
                    let value = match[2].trim();
                    // Remove surrounding quotes
                    if (
                        (value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))
                    ) {
                        value = value.slice(1, -1);
                    }
                    envVars[key] = value;
                }
            });
        } catch (e) {
            console.warn(`⚠️  Failed to read .env: ${e.message}`);
        }
    }
    return envVars;
}

/**
 * Substitutes variables in a string (e.g. ${VAR} or $VAR).
 * Prioritizes process.env, then falls back to parsed .env vars.
 * @param {string} str - The string to perform substitution on.
 * @param {Object} fileEnvVars - Variables parsed from .env file.
 * @returns {string} The substituted string.
 */
function substitute(str, fileEnvVars = {}) {
    if (typeof str !== 'string') return str;

    const getValue = (key) => {
        // PRECEDENCE: process.env > .env file
        if (process.env[key] !== undefined) return process.env[key];
        return fileEnvVars[key] || '';
    };

    let result = str;
    let maxIterations = 5; // Prevent infinite loops

    for (let i = 0; i < maxIterations; i++) {
        const next = result
            .replace(/\$\{([^}]+)\}/g, (_, key) => getValue(key))
            .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => getValue(key));

        if (next === result) break; // No more changes
        result = next;
    }

    return result;
}

module.exports = {
    parseEnv,
    substitute,
};
