import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getQueue,
  setQueue,
  deleteQueue,
  getAllQueues,
  clearAllQueues,
  cleanupWorkerOldQueues,
} from "../queue-manager.js";
import { Queue } from "@jasper/types";
import * as voiceUtils from "../../utils/voice-utils.js";
import workerPool from "../../worker-pool.js";

// Mocks
vi.mock("../../utils/voice-utils.js", () => ({
  setVoiceStatus: vi.fn(),
}));

vi.mock("../../worker-pool.js", () => ({
  default: {
    releaseWorker: vi.fn(),
  },
}));

vi.mock("../../logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("QueueManager", () => {
  const mockVoiceChannelId = "voice-123";
  const mockGuildId = "guild-123";

  const mockQueue: Queue = {
    voiceChannelId: mockVoiceChannelId,
    guildId: mockGuildId,
    textChannel: null,
    connection: {
      destroy: vi.fn(),
    } as any,
    player: {} as any,
    songs: [],
    nowPlaying: null,
    autoplay: false,
    worker: {
      name: "TestWorker",
      client: {} as any,
    } as any,
    idleTimeout: null,
    stopping: false,
  };

  beforeEach(() => {
    // Clear queues before each test
    const queues = getAllQueues();
    queues.clear();
    vi.clearAllMocks();
  });

  it("should set and get a queue", () => {
    setQueue(mockVoiceChannelId, mockQueue);
    const retrievedQueue = getQueue(mockVoiceChannelId);
    expect(retrievedQueue).toBe(mockQueue);
  });

  it("should return undefined for non-existent queue", () => {
    const retrievedQueue = getQueue("non-existent");
    expect(retrievedQueue).toBeUndefined();
  });

  it("should delete a queue", () => {
    setQueue(mockVoiceChannelId, mockQueue);
    deleteQueue(mockVoiceChannelId);
    const retrievedQueue = getQueue(mockVoiceChannelId);
    expect(retrievedQueue).toBeUndefined();
  });

  it("should get all queues", () => {
    setQueue(mockVoiceChannelId, mockQueue);
    const queues = getAllQueues();
    expect(queues.size).toBe(1);
    expect(queues.get(mockVoiceChannelId)).toBe(mockQueue);
  });

  describe("cleanupWorkerOldQueues", () => {
    it("should cleanup queues associated with a worker", () => {
      setQueue(mockVoiceChannelId, mockQueue);

      // Mock idle timeout
      const mockTimeout = setTimeout(() => {}, 1000);
      mockQueue.idleTimeout = mockTimeout;
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      cleanupWorkerOldQueues(mockQueue.worker);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(mockTimeout);
      expect(voiceUtils.setVoiceStatus).toHaveBeenCalledWith(
        mockQueue.worker.client,
        mockVoiceChannelId,
        "",
      );
      expect(mockQueue.connection.destroy).toHaveBeenCalled();
      expect(getQueue(mockVoiceChannelId)).toBeUndefined();
    });

    it("should not cleanup queues for other workers", () => {
      setQueue(mockVoiceChannelId, mockQueue);

      const otherWorker = {
        name: "OtherWorker",
        client: {} as any,
      } as any;

      cleanupWorkerOldQueues(otherWorker);

      expect(getQueue(mockVoiceChannelId)).toBe(mockQueue);
      expect(mockQueue.connection.destroy).not.toHaveBeenCalled();
    });
  });

  describe("clearAllQueues", () => {
    it("should clear all queues and release workers", () => {
      setQueue(mockVoiceChannelId, mockQueue);
      setQueue("voice-456", { ...mockQueue, voiceChannelId: "voice-456" });

      clearAllQueues();

      expect(getAllQueues().size).toBe(0);
      expect(workerPool.releaseWorker).toHaveBeenCalledTimes(2);
      expect(workerPool.releaseWorker).toHaveBeenCalledWith(mockVoiceChannelId);
      expect(workerPool.releaseWorker).toHaveBeenCalledWith("voice-456");
      expect(mockQueue.connection.destroy).toHaveBeenCalled();
    });
  });
});
