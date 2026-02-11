import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { YT_DLP_JS_RUNTIME, YT_DLP_PLAYER_CLIENT } from "../config/env.js";



/**
 * Tries to find the yt-dlp binary.
 * 1. Checks the system PATH.
 * 2. Checks for a local binary in the project root.
 *
 * @returns {string|null} Absolute path to the binary if found, otherwise null.
 */
export function findYtDlpPath(): string | null {
  const isWin = process.platform === "win32";
  const candidates = isWin ? ["yt-dlp.exe", "yt-dlp"] : ["yt-dlp"];

  // 1. Try to find system-installed yt-dlp
  try {
    const whichCmd = isWin ? "where" : "which";
    // Prefer the standard binary name for the platform

    for (const bin of candidates) {
      const res = spawnSync(whichCmd, [bin], { encoding: "utf8" });
      if (res.status === 0 && res.stdout) {
        const p = res.stdout.split(/\r?\n/)[0].trim();
        if (p) return p;
      }
    }
  } catch {
    // Ignore system check failure
  }

  // 2. Check for local static binary in the project root
  // Use process.cwd() for more robust path resolution in both development and production
  const roots = [
    process.cwd(), // Current working directory (could be app or monorepo root)
    path.join(process.cwd(), "apps/bot"), // App root when running from monorepo root
    path.resolve(process.cwd(), "../.."), // Monorepo root when running from apps/bot
  ];

  for (const root of roots) {
    for (const bin of candidates) {
      const localPath = path.join(root, bin);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }
  }

  return null;
}

/**
 * Get base yt-dlp arguments for all invocations.
 * Reads from environment variables with sensible defaults.
 */
export function getBaseYtDlpArgs(): string[] {
  return [
    "--js-runtimes",
    YT_DLP_JS_RUNTIME,
    "--extractor-args",
    `youtube:player_client=${YT_DLP_PLAYER_CLIENT}`,
  ];
}
