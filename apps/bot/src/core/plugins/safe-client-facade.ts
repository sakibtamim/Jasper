import { DisposalHandle, SafePluginClient } from '@jasper/types';
import {
    BaseFetchOptions,
    Channel,
    Client,
    ClientUser,
    FetchGuildOptions,
    Guild,
    User,
} from 'discord.js';

import logger from '../logger.js';

/**
 * Creates a safe, token-free facade over the Discord.js Client for plugins.
 * Ensures plugins cannot inspect the Discord bot token, alter authorization credentials,
 * or execute disruptive lifecycle operations (login/destroy).
 */
export function createSafeClientFacade(client: Client, pluginId: string): SafePluginClient {
    const facade: SafePluginClient = {
        get user(): ClientUser | null {
            return client.user;
        },
        isReady(): boolean {
            return typeof client.isReady === 'function' ? client.isReady() : Boolean(client.user);
        },
        get options() {
            return {
                intents:
                    client.options?.intents ??
                    (0 as unknown as import('discord.js').BitFieldResolvable<
                        import('discord.js').GatewayIntentsString,
                        number
                    >),
            };
        },
        channels: {
            fetch: async (id: string, options?: BaseFetchOptions): Promise<Channel | null> => {
                if (!client.channels) return null;
                return (await client.channels.fetch(id, options)) ?? null;
            },
        },
        guilds: {
            fetch: async (id: string | FetchGuildOptions): Promise<Guild | null> => {
                if (!client.guilds) return null;
                return (await client.guilds.fetch(id as string)) ?? null;
            },
        },
        users: {
            fetch: async (id: string, options?: BaseFetchOptions): Promise<User | null> => {
                if (!client.users) return null;
                return (await client.users.fetch(id, options)) ?? null;
            },
        },
        on(
            event: string,
            listener: (...args: unknown[]) => void,
        ): DisposalHandle & SafePluginClient {
            if (typeof client.on === 'function') {
                client.on(event, listener as (...args: unknown[]) => void);
            }
            logger.debug(`[plugins:${pluginId}] Registered client listener for '${event}'`);

            const handle: DisposalHandle & SafePluginClient = {
                dispose: () => {
                    facade.off(event, listener);
                },
                get user() {
                    return facade.user;
                },
                isReady: facade.isReady,
                get options() {
                    return facade.options;
                },
                channels: facade.channels,
                guilds: facade.guilds,
                users: facade.users,
                on: facade.on,
                off: facade.off,
                removeListener: facade.removeListener,
            };

            return handle;
        },
        off(event: string, listener: (...args: unknown[]) => void): SafePluginClient {
            if (typeof client.off === 'function') {
                client.off(event, listener as (...args: unknown[]) => void);
            } else if (typeof client.removeListener === 'function') {
                client.removeListener(event, listener as (...args: unknown[]) => void);
            }
            logger.debug(`[plugins:${pluginId}] Removed client listener for '${event}'`);
            return facade;
        },
        removeListener(event: string, listener: (...args: unknown[]) => void): SafePluginClient {
            return facade.off(event, listener);
        },
    };

    // Defense-in-depth runtime protection against token and credential leaks
    Object.defineProperty(facade, 'token', {
        get() {
            logger.warn(`[plugins:${pluginId}] Blocked attempt to read client.token`);
            return undefined;
        },
        enumerable: false,
        configurable: false,
    });

    Object.defineProperty(facade, 'login', {
        value() {
            throw new Error(`[security] Plugin '${pluginId}' cannot invoke client.login`);
        },
        writable: false,
        enumerable: false,
        configurable: false,
    });

    Object.defineProperty(facade, 'destroy', {
        value() {
            throw new Error(`[security] Plugin '${pluginId}' cannot invoke client.destroy`);
        },
        writable: false,
        enumerable: false,
        configurable: false,
    });

    return facade;
}
