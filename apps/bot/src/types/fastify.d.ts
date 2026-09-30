import { AuthenticatedPrincipal, RouteAuthPolicy } from '@jasper/types';

import { User } from '../core/db/types.js';

declare module 'fastify' {
    interface FastifyRequest {
        user?: User;
        principal?: AuthenticatedPrincipal;
        guildId?: string;
    }

    interface FastifyContextConfig {
        auth?: RouteAuthPolicy;
    }
}
