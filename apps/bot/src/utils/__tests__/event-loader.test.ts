import { Client, Events } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WORKER_ALLOWED_EVENTS, loadEvents } from '../event-loader.js';

vi.mock('../../core/logger.js', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('event-loader', () => {
    let mockClient: Client;

    beforeEach(() => {
        vi.clearAllMocks();

        mockClient = {
            on: vi.fn(),
            once: vi.fn(),
        } as unknown as Client;
    });

    describe('WORKER_ALLOWED_EVENTS', () => {
        it('should allow ClientReady and VoiceStateUpdate', () => {
            expect(WORKER_ALLOWED_EVENTS.has(Events.ClientReady)).toBe(true);
            expect(WORKER_ALLOWED_EVENTS.has(Events.VoiceStateUpdate)).toBe(true);
        });

        it('should NOT allow InteractionCreate', () => {
            expect(WORKER_ALLOWED_EVENTS.has(Events.InteractionCreate)).toBe(false);
        });
    });

    describe('loadEvents for Controller', () => {
        it('should register interactionCreate, ready, and voiceStateUpdate for controller role', async () => {
            await loadEvents(mockClient, 'Jasper Controller', 'controller');

            // ready is a "once" event
            expect(mockClient.once).toHaveBeenCalledWith(Events.ClientReady, expect.any(Function));
            // voiceStateUpdate is an "on" event
            expect(mockClient.on).toHaveBeenCalledWith(
                Events.VoiceStateUpdate,
                expect.any(Function),
            );
            // interactionCreate MUST be registered on controller
            expect(mockClient.on).toHaveBeenCalledWith(
                Events.InteractionCreate,
                expect.any(Function),
            );
        });
    });

    describe('loadEvents for Worker', () => {
        it('should register ready and voiceStateUpdate but NEVER interactionCreate for worker role', async () => {
            await loadEvents(mockClient, 'Misty Worker', 'worker');

            // ready is registered
            expect(mockClient.once).toHaveBeenCalledWith(Events.ClientReady, expect.any(Function));
            // voiceStateUpdate is registered
            expect(mockClient.on).toHaveBeenCalledWith(
                Events.VoiceStateUpdate,
                expect.any(Function),
            );
            // interactionCreate MUST NOT be registered on worker
            expect(mockClient.on).not.toHaveBeenCalledWith(
                Events.InteractionCreate,
                expect.any(Function),
            );
        });

        it('should infer worker role from client.role if not explicitly passed', async () => {
            // @ts-expect-error - Injecting role property
            mockClient.role = 'worker';

            await loadEvents(mockClient, 'Worker Bot');

            expect(mockClient.once).toHaveBeenCalledWith(Events.ClientReady, expect.any(Function));
            expect(mockClient.on).toHaveBeenCalledWith(
                Events.VoiceStateUpdate,
                expect.any(Function),
            );
            expect(mockClient.on).not.toHaveBeenCalledWith(
                Events.InteractionCreate,
                expect.any(Function),
            );
        });
    });
});
