import { FastifyInstance } from 'fastify';
import pluginManager from '../core/plugins/plugin-manager.js';

export default async function pluginsRegistryRoutes(server: FastifyInstance) {
    // GET /api/plugins/registry
    server.get('/registry', async (_request, _reply) => {
        const plugins = pluginManager.getPlugins();
        const registry = [];

        for (const [, { metadata }] of plugins) {
            if (metadata.web) {
                registry.push({
                    id: metadata.id,
                    name: metadata.name,
                    version: metadata.version,
                    web: metadata.web
                });
            }
        }

        return { plugins: registry };
    });
}
