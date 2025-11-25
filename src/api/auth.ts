import { FastifyPluginAsync } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import db from '../core/db/index.js';
import logger from '../core/logger.js';
import { randomUUID } from 'crypto';

// Type augmentation for FastifyInstance
declare module 'fastify' {
    interface FastifyInstance {
        discordOAuth2: OAuth2Namespace;
    }
}

interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    await fastify.register(oauthPlugin, {
        name: 'discordOAuth2',
        credentials: {
            client: {
                id: process.env.DISCORD_CLIENT_ID || '',
                secret: process.env.DISCORD_CLIENT_SECRET || '',
            },
            auth: {
                authorizeHost: 'https://discord.com',
                authorizePath: '/api/oauth2/authorize',
                tokenHost: 'https://discord.com',
                tokenPath: '/api/oauth2/token',
            },
        },
        startRedirectPath: '/api/auth/login',
        callbackUri: `${baseUrl}/api/auth/callback`,
        scope: ['identify'],
    });

    fastify.get('/api/auth/callback', async (request, reply) => {
        try {
            const token = await fastify.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

            // Fetch user info from Discord
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${token.token.access_token}`,
                },
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user info from Discord');
            }

            const discordUser = (await userResponse.json()) as DiscordUser;

            // Upsert user in DB
            const user = {
                id: discordUser.id,
                username: discordUser.username,
                discriminator: discordUser.discriminator,
                avatar: discordUser.avatar
                    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                    : undefined,
                accessToken: token.token.access_token,
                refreshToken: token.token.refresh_token || '',
                expiresAt: new Date(Date.now() + (token.token.expires_in || 3600) * 1000),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await db.upsertUser(user);

            // Create session
            const sessionId = randomUUID();
            const session = {
                id: sessionId,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                createdAt: new Date(),
            };

            await db.createSession(session);

            // Set cookie
            reply.setCookie('session_id', sessionId, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                expires: session.expiresAt,
            });

            return reply.redirect('/');
        } catch (error) {
            logger.error(`[auth] Login failed: ${error}`);
            return reply.status(500).send({ error: 'Login failed' });
        }
    });

    fastify.get('/api/auth/me', async (request, reply) => {
        const user = (request as any).user;
        if (!user) {
            return reply.status(401).send({ error: 'Not authenticated' });
        }
        return { user };
    });

    fastify.post('/api/auth/logout', async (request, reply) => {
        const sessionId = request.cookies.session_id;
        if (sessionId) {
            await db.deleteSession(sessionId);
        }
        reply.clearCookie('session_id', { path: '/' });
        return { success: true };
    });
};

export default authRoutes;
