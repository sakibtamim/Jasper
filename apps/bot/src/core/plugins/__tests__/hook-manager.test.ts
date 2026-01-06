import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HookManager } from "../hook-manager.js";

// Mock logger
vi.mock("../logger.js", () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("HookManager", () => {
  let hookManager: HookManager;

  beforeEach(() => {
    hookManager = new HookManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should register a hook callback", () => {
    const callback = vi.fn();
    hookManager.register("QUEUE_CREATE", callback);

    // @ts-ignore - accessing private property
    const hooks = hookManager.hooks;
    expect(hooks.has("QUEUE_CREATE")).toBe(true);
    expect(hooks.get("QUEUE_CREATE")).toContain(callback);
  });

  it("should trigger sync hooks sequentially", async () => {
    const callOrder: string[] = [];
    const callback1 = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push("first");
    });
    const callback2 = vi.fn().mockImplementation(() => {
      callOrder.push("second");
    });

    hookManager.register("QUEUE_CREATE", callback1);
    hookManager.register("QUEUE_CREATE", callback2);

    await hookManager.triggerSync("QUEUE_CREATE", {});

    expect(callOrder).toEqual(["first", "second"]);
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it("should trigger async hooks in parallel", async () => {
    const callback1 = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const callback2 = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    hookManager.register("POST_MUSIC_PLAY", callback1);
    hookManager.register("POST_MUSIC_PLAY", callback2);

    const start = Date.now();
    await hookManager.triggerAsync("POST_MUSIC_PLAY", {});
    const duration = Date.now() - start;

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
    // Should take roughly the max time of the longest callback, not sum
    // Adding a small buffer for execution overhead
    expect(duration).toBeLessThan(40);
  });

  it("should handle errors in sync hooks gracefully", async () => {
    const callback1 = vi.fn().mockRejectedValue(new Error("Test Error"));
    const callback2 = vi.fn();

    hookManager.register("QUEUE_CREATE", callback1);
    hookManager.register("QUEUE_CREATE", callback2);

    await hookManager.triggerSync("QUEUE_CREATE", {});

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled(); // Should still run subsequent hooks
  });

  it("should handle errors in async hooks gracefully", async () => {
    const callback1 = vi.fn().mockRejectedValue(new Error("Test Error"));
    const callback2 = vi.fn();

    hookManager.register("POST_MUSIC_PLAY", callback1);
    hookManager.register("POST_MUSIC_PLAY", callback2);

    await hookManager.triggerAsync("POST_MUSIC_PLAY", {});

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it("should clear all hooks", () => {
    hookManager.register("QUEUE_CREATE", vi.fn());
    hookManager.clear();

    // @ts-ignore
    expect(hookManager.hooks.size).toBe(0);
  });
});
