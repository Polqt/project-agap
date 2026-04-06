import {
  patchOfflineCenterSupplies,
  patchOfflineEvacuationCenter,
  patchOfflineMissingPerson,
  patchOfflineProfile,
  patchOfflineResidentAccess,
  patchOfflineDashboardSummary,
  patchOfflineHousehold,
  patchOfflineRegistryHousehold,
  rebuildOfflineNeedsSummary,
  removeOfflineWelfareAssignment,
  saveOfflineHousehold,
  saveOfflineLatestStatusPing,
  saveOfflinePinnedLocation,
  syncOfflineDatasets,
  upsertOfflineBroadcast,
  upsertOfflineMissingPerson,
  upsertOfflineNeedsReport,
} from "@/services/offlineData";
import type {
  BarangaySetResidentAccessQueuePayload,
  BroadcastCreateQueuePayload,
  CenterRotateQrQueuePayload,
  CenterToggleOpenQueuePayload,
  CenterUpdateSuppliesQueuePayload,
  CheckInManualQueuePayload,
  CheckInProxyQueuePayload,
  CheckInQrQueuePayload,
  HouseholdAssignWelfareQueuePayload,
  HouseholdRegisterQueuePayload,
  HouseholdUpdateStatusQueuePayload,
  MissingPersonMarkFoundQueuePayload,
  MissingPersonReportQueuePayload,
  NeedsReportSubmitQueuePayload,
  ProfileClearPinnedLocationQueuePayload,
  ProfileSetPinnedLocationQueuePayload,
  ProfileUpdateQueuePayload,
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
    case "household.register": {
      const payload = action.payload as HouseholdRegisterQueuePayload;
      await saveOfflineHousehold(meta.scopeId, {
        id: payload.clientMutationId ?? action.id,
        barangay_id: meta.barangayId,
        registered_by: meta.profileId,
        household_head: payload.householdHead,
        purok: payload.purok,
        address: payload.address,
        phone_number: payload.phoneNumber ?? null,
        total_members: payload.totalMembers,
        vulnerability_flags: payload.vulnerabilityFlags,
        is_sms_only: payload.isSmsOnly,
        evacuation_status: "unknown",
        notes: payload.notes ?? null,
        created_at: createTimestamp(),
        updated_at: createTimestamp(),
        welfare_assigned_profile_id: null,
        welfare_assigned_at: null,
        household_members: payload.members.map((member, index) => ({
          id: `${action.id}:member:${index}`,
          household_id: payload.clientMutationId ?? action.id,
          full_name: member.fullName,
          age: member.age ?? null,
          vulnerability_flags: member.vulnerabilityFlags,
          notes: member.notes ?? null,
          created_at: createTimestamp(),
        })),
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
    case "household.update-status": {
      const payload = action.payload as HouseholdUpdateStatusQueuePayload;
      await patchOfflineRegistryHousehold(meta.scopeId, payload.householdId, {
        evacuation_status: payload.evacuationStatus,
        welfare_assigned_at:
          payload.evacuationStatus === "welfare_check_dispatched" ? createTimestamp() : null,
        welfare_assigned_profile_id:
          payload.evacuationStatus === "welfare_check_dispatched" ? meta.profileId : null,
      });
      return;
    }
    case "household.assign-welfare": {
      const payload = action.payload as HouseholdAssignWelfareQueuePayload;
      await patchOfflineRegistryHousehold(meta.scopeId, payload.householdId, {
        evacuation_status: "welfare_check_dispatched",
        welfare_assigned_at: createTimestamp(),
        welfare_assigned_profile_id: payload.assigneeProfileId ?? meta.profileId,
      });
      return;
    }
    case "center.toggle-open": {
      const payload = action.payload as CenterToggleOpenQueuePayload;
      await patchOfflineEvacuationCenter(meta.scopeId, payload.centerId, {
        is_open: payload.isOpen,
      });
      return;
    }
    case "center.rotate-qr": {
      const payload = action.payload as CenterRotateQrQueuePayload;
      await patchOfflineEvacuationCenter(meta.scopeId, payload.centerId, {
        qr_code_token: payload.clientMutationId ?? action.id,
      });
      return;
    }
    case "center.update-supplies": {
      const payload = action.payload as CenterUpdateSuppliesQueuePayload;
      await patchOfflineCenterSupplies(meta.scopeId, payload.centerId, {
        ...(payload.foodPacks !== undefined ? { food_packs: payload.foodPacks } : {}),
        ...(payload.waterLiters !== undefined ? { water_liters: payload.waterLiters } : {}),
        ...(payload.medicineUnits !== undefined ? { medicine_units: payload.medicineUnits } : {}),
        ...(payload.blankets !== undefined ? { blankets: payload.blankets } : {}),
        updated_at: createTimestamp(),
        updated_by: meta.profileId,
      });
      return;
    }
    case "missing-person.report": {
      const payload = action.payload as MissingPersonReportQueuePayload;
      await upsertOfflineMissingPerson(meta.scopeId, {
        id: payload.clientMutationId ?? action.id,
        barangay_id: meta.barangayId,
        reported_by: meta.profileId,
        full_name: payload.fullName,
        age: payload.age ?? null,
        last_seen_location: payload.lastSeenLocation ?? null,
        description: payload.description ?? null,
        status: "missing",
        found_at: null,
        found_by: null,
        created_at: createTimestamp(),
        updated_at: createTimestamp(),
      });
      return;
    }
    case "missing-person.mark-found": {
      const payload = action.payload as MissingPersonMarkFoundQueuePayload;
      await patchOfflineMissingPerson(meta.scopeId, payload.id, {
        status: "found",
        found_at: createTimestamp(),
        found_by: meta.profileId,
        updated_at: createTimestamp(),
      });
      return;
    }
    case "profile.update": {
      const payload = action.payload as ProfileUpdateQueuePayload;
      await patchOfflineProfile(meta.scopeId, {
        ...(payload.fullName !== undefined ? { full_name: payload.fullName } : {}),
        ...(payload.phoneNumber !== undefined ? { phone_number: payload.phoneNumber } : {}),
        ...(payload.barangayId !== undefined ? { barangay_id: payload.barangayId } : {}),
        ...(payload.purok !== undefined ? { purok: payload.purok } : {}),
        ...(payload.isSmsOnly !== undefined ? { is_sms_only: payload.isSmsOnly } : {}),
      });
      return;
    }
    case "profile.set-pinned-location": {
      const payload = action.payload as ProfileSetPinnedLocationQueuePayload;
      await saveOfflinePinnedLocation(meta.scopeId, {
        latitude: payload.latitude,
        longitude: payload.longitude,
        pinnedAt: createTimestamp(),
      });
      return;
    }
    case "profile.clear-pinned-location": {
      void (action.payload as ProfileClearPinnedLocationQueuePayload);
      await saveOfflinePinnedLocation(meta.scopeId, null);
      return;
    }
    case "barangay.set-resident-access": {
      const payload = action.payload as BarangaySetResidentAccessQueuePayload;
      await patchOfflineResidentAccess(meta.scopeId, {
        residentPingEnabled: payload.pingEnabled,
        residentCheckInEnabled: payload.checkInEnabled,
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
    case "household.register":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "resident",
        },
        ["latestStatusPing", "household", "residentAccess", "barangay"],
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
    case "household.update-status":
    case "household.assign-welfare":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["registryHouseholds", "dashboardSummary", "unaccountedHouseholds", "welfareAssignments", "welfareDispatch"],
      );
      return;
    case "center.toggle-open":
    case "center.rotate-qr":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["evacuationCenters"],
      );
      return;
    case "center.update-supplies":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["centerSupplies"],
      );
      return;
    case "missing-person.report":
    case "missing-person.mark-found":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["missingPersons"],
      );
      return;
    case "profile.update":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "resident",
        },
        ["barangay", "household", "residentAccess", "pinnedLocation"],
      );
      return;
    case "profile.set-pinned-location":
    case "profile.clear-pinned-location":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "resident",
        },
        ["pinnedLocation"],
      );
      return;
    case "barangay.set-resident-access":
      await syncOfflineDatasets(
        {
          scopeId: meta.scopeId,
          barangayId: meta.barangayId,
          profileId: meta.profileId,
          role: "official",
        },
        ["residentAccess", "barangay"],
      );
      return;
    default:
      return;
  }
}
