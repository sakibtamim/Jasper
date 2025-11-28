import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PLUGINS_SRC_DIR = path.join(ROOT_DIR, 'src/plugins');
const PLUGINS_DIST_DIR = path.join(ROOT_DIR, 'dist/plugins');
const EXPORTS_DIR = path.join(ROOT_DIR, 'exports');

const pluginId = process.argv[2];

if (!pluginId) {
    console.error('Usage: npm run export-plugin <plugin-id>');
    process.exit(1);
}

const pluginSrcDir = path.join(PLUGINS_SRC_DIR, pluginId);
const pluginDistDir = path.join(PLUGINS_DIST_DIR, pluginId);

if (!fs.existsSync(pluginSrcDir)) {
    console.error(`Plugin source directory not found: ${pluginSrcDir}`);
    process.exit(1);
}

// 1. Ensure build is up to date (running full build for simplicity)
console.log('Running build...');
try {
    execSync('npm run build:backend', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (e) {
    console.error('Build failed.');
    process.exit(1);
}

if (!fs.existsSync(pluginDistDir)) {
    console.error(`Plugin dist directory not found: ${pluginDistDir}`);
    process.exit(1);
}

// 2. Prepare export directory
if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR);
}

// 3. Read version from manifest
const manifestPath = path.join(pluginSrcDir, 'jasper-plugin.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const version = manifest.version || '0.0.0';
const zipName = `${pluginId}-${version}.zip`;
const zipPath = path.join(EXPORTS_DIR, zipName);

// 4. Create temp directory for staging
const tempDir = path.join(EXPORTS_DIR, 'temp_' + pluginId);
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

console.log(`Staging files for ${pluginId} v${version}...`);

// Copy manifest
fs.copyFileSync(manifestPath, path.join(tempDir, 'jasper-plugin.json'));

// Copy backend entry (index.js)
const distEntry = path.join(pluginDistDir, 'index.js');
if (fs.existsSync(distEntry)) {
    fs.copyFileSync(distEntry, path.join(tempDir, 'index.js'));
} else {
    console.warn('Warning: No index.js found in dist.');
}

// Copy web directory
const webDistDir = path.join(pluginDistDir, 'web');
if (fs.existsSync(webDistDir)) {
    fs.cpSync(webDistDir, path.join(tempDir, 'web'), { recursive: true });
}

// Copy assets
const assetsDir = path.join(pluginSrcDir, 'assets');
if (fs.existsSync(assetsDir)) {
    fs.cpSync(assetsDir, path.join(tempDir, 'assets'), { recursive: true });
}

// 5. Zip it up
console.log(`Creating ${zipName}...`);
try {
    // Using zip command (available on Mac/Linux)
    execSync(`zip -r "${zipPath}" .`, { cwd: tempDir, stdio: 'inherit' });
    console.log(`✅ Exported to ${zipPath}`);
} catch (e) {
    console.error('Failed to create zip file.');
    console.error(e);
} finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
}
