import { FastifyPluginAsync } from 'fastify';

const workloadRoutes: FastifyPluginAsync = async (fastify) => {
    const workloadAuthConfig = {
        auth: {
            allowedPrincipals: ['runtime_workload' as const, 'staff' as const],
            action: 'workload:telemetry',
        },
    };

    fastify.post(
        '/api/workload/heartbeat',
        { config: workloadAuthConfig },
        async (request, _reply) => {
            const body = request.body as Record<string, unknown> | undefined;
            return {
                acknowledged: true,
                timestamp: new Date().toISOString(),
                echo: body?.epoch,
            };
        },
    );

    fastify.get(
        '/api/workload/status',
        { config: workloadAuthConfig },
        async (_request, _reply) => {
            return {
                status: 'active',
                timestamp: new Date().toISOString(),
            };
        },
    );
};

export default workloadRoutes;
