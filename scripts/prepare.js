#!/usr/bin/env node

// Skip build if this is a production install (no devDependencies)
// The prepare script runs after npm install, but we only want to build
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

if (!tscExists) {
    console.log('Skipping build: devDependencies not installed (production mode)');
    process.exit(0);
}

// Check if dist directory already exists and has content
const distPath = join(root, 'dist');
const distIndexPath = join(distPath, 'index.js');
if (existsSync(distIndexPath)) {
    console.log('Skipping build: dist/index.js already exists');
    process.exit(0);
}

// Run the build
console.log('Running build...');
const result = spawnSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true
});

process.exit(result.status || 0);
