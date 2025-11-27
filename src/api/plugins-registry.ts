import { FastifyInstance } from 'fastify';
import pluginManager from '../core/plugins/plugin-manager.js';

export default async function pluginsRegistryRoutes(server: FastifyInstance) {
    // GET /api/plugins/registry
    server.get('/registry', async (request, reply) => {
        const plugins = pluginManager.getPlugins();
        const registry = [];

        for (const [name, { metadata }] of plugins) {
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
