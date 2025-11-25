import { FastifyPluginAsync } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import { randomUUID } from 'crypto';
import db from '../core/db/index.js';
import logger from '../core/logger.js';
import { DiscordAPIError, DiscordOAuthError, DatabaseAuthError } from './auth-errors.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

interface DiscordToken {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

function isDiscordToken(data: unknown): data is DiscordToken {
    return (
        typeof data === 'object' &&
        data !== null &&
        'access_token' in data &&
        'refresh_token' in data &&
        'expires_in' in data &&
        typeof (data as any).access_token === 'string' &&
        typeof (data as any).refresh_token === 'string' &&
        typeof (data as any).expires_in === 'number'
    );
}

function isDiscordUser(data: unknown): data is DiscordUser {
    return (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'username' in data &&
        'discriminator' in data &&
        typeof (data as any).id === 'string' &&
        typeof (data as any).username === 'string' &&
        typeof (data as any).discriminator === 'string'
    );
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET || !process.env.COOKIE_SECRET) {
        throw new Error('Missing required environment variables: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, COOKIE_SECRET');
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    await fastify.register(oauthPlugin, {
        name: 'discordOAuth2',
        credentials: {
            client: {
                id: process.env.DISCORD_CLIENT_ID,
                secret: process.env.DISCORD_CLIENT_SECRET,
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
            const tokenResponse = await fastify.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
            const tokenData = tokenResponse.token;

            if (!isDiscordToken(tokenData)) {
                throw new DiscordOAuthError('Invalid token response from Discord');
            }
            const token = tokenData;

            // Fetch user info from Discord
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${token.access_token}`,
                },
            });

            if (!userResponse.ok) {
                throw new DiscordAPIError(`Failed to fetch user info from Discord: ${userResponse.status} ${userResponse.statusText}`);
            }

            const discordUserData = await userResponse.json();

            if (!isDiscordUser(discordUserData)) {
                throw new DiscordAPIError('Invalid user data received from Discord');
            }
            const discordUser = discordUserData;

            const avatarUrl = discordUser.avatar
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : undefined;

            // Upsert user in DB
            const user = {
                id: discordUser.id,
                username: discordUser.username,
                discriminator: discordUser.discriminator,
                avatar: avatarUrl,
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                expiresAt: new Date(Date.now() + token.expires_in * 1000)
            };

            try {
                await db.upsertUser(user);
            } catch (error) {
                throw new DatabaseAuthError(`Failed to upsert user: ${error}`);
            }

            // Create session
            const sessionId = randomUUID();
            const session = {
                id: sessionId,
                userId: user.id,
                expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
                createdAt: new Date()
            };

            try {
                await db.createSession(session);
            } catch (error) {
                throw new DatabaseAuthError(`Failed to create session: ${error}`);
            }

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
            let userMessage = 'Login failed';

            if (error instanceof DiscordAPIError) {
                logger.error(`[auth] Discord API error: ${error.message}`);
                userMessage = 'Could not fetch user info from Discord. Please try again later.';
            } else if (error instanceof DiscordOAuthError) {
                logger.error(`[auth] Discord OAuth error: ${error.message}`);
                userMessage = 'Discord login failed. Please try again.';
            } else if (error instanceof DatabaseAuthError) {
                logger.error(`[auth] Database error: ${error.message}`);
                userMessage = 'Internal server error during login. Please try again later.';
            } else if (error instanceof Error) {
                logger.error(`[auth] Unexpected error: ${error.message}`);
            } else {
                logger.error(`[auth] Unknown error: ${JSON.stringify(error)}`);
            }

            return reply.status(500).send({ error: userMessage });
        }
    });

    fastify.get('/api/auth/me', async (request, reply) => {
        const user = request.user;
        if (!user) {
            return reply.status(401).send({ error: 'Not authenticated' });
        }

        // Only return safe fields
        const sanitizedUser = {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
        };
        return { user: sanitizedUser };
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
