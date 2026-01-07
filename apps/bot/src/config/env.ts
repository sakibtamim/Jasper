import dotenv from "dotenv";
dotenv.config();

/**
 * Centralized Environment Configuration
 *
 * This module is the single source of truth for all environment variables.
 * It provides:
 * - Type-safe access to env vars
 * - Validation functions for startup
 * - Clear documentation of required vs optional vars
 * - Sensible defaults for optional vars
 *
 * Note: Validation is lazy to allow tests to run without all env vars set.
 * Call validateBotConfig() at startup to fail fast if required vars are missing.
 */

// ============================================================================
// Helper Functions
// ============================================================================

function getOptionalEnv(name: string, defaultValue: string = ""): string {
  return process.env[name] ?? defaultValue;
}

function getOptionalNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be a number, received: "${value}"`,
    );
  }
  return parsed;
}

function getOptionalFloat(
  name: string,
  defaultValue: number,
  min?: number,
  max?: number,
): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be a number, received: "${value}"`,
    );
  }
  if (min !== undefined && parsed < min) {
    throw new Error(
      `Environment variable ${name} must be >= ${min}, received: ${parsed}`,
    );
  }
  if (max !== undefined && parsed > max) {
    throw new Error(
      `Environment variable ${name} must be <= ${max}, received: ${parsed}`,
    );
  }
  return parsed;
}

function getOptionalBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}

// ============================================================================
// Environment Variable Definitions
// ============================================================================

/**
 * Discord Bot Configuration (Required for bot operation)
 * Note: Call validateBotConfig() at startup to ensure this is set.
 */
export const DISCORD_TOKEN = getOptionalEnv("DISCORD_TOKEN");

/**
 * Discord Application Client ID
 *
 * Note: This replaces the legacy CLIENT_ID env var.
 * Used for both command deployment and OAuth2 authentication.
 */
export const DISCORD_CLIENT_ID = getOptionalEnv("DISCORD_CLIENT_ID");

/**
 * Guild ID for development command deployment
 * Required only when running deploy:commands script
 */
export const GUILD_ID = getOptionalEnv("GUILD_ID");

/**
 * Discord OAuth2 Client Secret (Required for Web UI authentication)
 */
export const DISCORD_CLIENT_SECRET = getOptionalEnv("DISCORD_CLIENT_SECRET");

/**
 * Web Server Configuration
 */
export const PORT = getOptionalNumber("PORT", 0); // 0 means web UI disabled
export const BASE_URL = getOptionalEnv("BASE_URL", "http://localhost:3000");
export const FRONTEND_URL = getOptionalEnv(
  "FRONTEND_URL",
  process.env.NODE_ENV === "development" ? "http://localhost:5173" : "",
);

/**
 * Security Configuration
 */
export const COOKIE_SECRET = getOptionalEnv("COOKIE_SECRET");
export const ENCRYPTION_KEY = getOptionalEnv("ENCRYPTION_KEY");
export const PBKDF2_ITERATIONS = getOptionalNumber("PBKDF2_ITERATIONS", 100000);

/**
 * Database Configuration
 */
export const DB_TYPE = ((): "sqlite" | "postgres" => {
  const dbType = getOptionalEnv("DB_TYPE", "sqlite");
  if (dbType !== "sqlite" && dbType !== "postgres") {
    throw new Error(
      `Invalid DB_TYPE: "${dbType}". Must be "sqlite" or "postgres".`,
    );
  }
  return dbType as "sqlite" | "postgres";
})();
export const DATABASE_URL = getOptionalEnv("DATABASE_URL");

/**
 * Cache Configuration
 */
export const CACHE_ENABLED = getOptionalBoolean("CACHE_ENABLED", false);
export const CACHE_SEARCH_TTL_HOURS = getOptionalNumber(
  "CACHE_SEARCH_TTL_HOURS",
  168,
); // 7 days
export const CACHE_AUDIO_TTL_HOURS = getOptionalNumber(
  "CACHE_AUDIO_TTL_HOURS",
  72,
); // 3 days
export const CACHE_CLEANUP_INTERVAL_HOURS = getOptionalNumber(
  "CACHE_CLEANUP_INTERVAL_HOURS",
  1,
);

/**
 * Announcement Configuration
 */
export const ANNOUNCE_CHANNEL_ID = getOptionalEnv("ANNOUNCE_CHANNEL_ID");

/**
 * yt-dlp Configuration
 */
export const YT_DLP_JS_RUNTIME = getOptionalEnv("YT_DLP_JS_RUNTIME", "node");
export const YT_DLP_PLAYER_CLIENT = getOptionalEnv(
  "YT_DLP_PLAYER_CLIENT",
  "default",
);

/**
 * AFR (Automatic Feline Rotation) Configuration
 */
export const AFR_JASPER_WEIGHT = getOptionalFloat(
  "AFR_JASPER_WEIGHT",
  0.5,
  0,
  1,
);

/**
 * Runtime Environment
 */
export const NODE_ENV = getOptionalEnv("NODE_ENV", "production");
export const isProduction = NODE_ENV === "production";
export const isDevelopment = NODE_ENV === "development";

// ============================================================================
// Worker Bot Tokens (Dynamic)
// ============================================================================

export interface WorkerToken {
  name: string;
  token: string;
}

/**
 * Dynamically loaded worker bot tokens
 * Finds all environment variables ending in _TOKEN (excluding DISCORD_TOKEN)
 */
export function getWorkerTokens(): WorkerToken[] {
  const workers: WorkerToken[] = [];

  Object.keys(process.env).forEach((key) => {
    if (key.endsWith("_TOKEN") && key !== "DISCORD_TOKEN") {
      const token = process.env[key];
      if (!token) return;

      // Extract name: MISTY_TOKEN -> Misty, MY_BOT_TOKEN -> My Bot
      const name = key
        .replace("_TOKEN", "")
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      workers.push({ name, token });
    }
  });

  return workers;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that DISCORD_TOKEN is set
 * Call this at bot startup
 */
export function validateBotConfig(): void {
  if (!DISCORD_TOKEN) {
    throw new Error("Missing required environment variable: DISCORD_TOKEN");
  }
}

export function validateAuthConfig(): void {
  const problems: string[] = [];

  if (!DISCORD_CLIENT_ID) {
    problems.push("DISCORD_CLIENT_ID is missing");
  }
  if (!DISCORD_CLIENT_SECRET) {
    problems.push("DISCORD_CLIENT_SECRET is missing");
  }
  if (!COOKIE_SECRET) {
    problems.push("COOKIE_SECRET is missing");
  } else if (isProduction && COOKIE_SECRET.length < 32) {
    problems.push(
      "COOKIE_SECRET must be at least 32 characters long in production",
    );
  }
  if (!ENCRYPTION_KEY) {
    problems.push("ENCRYPTION_KEY is missing");
  } else if (isProduction && ENCRYPTION_KEY.length < 32) {
    problems.push(
      "ENCRYPTION_KEY must be at least 32 characters long in production",
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `Authentication configuration error(s): ${problems.join("; ")}`,
    );
  }
}

/**
 * Validate that all required command deployment env vars are set
 * Call this before deploying commands
 */
export function validateDeployConfig(): void {
  const missing: string[] = [];

  if (!DISCORD_CLIENT_ID) missing.push("DISCORD_CLIENT_ID");
  if (!GUILD_ID) missing.push("GUILD_ID");
  if (!DISCORD_TOKEN) missing.push("DISCORD_TOKEN");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for command deployment: ${missing.join(", ")}`,
    );
  }
}

/**
 * Validate database configuration for PostgreSQL
 */
export function validatePostgresConfig(): void {
  if (DB_TYPE === "postgres" && !DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DB_TYPE is 'postgres'");
  }
}
