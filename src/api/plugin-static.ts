import { FastifyInstance } from 'fastify';
import pluginManager from '../core/plugins/plugin-manager.js';
import path from 'path';
import fs from 'fs';

export default async function pluginStaticRoutes(server: FastifyInstance) {
    server.get('/plugins/:pluginId/web/*', async (request, reply) => {
        const { pluginId } = request.params as { pluginId: string };
        const wildCardPath = (request.params as any)['*'];

        const plugins = pluginManager.getPlugins();
        let targetPlugin = null;

        for (const p of plugins.values()) {
            if (p.metadata.id === pluginId) {
                targetPlugin = p;
                break;
            }
        }

        if (!targetPlugin) {
            return reply.code(404).send('Plugin not found');
        }

        const webDir = path.join(targetPlugin.pluginDir, 'web');
        const filePath = path.join(webDir, wildCardPath);

        // Security check
        if (!filePath.startsWith(webDir)) {
            return reply.code(403).send('Access denied');
        }

        if (!fs.existsSync(filePath)) {
            return reply.code(404).send('File not found');
        }

        const stat = await fs.promises.stat(filePath);
        if (!stat.isFile()) {
            return reply.code(404).send('Not a file');
        }

        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.js') contentType = 'text/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.html') contentType = 'text/html';
        else if (ext === '.json') contentType = 'application/json';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg') contentType = 'image/jpeg';
        else if (ext === '.svg') contentType = 'image/svg+xml';

        reply.type(contentType);
        return reply.send(fs.createReadStream(filePath));
    });
}
