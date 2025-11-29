#!/usr/bin/env node
import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow skipping the download via env var
if (process.env.YT_DLP_SKIP_POSTINSTALL) {
  console.log('YT_DLP_SKIP_POSTINSTALL set: skipping yt-dlp download');
  process.exit(0);
}

// Inlined logic from src/utils/yt-dlp-helper.ts to avoid build dependency
function findYtDlpPath() {
  const isWin = process.platform === 'win32';
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
  // Check both app root and monorepo root
  const roots = [
    path.resolve(__dirname, '..'), // App root
    path.resolve(__dirname, '../../..') // Monorepo root
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

// Where to write the binary:
// If we are in a monorepo (detected by turbo.json in root), install to monorepo root.
// Otherwise, install to app root (standard behavior).
let root = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(__dirname, '../../..');
if (fs.existsSync(path.join(monorepoRoot, 'turbo.json'))) {
  console.log('Monorepo detected, installing to monorepo root');
  root = monorepoRoot;
}

const isWin = process.platform === 'win32';
const assetName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`;
const outPath = path.join(root, assetName);
const tmpPath = outPath + '.download';

function followRedirect(url, opts, max = 10) {
  if (max <= 0) {
    throw new Error('Too many redirects');
  }
  return new Promise((resolve, reject) => {
    https.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(followRedirect(res.headers.location, opts, max - 1));
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function downloadFile(url, dest) {
  const res = await followRedirect(url, {});
  if (res.statusCode !== 200) {
    throw new Error(`Download failed with status ${res.statusCode}`);
  }
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  return new Promise((resolve, reject) => {
    file.on('finish', () => file.close(resolve));
    file.on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  const existing = findYtDlpPath();
  if (existing) {
    console.log(`yt-dlp already available at: ${existing}`);
    return;
  }

  console.log(`Downloading yt-dlp from: ${downloadUrl}`);
  try {
    await downloadFile(downloadUrl, tmpPath);
    fs.renameSync(tmpPath, outPath);
    if (!isWin) {
      fs.chmodSync(outPath, 0o755);
    }
    console.log(`yt-dlp installed successfully to: ${outPath}`);
  } catch (err) {
    console.error('Failed to download yt-dlp:', err.message);
    console.error('You may need to manually download it from https://github.com/yt-dlp/yt-dlp/releases');
  }
})();
