#!/usr/bin/env node

// Skip build if this is a production install (no devDependencies)
// The prepare script runs after pnpm install, but we only want to build
// when devDependencies are available (i.e., not during --production installs)

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// Check if typescript (a devDependency) is installed
const tscPath = join(root, 'node_modules', '.bin', 'tsc');
const tscExists = existsSync(tscPath) || existsSync(tscPath + '.cmd');

// Check if dist directory already exists and has content
const distPath = join(root, 'dist');
const distIndexPath = join(distPath, 'index.js');

// The prepare script runs after pnpm install, but we only want to build
// yt-dlp if we are not in a CI environment (where it might be cached or handled differently)
// or if we explicitly want to skip it.

if (process.env.YT_DLP_SKIP_POSTINSTALL) {
    console.log('Skipping yt-dlp download (YT_DLP_SKIP_POSTINSTALL is set)');
    process.exit(0);
}

try {
    console.log('Running yt-dlp download script...');
    const result = spawnSync('pnpm', ['run', 'build'], {
        cwd: root,
        stdio: 'inherit',
        shell: true
    });
    if (result.status !== 0) {
        process.exit(result.status);
    }
} catch (e) {
    console.error('Failed to run build script:', e);
    process.exit(1);
}

process.exit(0);
