import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PLUGINS_SRC_DIR = path.join(ROOT_DIR, 'src/plugins');
const PLUGINS_DIST_DIR = path.join(ROOT_DIR, 'dist/plugins');
const EXPORTS_DIR = path.join(ROOT_DIR, 'exports');

const PLUGIN_ID = process.argv[2];

if (!PLUGIN_ID) {
    console.error('Usage: pnpm run export-plugin <plugin-id>');
    process.exit(1);
}

const PLUGIN_DIR = path.join(ROOT_DIR, 'apps', 'bot', 'plugins', PLUGIN_ID);
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'plugins', PLUGIN_ID);
const OUTPUT_ZIP = path.join(ROOT_DIR, 'exports', `${PLUGIN_ID}.zip`);

// Ensure plugin exists
if (!fs.existsSync(PLUGIN_DIR)) {
    console.error(`Plugin not found: ${PLUGIN_DIR}`);
    process.exit(1);
}

console.log(`Exporting plugin: ${PLUGIN_ID}...`);

// 1. Build the backend
console.log('Building backend...');
try {
    execSync('pnpm run build:backend', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (e) {
    console.error('Build failed.');
    process.exit(1);
}

if (!fs.existsSync(DIST_DIR)) {
    console.error(`Plugin dist directory not found: ${DIST_DIR}`);
    process.exit(1);
}

// 2. Prepare export directory
if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR);
}

// 3. Read version from manifest
const manifestPath = path.join(PLUGIN_DIR, 'jasper-plugin.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const version = manifest.version || '0.0.0';
const zipName = `${PLUGIN_ID}-${version}.zip`;
const zipPath = path.join(EXPORTS_DIR, zipName);

// 4. Create temp directory for staging
const tempDir = path.join(EXPORTS_DIR, 'temp_' + PLUGIN_ID);
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

console.log(`Staging files for ${PLUGIN_ID} v${version}...`);

// Copy manifest
fs.copyFileSync(manifestPath, path.join(tempDir, 'jasper-plugin.json'));

// Copy backend entry (index.js)
const distEntry = path.join(DIST_DIR, 'index.js');
if (fs.existsSync(distEntry)) {
    fs.copyFileSync(distEntry, path.join(tempDir, 'index.js'));
} else {
    console.warn('Warning: No index.js found in dist.');
}

// Copy web directory
const webDistDir = path.join(DIST_DIR, 'web');
if (fs.existsSync(webDistDir)) {
    fs.cpSync(webDistDir, path.join(tempDir, 'web'), { recursive: true });
}

// Copy assets
const assetsDir = path.join(PLUGIN_DIR, 'assets');
if (fs.existsSync(assetsDir)) {
    fs.cpSync(assetsDir, path.join(tempDir, 'assets'), { recursive: true });
}

// 5. Zip it up
console.log(`Creating ${zipName}...`);

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function () {
    console.log(`✅ Exported to ${zipPath} (${archive.pointer()} total bytes)`);
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
});

archive.on('error', function (err) {
    console.error('Failed to create zip file.');
    console.error(err);
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
});

archive.pipe(output);
archive.directory(tempDir, false);
archive.finalize();
