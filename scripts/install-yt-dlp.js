#!/usr/bin/env node
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

// Instead, we inline the logic to avoid dependency on build artifacts or TS files during install

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow skipping the download via env var
if (process.env.YT_DLP_SKIP_POSTINSTALL) {
  console.log('YT_DLP_SKIP_POSTINSTALL set: skipping yt-dlp download');
  process.exit(0);
}

// Where to write the binary: project root (one level up from scripts folder)
const root = path.resolve(__dirname, '..');

const isWin = process.platform === 'win32';
const assetName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;
const outPath = path.join(root, assetName);
const tmpPath = outPath + '.download';

function findYtDlpPath() {
  const candidates = isWin ? ['yt-dlp.exe', 'yt-dlp'] : ['yt-dlp'];

  // 1. Try to find system-installed yt-dlp
  try {
    const whichCmd = isWin ? 'where' : 'which';
    for (const bin of candidates) {
      const res = spawnSync(whichCmd, [bin], { encoding: 'utf8' });
      if (res.status === 0 && res.stdout) {
        const p = res.stdout.split(/\r?\n/)[0].trim();
        if (p) return p;
      }
    }
  } catch {
    // Ignore system check failure
  }

  // 2. Check for local static binary in the project root
  for (const bin of candidates) {
    const localPath = path.join(root, bin);
    if (fs.existsSync(localPath)) {
      return localPath;
    }
  }

  return null;
}

function followRedirect(url, opts, max = 10) {
  return new Promise((resolve, reject) => {
    if (max <= 0) return reject(new Error('Too many redirects'));
    const req = https.get(url, opts, (res) => {
      const status = res.statusCode;
      if (status >= 300 && status < 400 && res.headers.location) {
        // Follow the redirect
        resolve(followRedirect(res.headers.location, opts, max - 1));
      } else if (status >= 200 && status < 300) {
        resolve(res);
      } else {
        reject(new Error(`Request failed with status ${status}`));
      }
    });
    req.on('error', reject);
  });
}

(async () => {
  console.log(`Postinstall: Fetching yt-dlp for platform: ${process.platform}`);
  const existingPath = findYtDlpPath();
  if (existingPath) {
    console.log(`yt-dlp found at ${existingPath} — skipping download`);
    process.exit(0);
  }
  try {
    const res = await followRedirect(downloadUrl, { headers: { 'User-Agent': 'node.js' } });

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tmpPath, { mode: 0o755 });
      res.pipe(file);
      res.on('error', (err) => {
        file.close();
        fs.unlink(tmpPath, () => { });
        reject(err);
      });
      file.on('finish', () => {
        file.close((err) => (err ? reject(err) : resolve()));
      });
      file.on('error', (err) => {
        file.close();
        fs.unlink(tmpPath, () => { });
        reject(err);
      });
    });

    // Move tmp file to final destination
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      fs.renameSync(tmpPath, outPath);

      if (!isWin) {
        // Ensure executable permission
        fs.chmodSync(outPath, 0o755);
      }

      console.log(`yt-dlp downloaded to ${outPath}`);
    } catch (err) {
      console.warn('Failed to finalize yt-dlp binary installation:', err.message);
      // Keep the tmp file around to inspect if necessary
    }
  } catch (err) {
    console.warn('yt-dlp installation failed:', err.message);
    console.warn('If you rely on yt-dlp, please install it manually or ensure it is available in your PATH.');
    // Don't fail the postinstall - avoid breaking npm install on systems without network access
    process.exit(0);
  }
})();
