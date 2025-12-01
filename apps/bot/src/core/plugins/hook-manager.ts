import { HookName, HookCallback } from "@jasper/types";
import logger from "../logger.js";

export class HookManager {
    private hooks: Map<HookName, HookCallback[]>;

    constructor() {
        this.hooks = new Map();
    }

    /**
     * Register a callback for a specific hook
     * @param hook The name of the hook to subscribe to
     * @param callback The function to execute when the hook is triggered
     */
    register(hook: HookName, callback: HookCallback): void {
        if (!this.hooks.has(hook)) {
            this.hooks.set(hook, []);
        }
        this.hooks.get(hook)!.push(callback);
        logger.debug(`[hooks] Registered listener for hook: ${hook}`);
    }

    /**
     * Trigger a hook synchronously (sequentially)
     * Waits for each callback to finish before moving to the next.
     * Useful for hooks that need to block execution (e.g., QUEUE_CREATE).
     */
    async triggerSync<T>(hook: HookName, data: T): Promise<void> {
        const callbacks = this.hooks.get(hook);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        logger.debug(`[hooks] Triggering SYNC hook: ${hook} (${callbacks.length} listeners)`);

        for (const callback of callbacks) {
            try {
                await callback(data);
            } catch (error) {
                logger.error(
                    `[hooks] Error in listener for hook ${hook}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    }

    /**
     * Trigger a hook asynchronously (parallel)
     * Fires all callbacks at once and waits for all to complete.
     * Useful for hooks that don't need to block execution order (e.g., logging).
     */
    async triggerAsync<T>(hook: HookName, data: T): Promise<void> {
        const callbacks = this.hooks.get(hook);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        logger.debug(`[hooks] Triggering ASYNC hook: ${hook} (${callbacks.length} listeners)`);

        await Promise.all(callbacks.map(async (callback) => {
            try {
                await callback(data);
            } catch (error) {
                logger.error(
                    `[hooks] Error in listener for hook ${hook}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }));
    }

    // Deprecated alias for backward compatibility (defaults to Sync)
    async trigger<T>(hook: HookName, data: T): Promise<void> {
        return this.triggerSync(hook, data);
    }

    /**
     * Clear all registered hooks (useful for testing or reloading)
     */
    clear(): void {
        this.hooks.clear();
    }
}

// Export a singleton instance
const hookManager = new HookManager();
export default hookManager;
