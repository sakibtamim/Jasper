import AdmZip from 'adm-zip';
import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

import { RUNTIME_PROFILE } from '../config/env.js';
import logger from '../core/logger.js';
import {
    assertPluginTrust,
    unpackPluginArchive,
    verifyPluginArchive,
} from '../core/plugins/packager.js';
import pluginManager, { PLUGINS_DIR } from '../core/plugins/plugin-manager.js';
import { PluginStorage } from '../core/plugins/plugin-storage.js';

export default async function pluginsManagementRoutes(server: FastifyInstance) {
    // List all installed plugins (backend & frontend)
    server.get(
        '/',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff', 'tenant_member', 'customer_user'],
                },
            },
        },
        async (_request, _reply) => {
            const pluginsMap = pluginManager.getPlugins();
            const pluginsList = Array.from(pluginsMap.values()).map((p) => ({
                id: p.metadata.id,
                name: p.metadata.name,
                version: p.metadata.version,
                description: p.metadata.description,
                web: p.metadata.web, // Include web config to detect frontend plugins
            }));
            return { plugins: pluginsList };
        },
    );

    // --- Storage API ---

    // Get file content
    server.get(
        '/:pluginId/storage/:filename',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff', 'tenant_member'],
                },
            },
        },
        async (request, reply) => {
            const { pluginId, filename } = request.params as {
                pluginId: string;
                filename: string;
            };
            const storage = new PluginStorage(pluginId);

            try {
                const buffer = await storage.get(filename);
                // Determine content type based on extension (basic)
                const ext = path.extname(filename).toLowerCase();
                let contentType = 'application/octet-stream';
                if (ext === '.png') contentType = 'image/png';
                if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
                if (ext === '.gif') contentType = 'image/gif';
                if (ext === '.json') contentType = 'application/json';
                if (ext === '.txt') contentType = 'text/plain';

                reply.type(contentType);
                return buffer;
            } catch {
                return reply.code(404).send({ message: 'File not found' });
            }
        },
    );

    // List files
    server.get(
        '/:pluginId/storage',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff', 'tenant_member'],
                },
            },
        },
        async (request, _reply) => {
            const { pluginId } = request.params as { pluginId: string };
            const storage = new PluginStorage(pluginId);
            try {
                const files = await storage.list();
                return { files };
            } catch {
                return { files: [] };
            }
        },
    );

    // Upload file (staff only)
    server.post(
        '/:pluginId/storage',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff'],
                    action: 'plugins:upload',
                },
            },
        },
        async (request, reply) => {
            const { pluginId } = request.params as { pluginId: string };
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }

            const storage = new PluginStorage(pluginId);
            try {
                const buffer = await data.toBuffer();
                const uri = await storage.save(data.filename, buffer);
                const { webUrl } = storage.resolve(uri);
                return { success: true, uri, url: webUrl };
            } catch (error) {
                logger.error(`[storage] Upload failed: ${error}`);
                return reply.code(500).send({ message: 'Upload failed' });
            }
        },
    );

    // Delete file (staff only)
    server.delete(
        '/:pluginId/storage/:filename',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff'],
                    action: 'plugins:delete',
                },
            },
        },
        async (request, reply) => {
            const { pluginId, filename } = request.params as {
                pluginId: string;
                filename: string;
            };
            const storage = new PluginStorage(pluginId);

            try {
                await storage.delete(filename);
                return { success: true };
            } catch {
                return reply.code(500).send({ message: 'Delete failed' });
            }
        },
    );

    server.post(
        '/install',
        {
            config: {
                auth: {
                    allowedPrincipals: ['staff'],
                    action: 'plugins:install',
                },
            },
        },
        async (request, reply) => {
            const user = request.user;
            const username = user?.username || 'operator';

            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ message: 'No file uploaded' });
            }

            if (!data.filename.endsWith('.zip')) {
                return reply.code(400).send({ message: 'File must be a .zip archive' });
            }

            try {
                // 1. Hosted runtime check: fail closed on browser / API uploads
                if (RUNTIME_PROFILE === 'hosted') {
                    await assertPluginTrust(
                        { id: 'browser-upload', name: 'upload', version: '0.0.0' } as any,
                        { profile: RUNTIME_PROFILE, isBrowserUpload: true },
                    );
                }

                const buffer = await data.toBuffer();

                // 2. Archive verification & tamper check
                const verification = await verifyPluginArchive(buffer);
                if (!verification.valid || !verification.manifest) {
                    return reply.code(400).send({
                        message: `Invalid plugin archive: ${verification.errors.join('; ')}`,
                    });
                }

                // 3. Trust policy check
                await assertPluginTrust(verification.manifest, {
                    profile: RUNTIME_PROFILE,
                    isBrowserUpload: false,
                });

                // 4. Safe unpack into target directory
                const targetDir = path.join(PLUGINS_DIR, verification.manifest.id);
                if (fs.existsSync(targetDir)) {
                    await fs.promises.rm(targetDir, { recursive: true, force: true });
                }

                await unpackPluginArchive(buffer, targetDir);

                logger.info(
                    `[plugins] Installed plugin: ${verification.manifest.id} v${verification.manifest.version} by ${username}`,
                );

                return {
                    success: true,
                    message: `Plugin ${verification.manifest.id} installed successfully`,
                };
            } catch (error) {
                logger.error(`[plugins] Installation failed: ${error}`);
                const message = error instanceof Error ? error.message : 'Installation failed.';
                return reply
                    .code(
                        error instanceof Error &&
                            error.message.includes('Hosted runtime profile violation')
                            ? 403
                            : 500,
                    )
                    .send({
                        message,
                    });
            }
        },
    );
}
