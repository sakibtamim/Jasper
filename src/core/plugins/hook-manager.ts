import { HookName, HookCallback } from "./plugin-interface.js";
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
     * Trigger a hook, executing all registered callbacks sequentially
     * @param hook The name of the hook to trigger
     * @param data The data to pass to the callbacks
     */
    async trigger<T>(hook: HookName, data: T): Promise<void> {
        const callbacks = this.hooks.get(hook);
        if (!callbacks || callbacks.length === 0) {
            return;
        }

        logger.debug(`[hooks] Triggering hook: ${hook} (${callbacks.length} listeners)`);

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
     * Clear all registered hooks (useful for testing or reloading)
     */
    clear(): void {
        this.hooks.clear();
    }
}

// Export a singleton instance
const hookManager = new HookManager();
export default hookManager;
