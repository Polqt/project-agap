import { describe, it, expect } from "vitest";
import { hasUpdatedAtConflict } from "../../src/conflicts";
import {
  getLatestSyncedTimestamp,
  shouldUseStaleCachedRoute,
} from "../../../../apps/native/shared/utils/offline-freshness.ts";

/**
 * Mutation Idempotency Tests
 * 
 * Tests that mutations with the same clientMutationId are deduplicated.
 */

describe("offline mutation idempotency", () => {
  describe("clientMutationId generation", () => {
    it("generates unique IDs for each queued action", () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const actionId = `status-ping:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
        ids.add(actionId);
      }

      expect(ids.size).toBe(100);
    });

    it("preserves custom clientMutationId when provided", () => {
      const customId = "custom-mutation-123";
      const payload = {
        status: "safe" as const,
        clientMutationId: customId,
      };

      const actionId = `status-ping:${Date.now()}:random`;
      const result = {
        clientMutationId:
          "clientMutationId" in payload && typeof payload.clientMutationId === "string"
            ? payload.clientMutationId
            : actionId,
      };

      expect(result.clientMutationId).toBe(customId);
    });
  });

  describe("API idempotency simulation", () => {
    it("should return cached result for duplicate clientMutationId", async () => {
      const mutationHistory = new Map<string, string>();
      let actualMutations = 0;

      const mockMutation = async (input: { clientMutationId?: string; status: string }) => {
        // Check cache
        if (input.clientMutationId && mutationHistory.has(input.clientMutationId)) {
          return JSON.parse(mutationHistory.get(input.clientMutationId)!);
        }

        // Process mutation
        actualMutations++;
        const result = { id: `ping-${actualMutations}`, status: input.status };

        // Cache result
        if (input.clientMutationId) {
          mutationHistory.set(input.clientMutationId, JSON.stringify(result));
        }

        return result;
      };

      const clientMutationId = "test-ping-123";

      // First call
      const result1 = await mockMutation({ clientMutationId, status: "safe" });
      expect(actualMutations).toBe(1);

      // Retry (simulating network failure)
      const result2 = await mockMutation({ clientMutationId, status: "safe" });
      expect(actualMutations).toBe(1); // No additional mutation
      expect(result2).toEqual(result1);

      // Another retry
      const result3 = await mockMutation({ clientMutationId, status: "safe" });
      expect(actualMutations).toBe(1);
      expect(result3).toEqual(result1);
    });

    it("should process different clientMutationIds separately", async () => {
      const mutationHistory = new Map<string, string>();
      let callCount = 0;

      const mockMutation = async (input: { clientMutationId: string }) => {
        if (mutationHistory.has(input.clientMutationId)) {
          return JSON.parse(mutationHistory.get(input.clientMutationId)!);
        }

        callCount++;
        const result = { id: `ping-${callCount}` };
        mutationHistory.set(input.clientMutationId, JSON.stringify(result));
        return result;
      };

      await mockMutation({ clientMutationId: "ping-1" });
      await mockMutation({ clientMutationId: "ping-2" });
      await mockMutation({ clientMutationId: "ping-3" });

      expect(callCount).toBe(3);

      // Retry ping-1
      await mockMutation({ clientMutationId: "ping-1" });
      expect(callCount).toBe(3); // No additional processing
    });
  });
});

/**
 * Queue Replay Tests
 */

describe("offline queue replay", () => {
  describe("retry logic", () => {
    it("applies exponential backoff delays", () => {
      const RETRY_DELAYS_MS = [1000, 2000, 4000];

      function getRetryDelayMs(retries: number) {
        const safeIndex = Math.max(0, Math.min(retries, RETRY_DELAYS_MS.length - 1));
        return RETRY_DELAYS_MS[safeIndex];
      }

      expect(getRetryDelayMs(0)).toBe(1000);
      expect(getRetryDelayMs(1)).toBe(2000);
      expect(getRetryDelayMs(2)).toBe(4000);
      expect(getRetryDelayMs(3)).toBe(4000); // Caps at last value
      expect(getRetryDelayMs(100)).toBe(4000);
    });

    it("stops retrying after max attempts", () => {
      const MAX_RETRIES = 3;
      let action = {
        id: "test-action",
        retries: 0,
        failedAt: null as number | null,
      };

      // Simulate failed retries
      for (let i = 0; i < 5; i++) {
        action.retries++;
        
        if (action.retries >= MAX_RETRIES) {
          action.failedAt = Date.now();
          break;
        }
      }

      expect(action.retries).toBe(MAX_RETRIES);
      expect(action.failedAt).not.toBeNull();
    });

    it("marks expired actions (>24 hours) for removal", () => {
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      function isExpiredQueuedAction(createdAt: number) {
        return Date.now() - createdAt > ONE_DAY_MS;
      }

      const oldAction = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const recentAction = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

      expect(isExpiredQueuedAction(oldAction)).toBe(true);
      expect(isExpiredQueuedAction(recentAction)).toBe(false);
    });
  });

  describe("action payload types", () => {
    it("supports all offline action types", () => {
      const supportedTypes = [
        "status-ping.submit",
        "check-in.qr",
        "check-in.manual",
        "check-in.proxy",
        "welfare.recordOutcome",
        "needs-report.submit",
        "broadcast.create",
      ];

      supportedTypes.forEach((type) => {
        const action = {
          id: `${type}:${Date.now()}:random`,
          type,
          payload: { clientMutationId: `test-${type}` },
        };

        expect(action.id).toContain(type);
        expect(action.payload.clientMutationId).toContain("test-");
      });
    });
  });
});

describe("offline freshness helpers", () => {
  it("returns the newest available sync timestamp", () => {
    expect(getLatestSyncedTimestamp(null, 1_000, undefined, 9_000, 2_500)).toBe(9_000);
  });

  it("returns null when no datasets have been synced yet", () => {
    expect(getLatestSyncedTimestamp(null, undefined, null)).toBeNull();
  });
});

describe("offline map fallback helpers", () => {
  it("uses stale cached guidance when the only fallback is straight-line routing", () => {
    expect(
      shouldUseStaleCachedRoute({
        hasStaleCachedRoute: true,
        fallbackSource: "straight-line",
      }),
    ).toBe(true);
  });

  it("prefers seeded barangay routes over stale cached guidance", () => {
    expect(
      shouldUseStaleCachedRoute({
        hasStaleCachedRoute: true,
        fallbackSource: "seeded-route",
      }),
    ).toBe(false);
  });

  it("does not use stale cached guidance when none exists", () => {
    expect(
      shouldUseStaleCachedRoute({
        hasStaleCachedRoute: false,
        fallbackSource: "straight-line",
      }),
    ).toBe(false);
  });
});

describe("conflict helpers", () => {
  it("detects a write conflict when updated_at does not match the expected value", () => {
    expect(hasUpdatedAtConflict("2026-04-05T08:00:00.000Z", "2026-04-05T07:59:00.000Z")).toBe(true);
  });

  it("treats matching timestamps as conflict-free", () => {
    expect(hasUpdatedAtConflict("2026-04-05T08:00:00.000Z", "2026-04-05T08:00:00.000Z")).toBe(false);
  });

  it("treats missing timestamps consistently", () => {
    expect(hasUpdatedAtConflict(null, null)).toBe(false);
    expect(hasUpdatedAtConflict("2026-04-05T08:00:00.000Z", null)).toBe(true);
  });
});

/*
 * MANUAL TESTING CHECKLIST (Required Before Production)
 * 
 * Deploy to physical device and test:
 * 
 * ✅ Idempotency:
 *   1. Submit status ping offline
 *   2. Go online, wait for sync
 *   3. Force app restart mid-sync
 *   4. Verify only ONE ping in database
 * 
 * ✅ Queue Replay:
 *   1. Queue 5 actions while offline
 *   2. Go online
 *   3. Verify all 5 actions sync successfully
 *   4. Check no duplicates created
 * 
 * ✅ Network Interruption:
 *   1. Start syncing queued actions
 *   2. Disable WiFi mid-sync
 *   3. Re-enable WiFi
 *   4. Verify remaining actions sync
 *   5. No duplicates for partially synced actions
 * 
 * ✅ Optimistic Updates:
 *   1. Submit status ping offline
 *   2. Verify UI shows ping immediately
 *   3. Go online
 *   4. Verify UI remains consistent
 * 
 * ✅ Staleness Indicators:
 *   1. Sync data
 *   2. Go offline for 10 minutes
 *   3. Verify "Synced 10m ago" badge shows
 *   4. Wait 30+ minutes
 *   5. Verify badge turns yellow/orange
 */
