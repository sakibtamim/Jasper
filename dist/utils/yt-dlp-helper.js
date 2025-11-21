import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Tries to find the yt-dlp binary.
 * 1. Checks the system PATH.
 * 2. Checks for a local binary in the project root.
 *
 * @returns {string|null} Absolute path to the binary if found, otherwise null.
 */
export function findYtDlpPath() {
    const isWin = process.platform === 'win32';
    const candidates = isWin ? ['yt-dlp.exe', 'yt-dlp'] : ['yt-dlp'];
    // 1. Try to find system-installed yt-dlp
    try {
        const whichCmd = isWin ? 'where' : 'which';
        // Prefer the standard binary name for the platform
        for (const bin of candidates) {
            const res = spawnSync(whichCmd, [bin], { encoding: 'utf8' });
            if (res.status === 0 && res.stdout) {
                const p = res.stdout.split(/\r?\n/)[0].trim();
                if (p)
                    return p;
            }
        }
    }
    catch {
        // Ignore system check failure
    }
    // 2. Check for local static binary in the project root
    // Assuming this file is in src/utils/, the root is ../../
    const root = path.resolve(__dirname, '../../');
    for (const bin of candidates) {
        const localPath = path.join(root, bin);
        if (fs.existsSync(localPath)) {
            return localPath;
        }
    }
    return null;
}
