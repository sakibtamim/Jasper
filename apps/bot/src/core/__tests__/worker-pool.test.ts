import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import workerPool from "../worker-pool.js";
import logger from "../logger.js";

// Mocks
vi.mock("../logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("discord.js", () => {
  const MockClient = vi.fn();
  MockClient.prototype.login = vi.fn().mockResolvedValue("token");
  MockClient.prototype.user = {
    setPresence: vi.fn(),
  };
  MockClient.prototype.isReady = vi.fn().mockReturnValue(true);

  return {
    Client: MockClient,
    GatewayIntentBits: {
      Guilds: 1,
      GuildVoiceStates: 2,
    },
    ActivityType: {
      Custom: 4,
    },
  };
});

// Mock configuration
vi.mock("../../config/bots.js", () => ({
  default: [
    { name: "Jasper", role: "controller", token: "jasper-token" },
    { name: "Misty", role: "worker", token: "misty-token" },
    { name: "Tuki", role: "worker", token: "tuki-token" },
  ],
}));

vi.mock("../../config/afr-config.js", () => ({
  JASPER_WEIGHT: 0.5,
}));

describe("WorkerPool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workers state if possible, or just release all
    workerPool.releaseAllWorkers();
  });

  it("should create bots based on config", () => {
    const workers = workerPool.createBots();
    expect(workers).toHaveLength(3);
    expect(workers.find((w) => w.name === "Jasper")?.role).toBe("controller");
    expect(workers.find((w) => w.name === "Misty")?.role).toBe("worker");
  });

  it("should get the controller", () => {
    workerPool.createBots();
    const controller = workerPool.getController();
    expect(controller).toBeDefined();
    expect(controller?.name).toBe("Jasper");
  });

  it("should allocate a worker", () => {
    workerPool.createBots();
    const worker = workerPool.allocateWorker("guild-1", "voice-1");
    expect(worker).toBeDefined();
    expect(worker?.busy).toBe(true);
    expect(worker?.guildId).toBe("guild-1");
    expect(worker?.voiceChannelId).toBe("voice-1");
  });

  it("should reuse existing worker in the same channel", () => {
    workerPool.createBots();
    const worker1 = workerPool.allocateWorker("guild-1", "voice-1");
    const worker2 = workerPool.allocateWorker("guild-1", "voice-1");
    expect(worker1).toBe(worker2);
  });

  it("should release a worker", () => {
    workerPool.createBots();
    workerPool.allocateWorker("guild-1", "voice-1");
    workerPool.releaseWorker("voice-1");

    const workers = workerPool.getWorkers();
    const worker = workers.find((w) => w.voiceChannelId === "voice-1");
    expect(worker).toBeUndefined(); // Should not find any worker with that voice channel

    // Check if any worker is busy
    const busyWorker = workers.find((w) => w.busy);
    expect(busyWorker).toBeUndefined();
  });

  it("should login all bots", async () => {
    workerPool.createBots();
    await workerPool.loginBots();
    // Check if login was called on clients (need access to client mocks, but difficult here without exposing them)
    // We can check logger instead
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Logged in as"),
    );
  });
});
