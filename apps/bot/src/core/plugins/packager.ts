import {
    JASPER_PLUGIN_SDK_VERSION,
    PackagePluginOptions,
    PluginArtifactFileEntry,
    PluginArtifactManifest,
    PluginIntegrityVerificationResult,
    PluginManifest,
    PluginPackageResult,
    PluginSignatureVerifier,
    PluginTrustPolicy,
    ProductionPluginReleaseMetadata,
    RuntimeProfile,
} from '@jasper/types';
import AdmZip from 'adm-zip';
import archiver from 'archiver';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { RUNTIME_PROFILE } from '../../config/env.js';
import {
    EXCLUDED_PRODUCTION_PLUGIN_IDS,
    PRODUCTION_PLUGIN_IDS,
    isExcludedFromProduction,
    isProductionPlugin,
} from '../../config/plugins.js';
import logger from '../logger.js';
import { PluginManager } from './plugin-manager.js';
import { validatePluginManifest } from './plugin-manifest.js';

/**
 * Deterministic fixed timestamp for ZIP archives to ensure reproducible SHA-256 digests.
 * 2026-01-01T00:00:00.000Z
 */
export const DETERMINISTIC_ZIP_DATE = new Date('2026-01-01T00:00:00.000Z');

/**
 * Standard normalized file mode for archived files (0644 / rw-r--r--).
 */
export const DETERMINISTIC_FILE_MODE = 0o644;

/**
 * Standard patterns to ignore during plugin packaging to ensure purity and reproducibility.
 */
export const PACKAGING_IGNORE_PATTERNS: RegExp[] = [
    /^\.git(\/|$)/,
    /^\.github(\/|$)/,
    /^\.turbo(\/|$)/,
    /^\.vscode(\/|$)/,
    /^\.idea(\/|$)/,
    /^\.env(\..*)?$/,
    /^\.DS_Store$/,
    /^Thumbs\.db$/,
    /^node_modules(\/|$)/,
    /^coverage(\/|$)/,
    /^temp_.*(\/|$)/,
    /^exports(\/|$)/,
    /(^|\/)__tests__(\/|$)/,
    /\.(test|spec)\.[jt]sx?$/,
    /\.(test|spec)\.d\.ts$/,
    /\.map$/,
];

/**
 * Compares two relative paths using deterministic Unicode code-point ordering.
 */
export function comparePaths(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Deterministically stringifies an object by recursively sorting its keys.
 */
export function canonicalJsonStringify(val: unknown): string {
    if (val === null || typeof val !== 'object') {
        return JSON.stringify(val);
    }

    if (Array.isArray(val)) {
        return `[${val.map((item) => canonicalJsonStringify(item)).join(',')}]`;
    }

    const record = val as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort(comparePaths);
    const parts = sortedKeys
        .filter((k) => record[k] !== undefined)
        .map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(record[k])}`);

    return `{${parts.join(',')}}`;
}

/**
 * Calculates the SHA-256 hash of a buffer.
 */
export function computeSha256(buffer: Buffer | Uint8Array | string): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Checks whether a relative path matches any packaging ignore pattern.
 */
export function shouldIgnoreFile(relativePath: string): boolean {
    const normalized = relativePath.replace(/\\/g, '/');
    const baseName = path.basename(normalized);

    // Filter dotfiles
    if (baseName.startsWith('.') && baseName !== '.eslintrc.json') {
        return true;
    }

    for (const pattern of PACKAGING_IGNORE_PATTERNS) {
        if (pattern.test(normalized)) {
            return true;
        }
    }
    return false;
}

export interface DiscoveredFile {
    relativePath: string;
    absolutePath: string;
    content: Buffer;
    size: number;
    sha256: string;
}

/**
 * Recursively collects and normalizes all non-ignored files in a plugin directory.
 * Returns file list sorted by relative path in Unicode code-point order.
 */
export async function collectPluginFiles(
    pluginDir: string,
    filterDevFiles = true,
): Promise<DiscoveredFile[]> {
    const results: DiscoveredFile[] = [];

    async function scan(currentDir: string): Promise<void> {
        const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            const relativePath = path.relative(pluginDir, fullPath).replace(/\\/g, '/');

            if (filterDevFiles && shouldIgnoreFile(relativePath)) {
                continue;
            }

            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (entry.isFile()) {
                const content = await fs.promises.readFile(fullPath);
                results.push({
                    relativePath,
                    absolutePath: fullPath,
                    content,
                    size: content.length,
                    sha256: computeSha256(content),
                });
            }
        }
    }

    await scan(pluginDir);
    results.sort((a, b) => comparePaths(a.relativePath, b.relativePath));
    return results;
}

/**
 * Deterministically packs a set of files into a reproducible ZIP buffer.
 */
export function createDeterministicZipBuffer(
    files: Array<{ relativePath: string; content: Buffer }>,
    fixedDate: Date = DETERMINISTIC_ZIP_DATE,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const archive = archiver('zip', {
            zlib: { level: 9 },
            forceLocalTime: false,
        });

        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('error', (err) => reject(err));
        archive.on('end', () => resolve(Buffer.concat(chunks)));

        // Ensure files are appended in sorted order
        const sorted = [...files].sort((a, b) => comparePaths(a.relativePath, b.relativePath));

        for (const file of sorted) {
            archive.append(file.content, {
                name: file.relativePath,
                date: fixedDate,
                mode: DETERMINISTIC_FILE_MODE,
            });
        }

        archive.finalize();
    });
}

/**
 * Deterministically packages a plugin directory into a reproducible ZIP artifact and manifest.
 */
export async function packagePlugin(options: PackagePluginOptions): Promise<PluginPackageResult> {
    const pluginDir = path.resolve(options.pluginDir);

    if (!fs.existsSync(pluginDir)) {
        throw new Error(`Plugin directory does not exist: ${pluginDir}`);
    }

    const manifestPath = path.join(pluginDir, 'jasper-plugin.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`jasper-plugin.json not found in plugin directory: ${pluginDir}`);
    }

    const manifestRaw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
    const validation = validatePluginManifest(manifestRaw, JASPER_PLUGIN_SDK_VERSION, true);
    if (!validation.valid || !validation.manifest) {
        throw new Error(`Invalid plugin manifest: ${validation.errors.join('; ')}`);
    }
    const validatedManifest = validation.manifest;

    // Collect all plugin files
    const files = await collectPluginFiles(pluginDir, options.filterDevFiles ?? true);

    const fileEntries: PluginArtifactFileEntry[] = files.map((f) => ({
        path: f.relativePath,
        sha256: f.sha256,
        size: f.size,
    }));

    const fixedDate = options.fixedDate || DETERMINISTIC_ZIP_DATE;

    // Build artifact manifest descriptor (excluding archiveSha256 initially)
    const artifactManifest: PluginArtifactManifest = {
        id: validatedManifest.id,
        name: validatedManifest.name,
        version: validatedManifest.version,
        sdkVersion: validatedManifest.sdkVersion || '1.0.0',
        entry: validatedManifest.entry || 'index.js',
        capabilities: validatedManifest.capabilities || [],
        archiveSha256: '', // populated below
        files: fileEntries,
        createdAt: fixedDate.toISOString(),
        web: validatedManifest.web,
        sbom: options.sbom,
    };

    // Embed checksums.json into the archive for file-level integrity checks
    const checksumsContent = Buffer.from(
        canonicalJsonStringify({
            pluginId: artifactManifest.id,
            version: artifactManifest.version,
            files: fileEntries,
        }),
        'utf8',
    );

    const archiveFiles = [
        ...files.map((f) => ({ relativePath: f.relativePath, content: f.content })),
        { relativePath: 'checksums.json', content: checksumsContent },
    ];

    // Build the deterministic archive buffer
    const archiveBuffer = await createDeterministicZipBuffer(archiveFiles, fixedDate);
    const archiveSha256 = computeSha256(archiveBuffer);

    artifactManifest.archiveSha256 = archiveSha256;

    // Optional cryptographic signing
    if (options.signFn) {
        artifactManifest.signature = await options.signFn(artifactManifest, archiveBuffer);
        artifactManifest.signer = options.signer || 'release-authority';
    } else if (options.signature) {
        artifactManifest.signature = options.signature;
        artifactManifest.signer = options.signer || 'release-authority';
    }

    // Write to outDir if specified
    if (options.outDir) {
        const outDir = path.resolve(options.outDir);
        if (!fs.existsSync(outDir)) {
            await fs.promises.mkdir(outDir, { recursive: true });
        }

        const zipPath = path.join(outDir, `${artifactManifest.id}-${artifactManifest.version}.zip`);
        const manifestOutPath = path.join(
            outDir,
            `${artifactManifest.id}-${artifactManifest.version}.manifest.json`,
        );

        await fs.promises.writeFile(zipPath, archiveBuffer);
        await fs.promises.writeFile(
            manifestOutPath,
            canonicalJsonStringify(artifactManifest),
            'utf8',
        );
        logger.info(`[packager] Wrote deterministic artifact to ${zipPath}`);
    }

    return {
        pluginId: artifactManifest.id,
        version: artifactManifest.version,
        archiveBuffer,
        archiveSha256,
        manifest: artifactManifest,
        fileCount: archiveFiles.length,
        totalBytes: archiveBuffer.length,
    };
}

export interface VerifyArchiveOptions {
    expectedArchiveSha256?: string;
    expectedPluginId?: string;
    expectedVersion?: string;
    signatureVerifier?: PluginSignatureVerifier;
}

/**
 * Validates the integrity of a plugin ZIP archive buffer.
 * Performs zip-slip checks, manifest validation, internal checksum validation,
 * and optional archive SHA-256 and signature checks.
 */
export async function verifyPluginArchive(
    archiveBuffer: Buffer,
    options?: VerifyArchiveOptions,
): Promise<PluginIntegrityVerificationResult> {
    const errors: string[] = [];

    if (!archiveBuffer || archiveBuffer.length === 0) {
        return { valid: false, errors: ['Archive buffer is empty or null'] };
    }

    const actualArchiveSha256 = computeSha256(archiveBuffer);

    if (options?.expectedArchiveSha256 && options.expectedArchiveSha256 !== actualArchiveSha256) {
        errors.push(
            `Archive SHA-256 digest mismatch (tampering detected): expected "${options.expectedArchiveSha256}", got "${actualArchiveSha256}"`,
        );
    }

    let zip: AdmZip;
    try {
        zip = new AdmZip(archiveBuffer);
    } catch (err) {
        return {
            valid: false,
            archiveSha256: actualArchiveSha256,
            errors: [
                `Failed to read ZIP archive: ${err instanceof Error ? err.message : String(err)}`,
            ],
        };
    }

    const zipEntries = zip.getEntries();
    const entryMap = new Map<string, AdmZip.IZipEntry>();

    // 1. Zip-slip and path security check
    for (const entry of zipEntries) {
        const entryName = entry.entryName.replace(/\\/g, '/');

        // Check for directory traversal
        if (
            entryName.includes('../') ||
            entryName.startsWith('/') ||
            entryName.startsWith('\\') ||
            /^[a-zA-Z]:/.test(entryName)
        ) {
            errors.push(`Malicious entry detected (Zip Slip): "${entryName}"`);
        }

        entryMap.set(entryName, entry);
    }

    // 2. Validate manifest
    const manifestEntry = entryMap.get('jasper-plugin.json');
    if (!manifestEntry) {
        errors.push('Archive missing required jasper-plugin.json manifest');
        return { valid: false, archiveSha256: actualArchiveSha256, errors };
    }

    let manifest: PluginArtifactManifest;
    try {
        const manifestRaw = JSON.parse(manifestEntry.getData().toString('utf8'));
        const validation = validatePluginManifest(manifestRaw, JASPER_PLUGIN_SDK_VERSION, true);
        if (!validation.valid || !validation.manifest) {
            errors.push(`Invalid jasper-plugin.json manifest: ${validation.errors.join('; ')}`);
            return { valid: false, archiveSha256: actualArchiveSha256, errors };
        }
        const validated = validation.manifest;
        manifest = {
            id: validated.id,
            name: validated.name,
            version: validated.version,
            sdkVersion: validated.sdkVersion || '1.0.0',
            entry: validated.entry || 'index.js',
            capabilities: validated.capabilities || [],
            archiveSha256: actualArchiveSha256,
            files: [],
            createdAt: manifestRaw.createdAt || new Date().toISOString(),
            signer: manifestRaw.signer,
            signature: manifestRaw.signature,
            web: validated.web,
            sbom: manifestRaw.sbom,
        };
    } catch (err) {
        errors.push(
            `Invalid jasper-plugin.json manifest: ${err instanceof Error ? err.message : String(err)}`,
        );
        return { valid: false, archiveSha256: actualArchiveSha256, errors };
    }

    if (options?.expectedPluginId && manifest.id !== options.expectedPluginId) {
        errors.push(
            `Plugin ID mismatch: expected "${options.expectedPluginId}", found "${manifest.id}"`,
        );
    }

    if (options?.expectedVersion && manifest.version !== options.expectedVersion) {
        errors.push(
            `Plugin version mismatch: expected "${options.expectedVersion}", found "${manifest.version}"`,
        );
    }

    // 3. File checksum validation
    const checksumsEntry = entryMap.get('checksums.json');
    if (checksumsEntry) {
        try {
            const checksums = JSON.parse(checksumsEntry.getData().toString('utf8'));
            if (Array.isArray(checksums.files)) {
                manifest.files = checksums.files;
                for (const file of checksums.files as PluginArtifactFileEntry[]) {
                    const entry = entryMap.get(file.path);
                    if (!entry) {
                        errors.push(`Manifest references missing archive file: "${file.path}"`);
                        continue;
                    }
                    const entryData = entry.getData();
                    const entrySha256 = computeSha256(entryData);
                    if (entrySha256 !== file.sha256) {
                        errors.push(
                            `File "${file.path}" content hash mismatch (tampered file): expected ${file.sha256}, got ${entrySha256}`,
                        );
                    }
                }
            }
        } catch (err) {
            errors.push(
                `Failed to parse embedded checksums.json: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    // 4. Signature validation hook
    if (options?.signatureVerifier && manifest.signature) {
        try {
            const isVerified = await options.signatureVerifier(manifest, archiveBuffer);
            if (!isVerified) {
                errors.push(
                    `Cryptographic signature verification failed for plugin "${manifest.id}"`,
                );
            }
        } catch (err) {
            errors.push(
                `Signature verifier threw error: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    return {
        valid: errors.length === 0,
        pluginId: manifest.id,
        version: manifest.version,
        archiveSha256: actualArchiveSha256,
        errors,
        manifest,
    };
}

export interface PluginTrustCheckOptions {
    profile: RuntimeProfile;
    isBrowserUpload?: boolean;
    allowlistPluginIds?: readonly string[];
    trustedSigners?: readonly string[];
    requireSignatures?: boolean;
    signatureVerifier?: PluginSignatureVerifier;
    archiveBuffer?: Buffer;
}

/**
 * Asserts that a plugin satisfies the active environment's trust policy.
 * Under hosted profile:
 * - Browser/untrusted client uploads fail closed immediately.
 * - Non-production or excluded plugins (like sound-effect-plugin) are rejected.
 * - Only approved production plugins or explicit allowlisted IDs are permitted.
 * - Cryptographic signatures or verified release manifests can be enforced.
 */
export async function assertPluginTrust(
    manifest: PluginManifest | PluginArtifactManifest,
    options: PluginTrustCheckOptions,
): Promise<void> {
    const profile = options.profile ?? RUNTIME_PROFILE;

    if (profile === 'hosted') {
        // 1. Fail closed on arbitrary browser / API uploads
        if (options.isBrowserUpload) {
            throw new Error(
                'Hosted runtime profile violation: Arbitrary plugin uploads from browser or untrusted clients are prohibited in hosted profile.',
            );
        }

        // 2. Reject plugins explicitly excluded from production (such as sound-effect-plugin or test plugins)
        if (isExcludedFromProduction(manifest.id)) {
            throw new Error(
                `Hosted trust policy violation: Plugin "${manifest.id}" is excluded from hosted production runtime.`,
            );
        }

        // 3. Enforce production allowlist
        const allowedList = options.allowlistPluginIds || PRODUCTION_PLUGIN_IDS;
        if (!allowedList.includes(manifest.id)) {
            throw new Error(
                `Hosted trust policy violation: Plugin "${manifest.id}" is not in the approved production plugin inventory. Allowed: ${allowedList.join(', ')}`,
            );
        }

        // 4. Signature policy enforcement if configured
        const artifactManifest = manifest as PluginArtifactManifest;
        if (options.requireSignatures) {
            if (!artifactManifest.signature) {
                throw new Error(
                    `Hosted trust policy violation: Plugin "${manifest.id}" is missing required release signature.`,
                );
            }

            if (
                options.trustedSigners &&
                (!artifactManifest.signer ||
                    !options.trustedSigners.includes(artifactManifest.signer))
            ) {
                throw new Error(
                    `Hosted trust policy violation: Plugin "${manifest.id}" signer "${artifactManifest.signer}" is not in trusted signers list.`,
                );
            }

            if (options.signatureVerifier && options.archiveBuffer) {
                const verified = await options.signatureVerifier(
                    artifactManifest,
                    options.archiveBuffer,
                );
                if (!verified) {
                    throw new Error(
                        `Hosted trust policy violation: Signature verification failed for plugin "${manifest.id}".`,
                    );
                }
            }
        }
    } else {
        // Self-hosted profile
        if (options.allowlistPluginIds && !options.allowlistPluginIds.includes(manifest.id)) {
            throw new Error(
                `Trust policy violation: Plugin "${manifest.id}" is not allowlisted in self-hosted configuration.`,
            );
        }
    }
}

/**
 * Safely extracts a verified plugin archive into the target directory.
 */
export async function unpackPluginArchive(
    archiveBuffer: Buffer,
    targetDir: string,
    options?: VerifyArchiveOptions,
): Promise<{ pluginDir: string; manifest: PluginArtifactManifest }> {
    const verification = await verifyPluginArchive(archiveBuffer, options);
    if (!verification.valid || !verification.manifest) {
        throw new Error(`Cannot unpack invalid plugin archive: ${verification.errors.join('; ')}`);
    }

    const resolvedTarget = path.resolve(targetDir);
    if (!fs.existsSync(resolvedTarget)) {
        await fs.promises.mkdir(resolvedTarget, { recursive: true });
    }

    const zip = new AdmZip(archiveBuffer);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const entryPath = entry.entryName.replace(/\\/g, '/');
        const destPath = path.resolve(resolvedTarget, entryPath);

        // Double zip-slip assertion
        if (!destPath.startsWith(resolvedTarget + path.sep) && destPath !== resolvedTarget) {
            throw new Error(`Zip slip detected during extraction: "${entry.entryName}"`);
        }

        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
            await fs.promises.mkdir(parentDir, { recursive: true });
        }

        await fs.promises.writeFile(destPath, entry.getData());
    }

    return {
        pluginDir: resolvedTarget,
        manifest: verification.manifest,
    };
}

export interface BootPluginFromArchiveOptions
    extends VerifyArchiveOptions, PluginTrustCheckOptions {
    targetDir: string;
}

/**
 * Boots a plugin directly from a ZIP archive buffer:
 * 1. Verifies archive integrity & tamper detection.
 * 2. Enforces trust policy.
 * 3. Unpacks safely to staging destination.
 * 4. Loads and registers the plugin in PluginManager.
 */
export async function bootPluginFromArchive(
    pluginManager: PluginManager,
    archiveBuffer: Buffer,
    options: BootPluginFromArchiveOptions,
): Promise<void> {
    // 1. Verify archive
    const verification = await verifyPluginArchive(archiveBuffer, options);
    if (!verification.valid || !verification.manifest) {
        throw new Error(`Archive verification failed: ${verification.errors.join('; ')}`);
    }

    // 2. Assert trust policy
    await assertPluginTrust(verification.manifest, {
        ...options,
        archiveBuffer,
    });

    // 3. Unpack to target directory
    const { pluginDir, manifest } = await unpackPluginArchive(
        archiveBuffer,
        options.targetDir,
        options,
    );

    // 4. Locate entry point
    const entryFile = manifest.entry || 'index.js';
    const entryPath = path.resolve(pluginDir, entryFile);
    if (!fs.existsSync(entryPath)) {
        throw new Error(
            `Plugin entry file "${entryFile}" not found after extraction in ${pluginDir}`,
        );
    }

    // 5. Dynamic import and register in PluginManager
    const fileUrl = pathToFileURL(entryPath).href;
    const pluginModule = await import(`${fileUrl}?t=${Date.now()}`);
    const plugin = pluginModule.default || pluginModule;

    await pluginManager.registerPlugin(plugin, manifest, pluginDir);
}

export interface GenerateReleaseMetadataOptions {
    releaseVersion: string;
    pluginsDir: string;
    signFn?: (manifestDigest: string) => Promise<string> | string;
    signer?: string;
}

/**
 * Generates signed release metadata for the initial production inventory:
 * - Confirms inclusion of approved production plugins (Garage Band, Soundboard).
 * - Excludes Sound Effect and demo/test plugins.
 * - Computes deterministic archive hashes.
 * - Signs the release metadata digest.
 */
export async function generateProductionReleaseMetadata(
    options: GenerateReleaseMetadataOptions,
): Promise<ProductionPluginReleaseMetadata> {
    const inventory: ProductionPluginReleaseMetadata['inventory'] = [];

    for (const pluginId of PRODUCTION_PLUGIN_IDS) {
        const pluginFolder = path.join(options.pluginsDir, pluginId);
        if (!fs.existsSync(pluginFolder)) {
            logger.warn(
                `[packager] Production plugin "${pluginId}" not found on disk at ${pluginFolder}`,
            );
            continue;
        }

        const packageResult = await packagePlugin({
            pluginDir: pluginFolder,
            filterDevFiles: true,
        });

        inventory.push({
            id: packageResult.manifest.id,
            name: packageResult.manifest.name,
            version: packageResult.manifest.version,
            archiveSha256: packageResult.archiveSha256,
            status: 'production',
        });
    }

    inventory.sort((a, b) => comparePaths(a.id, b.id));

    const excludedPlugins = [...EXCLUDED_PRODUCTION_PLUGIN_IDS].sort(comparePaths);

    const canonicalInventory = canonicalJsonStringify({
        releaseVersion: options.releaseVersion,
        inventory,
        excludedPlugins,
    });

    const manifestDigest = computeSha256(canonicalInventory);

    let signature: string | undefined;
    if (options.signFn) {
        signature = await options.signFn(manifestDigest);
    }

    return {
        releaseVersion: options.releaseVersion,
        generatedAt: DETERMINISTIC_ZIP_DATE.toISOString(),
        inventory,
        excludedPlugins,
        manifestDigest,
        signature,
        signer: options.signer || (signature ? 'release-authority' : undefined),
    };
}
