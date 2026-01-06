import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import db from "../db/index.js";
import logger from "../logger.js";
import { YtDlpCookie } from "../db/types.js";

export class CookieManager {
  private static instance: CookieManager;

  private constructor() {}

  public static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  /**
   * Gets the best available cookie for usage.
   * Writes the decrypted content to a temporary file and returns the path.
   * Returns null if no active cookies are available.
   */
  async getBestCookiePath(): Promise<{
    path: string;
    cookieId: number;
  } | null> {
    try {
      const cookie = await db.getBestCookie();
      if (!cookie) {
        logger.debug("[CookieManager] No active cookies found.");
        return null;
      }

      logger.debug(
        `[CookieManager] Found best cookie: ${cookie.id} (${cookie.name})`,
      );
      const tempFilePath = await this.writeCookieToTempFile(cookie);
      return { path: tempFilePath, cookieId: cookie.id };
    } catch (error) {
      logger.error(`[CookieManager] Failed to get best cookie: ${error}`);
      return null;
    }
  }

  /**
   * Writes cookie content to a temporary file.
   */
  private async writeCookieToTempFile(cookie: YtDlpCookie): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `yt-dlp-cookie-${uuidv4()}.txt`;
    const filePath = path.join(tempDir, fileName);

    await fs.promises.writeFile(filePath, cookie.content, "utf8");
    return filePath;
  }

  /**
   * Cleans up a temporary cookie file.
   */
  async cleanupCookieFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      logger.warn(
        `[CookieManager] Failed to cleanup cookie file ${filePath}: ${error}`,
      );
    }
  }

  /**
   * Reports the result of a cookie usage.
   */
  async reportUsage(cookieId: number, success: boolean): Promise<void> {
    try {
      logger.debug(
        `[CookieManager] Reporting usage for cookie ${cookieId}: success=${success}`,
      );
      await db.rotateCookieStats(cookieId, success);
    } catch (error) {
      logger.error(
        `[CookieManager] Failed to report usage for cookie ${cookieId}: ${error}`,
      );
    }
  }

  /**
   * Wrapper to execute a function with cookie rotation/retry logic.
   * @param operation Function that takes a cookie path (or null) and returns a promise.
   * @param retries Number of retries allowed.
   */
  async withCookieRetry<T>(
    operation: (cookiePath: string | null) => Promise<T>,
    retries: number = 3,
  ): Promise<T> {
    // Enforce a hard limit on retries to prevent infinite loops or excessive delays
    const MAX_RETRIES = parseInt(process.env.MAX_COOKIE_RETRIES || "5", 10);
    const effectiveRetries = Math.min(retries, MAX_RETRIES);

    let lastError: any;
    let attempt = 0;
    const usedCookieIds = new Set<number>();

    // Try with cookies first if available
    while (attempt <= effectiveRetries) {
      const cookieData = await this.getBestCookiePath();

      // If we get the same cookie again, or if we've already tried this one,
      // we might want to skip it or just accept that we're retrying.
      // For now, let's just proceed.

      const cookiePath = cookieData?.path || null;
      const cookieId = cookieData?.cookieId;

      if (cookiePath) {
        logger.debug(
          `[CookieManager] Attempt ${attempt + 1}/${effectiveRetries + 1} using cookie ${cookieId}`,
        );
      } else {
        logger.debug(
          `[CookieManager] Attempt ${attempt + 1}/${effectiveRetries + 1} without cookie`,
        );
      }

      // Avoid retrying the same cookie in the same operation loop if possible
      // (This requires getBestCookie to support excluding IDs, which it currently doesn't,
      // but we can at least track what we've used)
      if (cookieId && usedCookieIds.has(cookieId)) {
        // If we're getting the same cookie, maybe we should just fail or wait?
        // For now, let's continue but log a warning.
        logger.debug(`[CookieManager] Retrying with same cookie ${cookieId}`);
      }
      if (cookieId) usedCookieIds.add(cookieId);

      try {
        const result = await operation(cookiePath);

        if (cookieId) {
          await this.reportUsage(cookieId, true);
        }

        if (cookiePath) {
          await this.cleanupCookieFile(cookiePath);
        }

        return result;
      } catch (error: any) {
        lastError = error;
        logger.warn(`[CookieManager] Operation failed: ${error.message}`);

        if (cookieId) {
          // Check if error is related to auth
          const isAuthError =
            error.message &&
            (error.message.includes("Sign in to confirm you’re not a bot") ||
              error.message.includes("cookies"));

          // Only mark as failure if it's an auth error
          if (isAuthError) {
            await this.reportUsage(cookieId, false);
            logger.warn(
              `[CookieManager] Cookie ${cookieId} failed auth check. Retrying... (Attempt ${attempt + 1}/${effectiveRetries})`,
            );
          } else {
            logger.warn(
              `[CookieManager] Operation failed with cookie ${cookieId}: ${error.message}`,
            );
          }
        }

        if (cookiePath) {
          await this.cleanupCookieFile(cookiePath);
        }

        attempt++;
      }
    }

    throw lastError;
  }
}

export default CookieManager.getInstance();
