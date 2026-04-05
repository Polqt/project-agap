import {
  patchOfflineHousehold,
  patchOfflineRegistryHousehold,
  rebuildOfflineNeedsSummary,
  removeOfflineWelfareAssignment,
  saveOfflineLatestStatusPing,
  syncOfflineDatasets,
  upsertOfflineBroadcast,
  upsertOfflineNeedsReport,
} from "@/services/offlineData";
import type {
  BroadcastCreateQueuePayload,
  CheckInManualQueuePayload,
  CheckInProxyQueuePayload,
  CheckInQrQueuePayload,
  NeedsReportSubmitQueuePayload,
  QueuedAction,
  StatusPingQueuePayload,
  WelfareRecordOutcomeQueuePayload,
} from "@/types/offline";

function createTimestamp() {
  return new Date().toISOString();
}

export async function projectQueuedActionLocally(action: QueuedAction) {
  const meta = action.meta;

  if (!meta) {
    return;
  }

  switch (action.type) {
    case "status-ping.submit": {
      const payload = action.payload as StatusPingQueuePayload;
      await saveOfflineLatestStatusPing(meta.scopeId, {
        id: payload.clientMutationId ?? action.id,
        barangay_id: meta.barangayId,
        resident_id: meta.profileId,
        household_id: payload.householdId ?? null,
        status: payload.status,
        channel: "app",
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        message: payload.message ?? null,
        is_resolved: false,
        resolved_by: null,
        resolved_at: null,
        pinged_at: createTimestamp(),
      });
      return;
    }
    case "check-in.qr":
    case "check-in.manual":
    case "check-in.proxy": {
      const payload = action.payload as
        | CheckInQrQueuePayload
        | CheckInManualQueuePayload
        | CheckInProxyQueuePayload;
      const householdId = "householdId" in payload ? payload.householdId ?? null : null;

      if (householdId) {
        await patchOfflineRegistryHousehold(meta.scopeId, householdId, {
          evacuation_status: "checked_in",
        });
      }

      await patchOfflineHousehold(meta.scopeId, {
        evacuation_status: "checked_in",
      });
      return;
    }
    case "welfare.recordOutcome": {
      const payload = action.payload as WelfareRecordOutcomeQueuePayload;
      await removeOfflineWelfareAssignment(meta.scopeId, payload.householdId);
      await patchOfflineRegistryHousehold(meta.scopeId, payload.householdId, {
        evacuation_status: payload.outcome === "dispatch_again" ? "unknown" : payload.outcome,
        welfare_assigned_at: null,
        welfare_assigned_profile_id: null,
      });
      return;
    }
    case "needs-report.submit": {
      const payload = action.payload as NeedsReportSubmitQueuePayload;
      await upsertOfflineNeedsReport(meta.scopeId, {
        id: payload.clientMutationId ?? action.id,
        barangay_id: meta.barangayId,
        center_id: payload.centerId ?? null,
        submitted_by: meta.profileId,
        total_evacuees: payload.totalEvacuees,
        needs_food_packs: payload.needsFoodPacks,
        needs_water_liters: payload.needsWaterLiters,
        needs_medicine: payload.needsMedicine,
        needs_blankets: payload.needsBlankets,
        medical_cases: payload.medicalCases ?? null,
        notes: payload.notes ?? null,
        status: "pending",
        acknowledged_by: null,
        acknowledged_at: null,
        submitted_at: createTimestamp(),
        updated_at: createTimestamp(),
      });
      await rebuildOfflineNeedsSummary(meta.scopeId);
      return;
    }
    case "broadcast.create": {
      const payload = action.payload as BroadcastCreateQueuePayload;
      await upsertOfflineBroadcast(meta.scopeId, {
        id: payload.broadcastId ?? payload.clientMutationId ?? action.id,
        barangay_id: meta.barangayId,
        sent_by: meta.profileId,
        broadcast_type: payload.broadcastType,
        message: payload.message,
        message_filipino: payload.messageFilipino ?? null,
        target_purok: payload.targetPurok ?? null,
        push_sent_count: 0,
        sms_sent_count: 0,
        sent_at: payload.sentAt ?? createTimestamp(),
      });
      return;
    }
    default:
      return;
  }
}

export async function syncQueuedActionDatasets(action: QueuedAction) {
  const meta = action.meta;

  if (!meta) {
    return;
  }

  switch (action.type) {
    case "status-ping.submit":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "resident",
        },
        ["latestStatusPing", "household", "residentAccess"],
      );
      return;
    case "check-in.qr":
    case "check-in.manual":
    case "check-in.proxy":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "resident",
        },
        ["household", "evacuationCenters", "residentAccess"],
      );
      return;
    case "welfare.recordOutcome":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["welfareAssignments", "registryHouseholds", "dashboardSummary", "welfareDispatch"],
      );
      return;
    case "needs-report.submit":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["needsReports", "needsSummary", "dashboardSummary"],
      );
      return;
    case "broadcast.create":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["broadcasts", "smsLogs"],
      );
      return;
    default:
      return;
  }
}
