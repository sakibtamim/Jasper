import {
    Command,
    JASPER_PLUGIN_SDK_VERSION,
    PluginArtifactManifest,
    PluginContext,
} from '@jasper/types';
import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EXCLUDED_PRODUCTION_PLUGIN_IDS,
    PRODUCTION_PLUGIN_IDS,
    isExcludedFromProduction,
    isProductionPlugin,
} from '../../../config/plugins.js';
import {
    assertPluginTrust,
    bootPluginFromArchive,
    canonicalJsonStringify,
    collectPluginFiles,
    computeSha256,
    generateProductionReleaseMetadata,
    packagePlugin,
    unpackPluginArchive,
    verifyPluginArchive,
} from '../packager.js';
import { PluginManager } from '../plugin-manager.js';

describe('Deterministic Plugin Packager & Trust Policy (HJ-OSS-12)', () => {
    let tempDir: string;
    let fixtureDir: string;
    let mockClient: any;
    let mockServer: any;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'packager-test-'));
        fixtureDir = path.join(tempDir, 'fixture-plugin');
        fs.mkdirSync(fixtureDir, { recursive: true });

        mockClient = {
            commands: new Map<string, Command>(),
            on: vi.fn(),
            off: vi.fn(),
            options: { intents: { bitfield: 0 } },
            user: { id: 'bot-123', tag: 'Jasper#0001' },
            token: 'secret-controller-token',
        };

        mockServer = {
            all: vi.fn(),
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            register: vi.fn(),
        };
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        vi.restoreAllMocks();
    });

    // Helper to create a multi-module fixture plugin
    function createMultiModuleFixture(
        pluginId: string = 'multi-module-plugin',
        extraFiles: Record<string, string> = {},
    ): string {
        const dir = path.join(tempDir, pluginId);
        fs.mkdirSync(dir, { recursive: true });

        const manifest = {
            id: pluginId,
            name: 'Multi Module Plugin',
            version: '1.2.0',
            sdkVersion: `^${JASPER_PLUGIN_SDK_VERSION}`,
            entry: 'index.js',
            capabilities: ['commands:register', 'routes:register', 'storage:read'],
            web: {
                entry: 'web/index.js',
            },
        };

        fs.writeFileSync(
            path.join(dir, 'jasper-plugin.json'),
            JSON.stringify(manifest, null, 2),
            'utf8',
        );

        fs.mkdirSync(path.join(dir, 'helpers'), { recursive: true });
        fs.writeFileSync(
            path.join(dir, 'helpers', 'math.js'),
            'export function add(a, b) { return a + b; }\n',
            'utf8',
        );

        fs.writeFileSync(
            path.join(dir, 'index.js'),
            `import { add } from './helpers/math.js';
export default {
    name: 'Multi Module Plugin',
    version: '1.2.0',
    onLoad: async (ctx) => {
        const sum = add(10, 20);
        ctx.registerCommand({
            data: { name: 'calc', description: 'Calculator command' },
            execute: async () => sum,
        });
    },
    onUnload: async () => {},
};
`,
            'utf8',
        );

        fs.mkdirSync(path.join(dir, 'web'), { recursive: true });
        fs.writeFileSync(
            path.join(dir, 'web', 'index.js'),
            'export const Widget = () => "Hello from web";\n',
            'utf8',
        );

        for (const [relPath, content] of Object.entries(extraFiles)) {
            const target = path.join(dir, relPath);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, content, 'utf8');
        }

        return dir;
    }

    describe('1. Archive Determinism & File Filtering', () => {
        it('packages a multi-module fixture deterministically with identical SHA-256 digests', async () => {
            const dir = createMultiModuleFixture('det-plugin');

            // Package first time
            const pkg1 = await packagePlugin({ pluginDir: dir });

            // Ensure delay and change file timestamps to test immunity to filesystem mtime
            await new Promise((r) => setTimeout(r, 50));
            fs.utimesSync(path.join(dir, 'index.js'), new Date(1000), new Date(1000));
            fs.utimesSync(path.join(dir, 'helpers', 'math.js'), new Date(50000), new Date(50000));

            // Package second time
            const pkg2 = await packagePlugin({ pluginDir: dir });

            expect(pkg1.archiveSha256).toBe(pkg2.archiveSha256);
            expect(pkg1.archiveBuffer.equals(pkg2.archiveBuffer)).toBe(true);
            expect(pkg1.manifest.files).toEqual(pkg2.manifest.files);
        });

        it('excludes hidden files, .git, .DS_Store, test directories, and node_modules from archive', async () => {
            const dir = createMultiModuleFixture('filter-plugin', {
                '.git/config': '[core] repositoryformatversion = 0',
                '.DS_Store': 'binary-junk',
                '.env': 'SECRET=hidden',
                '.env.local': 'LOCAL_SECRET=hidden',
                '__tests__/unit.test.ts': 'test("dummy", () => {})',
                'helpers/calc.spec.js': 'describe("calc", () => {})',
                'node_modules/dep/index.js': 'module.exports = {}',
                'temp_scratch/data.txt': 'junk',
            });

            const pkg = await packagePlugin({ pluginDir: dir });
            const filePaths = pkg.manifest.files.map((f) => f.path);

            expect(filePaths).toContain('jasper-plugin.json');
            expect(filePaths).toContain('index.js');
            expect(filePaths).toContain('helpers/math.js');
            expect(filePaths).toContain('web/index.js');

            // All ignored files must be absent
            expect(filePaths).not.toContain('.git/config');
            expect(filePaths).not.toContain('.DS_Store');
            expect(filePaths).not.toContain('.env');
            expect(filePaths).not.toContain('.env.local');
            expect(filePaths).not.toContain('__tests__/unit.test.ts');
            expect(filePaths).not.toContain('helpers/calc.spec.js');
            expect(filePaths).not.toContain('node_modules/dep/index.js');
            expect(filePaths).not.toContain('temp_scratch/data.txt');
        });

        it('sorts files deterministically regardless of readdir order', async () => {
            const dir = createMultiModuleFixture('sort-plugin', {
                'z_file.js': 'const z = 1;',
                'a_file.js': 'const a = 1;',
                'm_folder/b_file.js': 'const b = 1;',
            });

            const files = await collectPluginFiles(dir, true);
            const paths = files.map((f) => f.relativePath);

            // Must be strictly ordered
            const expected = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
            expect(paths).toEqual(expected);
        });
    });

    describe('2. Manifest Integrity & Tamper Detection', () => {
        it('verifies a valid archive successfully', async () => {
            const dir = createMultiModuleFixture('valid-plugin');
            const pkg = await packagePlugin({ pluginDir: dir });

            const verification = await verifyPluginArchive(pkg.archiveBuffer, {
                expectedArchiveSha256: pkg.archiveSha256,
                expectedPluginId: 'valid-plugin',
                expectedVersion: '1.2.0',
            });

            expect(verification.valid).toBe(true);
            expect(verification.errors).toHaveLength(0);
            expect(verification.archiveSha256).toBe(pkg.archiveSha256);
            expect(verification.pluginId).toBe('valid-plugin');
            expect(verification.version).toBe('1.2.0');
        });

        it('detects tampering when archive buffer is modified by even 1 byte', async () => {
            const dir = createMultiModuleFixture('tamper-plugin');
            const pkg = await packagePlugin({ pluginDir: dir });

            // Mutate 1 byte in the archive buffer
            const tamperedBuffer = Buffer.from(pkg.archiveBuffer);
            tamperedBuffer[tamperedBuffer.length - 15] ^= 0xff;

            const verification = await verifyPluginArchive(tamperedBuffer, {
                expectedArchiveSha256: pkg.archiveSha256,
            });

            expect(verification.valid).toBe(false);
            expect(
                verification.errors.some((e) => e.includes('Archive SHA-256 digest mismatch')),
            ).toBe(true);
        });

        it('detects tampering of internal file contents within the archive', async () => {
            const dir = createMultiModuleFixture('file-tamper-plugin');
            const pkg = await packagePlugin({ pluginDir: dir });

            // Reconstruct archive with tampered file content preserving original checksums.json
            const origZip = new AdmZip(pkg.archiveBuffer);
            const tamperedZip = new AdmZip();
            for (const entry of origZip.getEntries()) {
                if (entry.entryName === 'helpers/math.js') {
                    tamperedZip.addFile(
                        'helpers/math.js',
                        Buffer.from('// Malicious code replacement\n'),
                    );
                } else {
                    tamperedZip.addFile(entry.entryName, entry.getData());
                }
            }
            const tamperedArchive = tamperedZip.toBuffer();

            const verification = await verifyPluginArchive(tamperedArchive);
            expect(verification.valid).toBe(false);
            expect(
                verification.errors.some((e) =>
                    e.includes('File "helpers/math.js" content hash mismatch'),
                ),
            ).toBe(true);
        });

        it('rejects zip files with malicious Zip Slip path traversal', async () => {
            const maliciousZip = new AdmZip();
            maliciousZip.addFile(
                'jasper-plugin.json',
                Buffer.from(
                    JSON.stringify({
                        id: 'evil-plugin',
                        name: 'Evil',
                        version: '1.0.0',
                        entry: 'index.js',
                    }),
                ),
            );
            maliciousZip.addFile('payload.sh', Buffer.from('root:x:0:0:root:/root:/bin/bash'));
            // Mutate entry name in memory to produce a true zip-slip entry
            maliciousZip.getEntries()[1].entryName = '../../etc/passwd';
            const buffer = maliciousZip.toBuffer();

            const verification = await verifyPluginArchive(buffer);
            expect(verification.valid).toBe(false);
            expect(
                verification.errors.some((e) => e.includes('Malicious entry detected (Zip Slip)')),
            ).toBe(true);
        });

        it('fails verification if archive is missing jasper-plugin.json', async () => {
            const emptyZip = new AdmZip();
            emptyZip.addFile('readme.txt', Buffer.from('Hello'));
            const buffer = emptyZip.toBuffer();

            const verification = await verifyPluginArchive(buffer);
            expect(verification.valid).toBe(false);
            expect(
                verification.errors.some((e) =>
                    e.includes('Archive missing required jasper-plugin.json manifest'),
                ),
            ).toBe(true);
        });

        it('fails verification if plugin declares an incompatible SDK version', async () => {
            const dir = createMultiModuleFixture('incompatible-sdk');
            const manifestPath = path.join(dir, 'jasper-plugin.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest.sdkVersion = '^99.0.0';
            fs.writeFileSync(manifestPath, JSON.stringify(manifest));

            // Packaging strict should throw error
            await expect(packagePlugin({ pluginDir: dir })).rejects.toThrow();
        });
    });

    describe('3. Trust Policy Enforcement', () => {
        const sampleManifest: PluginArtifactManifest = {
            id: 'soundboard',
            name: 'Soundboard',
            version: '1.0.0',
            sdkVersion: `^${JASPER_PLUGIN_SDK_VERSION}`,
            entry: 'index.js',
            capabilities: ['audio:play', 'storage:read'],
            archiveSha256: 'abc123',
            files: [],
            createdAt: new Date().toISOString(),
            signer: 'official-release-authority',
            signature: 'valid-sig-123',
        };

        it('hosted profile fails closed immediately on arbitrary browser/API uploads', async () => {
            await expect(
                assertPluginTrust(sampleManifest, {
                    profile: 'hosted',
                    isBrowserUpload: true,
                }),
            ).rejects.toThrow(
                'Hosted runtime profile violation: Arbitrary plugin uploads from browser or untrusted clients are prohibited in hosted profile.',
            );
        });

        it('hosted profile rejects plugins explicitly excluded from production (sound-effect-plugin, test plugins)', async () => {
            const excludedManifest = {
                ...sampleManifest,
                id: 'sound-effect-plugin',
            };

            await expect(
                assertPluginTrust(excludedManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                }),
            ).rejects.toThrow(
                'Hosted trust policy violation: Plugin "sound-effect-plugin" is excluded from hosted production runtime.',
            );

            const testPluginManifest = {
                ...sampleManifest,
                id: 'db-test-plugin',
            };

            await expect(
                assertPluginTrust(testPluginManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                }),
            ).rejects.toThrow(
                'Hosted trust policy violation: Plugin "db-test-plugin" is excluded from hosted production runtime.',
            );
        });

        it('hosted profile rejects plugins not in the approved production inventory', async () => {
            const unknownManifest = {
                ...sampleManifest,
                id: 'random-unapproved-plugin',
            };

            await expect(
                assertPluginTrust(unknownManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                }),
            ).rejects.toThrow(
                'Hosted trust policy violation: Plugin "random-unapproved-plugin" is not in the approved production plugin inventory.',
            );
        });

        it('hosted profile permits approved production plugins (garage-band and soundboard)', async () => {
            await expect(
                assertPluginTrust(
                    { ...sampleManifest, id: 'garage-band' },
                    { profile: 'hosted', isBrowserUpload: false },
                ),
            ).resolves.toBeUndefined();

            await expect(
                assertPluginTrust(
                    { ...sampleManifest, id: 'soundboard' },
                    { profile: 'hosted', isBrowserUpload: false },
                ),
            ).resolves.toBeUndefined();
        });

        it('enforces cryptographic signature and trusted signer requirements when configured', async () => {
            const unsignedManifest = {
                ...sampleManifest,
                signature: undefined,
                signer: undefined,
            };

            await expect(
                assertPluginTrust(unsignedManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                    requireSignatures: true,
                }),
            ).rejects.toThrow('is missing required release signature');

            const untrustedSignerManifest = {
                ...sampleManifest,
                signer: 'rogue-signer',
            };

            await expect(
                assertPluginTrust(untrustedSignerManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                    requireSignatures: true,
                    trustedSigners: ['official-release-authority'],
                }),
            ).rejects.toThrow('is not in trusted signers list');

            const mockVerifier = vi.fn().mockResolvedValue(false);
            await expect(
                assertPluginTrust(sampleManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                    requireSignatures: true,
                    trustedSigners: ['official-release-authority'],
                    signatureVerifier: mockVerifier,
                    archiveBuffer: Buffer.from('mock-zip'),
                }),
            ).rejects.toThrow('Signature verification failed');

            // Success case
            mockVerifier.mockResolvedValue(true);
            await expect(
                assertPluginTrust(sampleManifest, {
                    profile: 'hosted',
                    isBrowserUpload: false,
                    requireSignatures: true,
                    trustedSigners: ['official-release-authority'],
                    signatureVerifier: mockVerifier,
                    archiveBuffer: Buffer.from('mock-zip'),
                }),
            ).resolves.toBeUndefined();
        });
    });

    describe('4. Multi-Module Fixture Boot from ZIP Artifact', () => {
        it('packages, verifies, unpacks and boots a multi-module plugin from ZIP', async () => {
            const dir = createMultiModuleFixture('boot-fixture');
            const pkg = await packagePlugin({ pluginDir: dir });

            const pluginManager = new PluginManager();
            pluginManager.init(mockClient, mockServer);

            const extractDir = path.join(tempDir, 'extracted-boot');

            await bootPluginFromArchive(pluginManager, pkg.archiveBuffer, {
                targetDir: extractDir,
                profile: 'self-hosted',
            });

            // Verify plugin registered in pluginManager
            const loaded = pluginManager.getPlugins().get('Multi Module Plugin');
            expect(loaded).toBeDefined();
            expect(loaded?.metadata.id).toBe('boot-fixture');
            expect(loaded?.metadata.version).toBe('1.2.0');

            // Verify declarative command was registered on discord client
            expect(mockClient.commands.has('calc')).toBe(true);

            // Clean teardown
            await pluginManager.unloadPlugin('Multi Module Plugin');
            expect(mockClient.commands.has('calc')).toBe(false);
            expect(pluginManager.getPlugins().has('Multi Module Plugin')).toBe(false);
        });
    });

    describe('5. JSX Runtimes Support (Classic & Automatic)', () => {
        it('packages and verifies a frontend plugin authored using the Classic JSX Runtime (React.createElement)', async () => {
            const dir = path.join(tempDir, 'classic-jsx-plugin');
            fs.mkdirSync(path.join(dir, 'web'), { recursive: true });

            fs.writeFileSync(
                path.join(dir, 'jasper-plugin.json'),
                JSON.stringify({
                    id: 'classic-jsx-plugin',
                    name: 'Classic JSX Plugin',
                    version: '1.0.0',
                    entry: 'index.js',
                    capabilities: ['storage:read'],
                    web: {
                        entry: 'web/index.js',
                    },
                }),
            );

            fs.writeFileSync(
                path.join(dir, 'index.js'),
                'export default { name: "Classic JSX Plugin", onLoad: async () => {}, onUnload: async () => {} };\n',
            );

            // Classic JSX: using React.createElement representation
            fs.writeFileSync(
                path.join(dir, 'web', 'index.js'),
                `/** @jsx React.createElement */
import React from 'react';
export const Card = (props) => React.createElement('div', { className: 'card' }, props.title);
`,
            );

            const pkg = await packagePlugin({ pluginDir: dir });
            expect(pkg.manifest.web?.entry).toBe('web/index.js');

            const verification = await verifyPluginArchive(pkg.archiveBuffer);
            expect(verification.valid).toBe(true);

            const unpackTarget = path.join(tempDir, 'classic-unpacked');
            const { manifest } = await unpackPluginArchive(pkg.archiveBuffer, unpackTarget);
            expect(manifest.id).toBe('classic-jsx-plugin');
            expect(fs.existsSync(path.join(unpackTarget, 'web', 'index.js'))).toBe(true);
        });

        it('packages and verifies a frontend plugin authored using the Automatic JSX Runtime (react/jsx-runtime)', async () => {
            const dir = path.join(tempDir, 'auto-jsx-plugin');
            fs.mkdirSync(path.join(dir, 'web'), { recursive: true });

            fs.writeFileSync(
                path.join(dir, 'jasper-plugin.json'),
                JSON.stringify({
                    id: 'auto-jsx-plugin',
                    name: 'Auto JSX Plugin',
                    version: '1.0.0',
                    entry: 'index.js',
                    capabilities: ['storage:read'],
                    web: {
                        entry: 'web/index.js',
                    },
                }),
            );

            fs.writeFileSync(
                path.join(dir, 'index.js'),
                'export default { name: "Auto JSX Plugin", onLoad: async () => {}, onUnload: async () => {} };\n',
            );

            // Automatic JSX runtime representation
            fs.writeFileSync(
                path.join(dir, 'web', 'index.js'),
                `import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
export const Banner = (props) => _jsx('header', { className: 'banner', children: _jsx('h1', { children: props.text }) });
`,
            );

            const pkg = await packagePlugin({ pluginDir: dir });
            expect(pkg.manifest.web?.entry).toBe('web/index.js');

            const verification = await verifyPluginArchive(pkg.archiveBuffer);
            expect(verification.valid).toBe(true);

            const unpackTarget = path.join(tempDir, 'auto-unpacked');
            const { manifest } = await unpackPluginArchive(pkg.archiveBuffer, unpackTarget);
            expect(manifest.id).toBe('auto-jsx-plugin');
            expect(fs.existsSync(path.join(unpackTarget, 'web', 'index.js'))).toBe(true);
        });
    });

    describe('6. Production Plugin Inventory & Release Metadata', () => {
        it('validates production plugin inventory constants and exclusion helpers', () => {
            expect(PRODUCTION_PLUGIN_IDS).toContain('garage-band');
            expect(PRODUCTION_PLUGIN_IDS).toContain('soundboard');
            expect(PRODUCTION_PLUGIN_IDS).toHaveLength(2);

            expect(isProductionPlugin('garage-band')).toBe(true);
            expect(isProductionPlugin('soundboard')).toBe(true);
            expect(isProductionPlugin('sound-effect-plugin')).toBe(false);
            expect(isProductionPlugin('db-test-plugin')).toBe(false);

            // Sound effect and all test plugins must be excluded from production
            expect(isExcludedFromProduction('sound-effect-plugin')).toBe(true);
            expect(isExcludedFromProduction('advanced-hooks-test-plugin')).toBe(true);
            expect(isExcludedFromProduction('db-test-plugin')).toBe(true);
            expect(isExcludedFromProduction('dashboard-notes')).toBe(true);
            expect(isExcludedFromProduction('media-gallery')).toBe(true);

            expect(isExcludedFromProduction('garage-band')).toBe(false);
            expect(isExcludedFromProduction('soundboard')).toBe(false);
        });

        it('generates signed release metadata for the production plugin inventory', async () => {
            // Set up a mock plugins dir with garage-band and soundboard
            const mockPluginsRoot = path.join(tempDir, 'all-plugins');
            createMultiModuleFixture('garage-band', {});
            createMultiModuleFixture('soundboard', {});
            // Move into mockPluginsRoot
            fs.mkdirSync(mockPluginsRoot, { recursive: true });
            fs.cpSync(
                path.join(tempDir, 'garage-band'),
                path.join(mockPluginsRoot, 'garage-band'),
                {
                    recursive: true,
                },
            );
            fs.cpSync(path.join(tempDir, 'soundboard'), path.join(mockPluginsRoot, 'soundboard'), {
                recursive: true,
            });

            const mockSigner = vi.fn().mockImplementation((digest: string) => {
                return `signed-ed25519:${computeSha256(digest + ':test-key')}`;
            });

            const releaseMetadata = await generateProductionReleaseMetadata({
                releaseVersion: 'v1.0.0-rc1',
                pluginsDir: mockPluginsRoot,
                signFn: mockSigner,
                signer: 'ci-release-builder',
            });

            expect(releaseMetadata.releaseVersion).toBe('v1.0.0-rc1');
            expect(releaseMetadata.signer).toBe('ci-release-builder');
            expect(releaseMetadata.signature).toMatch(/^signed-ed25519:[a-f0-9]{64}$/);
            expect(mockSigner).toHaveBeenCalledWith(releaseMetadata.manifestDigest);

            expect(releaseMetadata.inventory).toHaveLength(2);
            const ids = releaseMetadata.inventory.map((i) => i.id);
            expect(ids).toContain('garage-band');
            expect(ids).toContain('soundboard');

            // Excluded plugins must be explicitly recorded
            expect(releaseMetadata.excludedPlugins).toContain('sound-effect-plugin');
            expect(releaseMetadata.excludedPlugins).toContain('db-test-plugin');
        });
    });
});
