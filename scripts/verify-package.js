/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const distDirs = [
    path.join(rootDir, 'apps', 'bot', 'dist'),
    path.join(rootDir, 'apps', 'web', 'dist'),
];

console.log('🔍 Starting production package verification...');

let errorsFound = 0;
let checkedFilesCount = 0;

const forbiddenPatterns = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /__tests__/,
    /\.test\.d\.ts$/,
    /\.spec\.d\.ts$/,
];

function checkDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.error(
            `❌ ERROR: Production output directory missing: ${path.relative(rootDir, dirPath)}`,
        );
        errorsFound++;
        return;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(rootDir, fullPath);

        if (entry.isDirectory()) {
            if (entry.name === '__tests__') {
                console.error(
                    `❌ FORBIDDEN: Found __tests__ directory in production output: ${relativePath}`,
                );
                errorsFound++;
            } else {
                checkDirectory(fullPath);
            }
        } else if (entry.isFile()) {
            checkedFilesCount++;
            for (const pattern of forbiddenPatterns) {
                if (pattern.test(entry.name)) {
                    console.error(
                        `❌ FORBIDDEN: Found test source/artifact in production bundle: ${relativePath}`,
                    );
                    errorsFound++;
                }
            }
        }
    }
}

// Check bot dist specifically
const botDist = path.join(rootDir, 'apps', 'bot', 'dist');
if (!fs.existsSync(botDist)) {
    console.error(`❌ ERROR: Bot build directory missing: ${path.relative(rootDir, botDist)}`);
    console.error('Please run "pnpm run build" before running package verification.');
    process.exit(1);
}

const botEntry = path.join(botDist, 'index.js');
if (!fs.existsSync(botEntry)) {
    console.error(`❌ ERROR: Bot entry file missing: ${path.relative(rootDir, botEntry)}`);
    errorsFound++;
} else {
    console.log(`✅ Found bot entry: ${path.relative(rootDir, botEntry)}`);
}

// Check web dist specifically
const webDist = path.join(rootDir, 'apps', 'web', 'dist');
if (!fs.existsSync(webDist)) {
    console.error(`❌ ERROR: Web build directory missing: ${path.relative(rootDir, webDist)}`);
    console.error('Please run "pnpm run build" before running package verification.');
    errorsFound++;
} else {
    const webEntry = path.join(webDist, 'index.html');
    if (!fs.existsSync(webEntry)) {
        console.error(`❌ ERROR: Web entry file missing: ${path.relative(rootDir, webEntry)}`);
        errorsFound++;
    } else {
        console.log(`✅ Found web entry: ${path.relative(rootDir, webEntry)}`);
    }
}

for (const dir of distDirs) {
    checkDirectory(dir);
}

if (errorsFound > 0) {
    console.error(
        `\n💥 Packaging Verification FAILED: Found ${errorsFound} issue(s) across ${checkedFilesCount} checked files.`,
    );
    process.exit(1);
} else {
    console.log(
        `\n✨ Packaging Verification PASSED: Clean build verified across ${checkedFilesCount} output files.`,
    );
    process.exit(0);
}
