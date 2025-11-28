import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import logger from '../core/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, '../../src/plugins');

export default async function pluginsManagementRoutes(server: FastifyInstance) {
    // Register multipart support
    server.register(multipart);

    server.post('/install', async (request, reply) => {
        const data = await request.file();
        if (!data) {
            return reply.code(400).send({ message: 'No file uploaded' });
        }

        if (!data.filename.endsWith('.zip')) {
            return reply.code(400).send({ message: 'File must be a .zip archive' });
        }

        const tempZipPath = path.join(PLUGINS_DIR, `temp_${Date.now()}.zip`);
        const tempExtractDir = path.join(PLUGINS_DIR, `temp_extract_${Date.now()}`);

        try {
            // 1. Save zip file
            await fs.promises.writeFile(tempZipPath, await data.toBuffer());

            // 2. Extract
            if (!fs.existsSync(tempExtractDir)) {
                await fs.promises.mkdir(tempExtractDir, { recursive: true });
            }
            execSync(`unzip -o "${tempZipPath}" -d "${tempExtractDir}"`);

            // 3. Validate Manifest
            const manifestPath = path.join(tempExtractDir, 'jasper-plugin.json');
            if (!fs.existsSync(manifestPath)) {
                throw new Error('Invalid plugin: jasper-plugin.json not found');
            }

            const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
            if (!manifest.id || !/^[a-z0-9-]+$/.test(manifest.id)) {
                throw new Error('Invalid plugin ID in manifest');
            }

            // 4. Move to plugins directory
            const targetDir = path.join(PLUGINS_DIR, manifest.id);

            // Remove existing if any
            if (fs.existsSync(targetDir)) {
                await fs.promises.rm(targetDir, { recursive: true, force: true });
            }

            await fs.promises.rename(tempExtractDir, targetDir);

            logger.info(`[plugins] Installed plugin: ${manifest.id} v${manifest.version}`);

            return { success: true, message: `Plugin ${manifest.id} installed successfully` };

        } catch (error) {
            logger.error(`[plugins] Installation failed: ${error}`);
            return reply.code(500).send({ message: `Installation failed: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
            // Cleanup
            if (fs.existsSync(tempZipPath)) {
                await fs.promises.unlink(tempZipPath).catch(() => { });
            }
            if (fs.existsSync(tempExtractDir)) {
                await fs.promises.rm(tempExtractDir, { recursive: true, force: true }).catch(() => { });
            }
        }
    });
}
