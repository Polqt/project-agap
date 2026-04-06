import type { NeedsSummary } from "@project-agap/api/ai/needsSummaryBuilder";
import { aggregateNeedsReports, buildNeedsSummary } from "@project-agap/api/ai/needsSummaryBuilder";
import type {
  Alert,
  AppRole,
  Barangay,
  Broadcast,
  CenterSupplies,
  DashboardSummary,
  EvacuationCenter,
  EvacuationRoute,
  Household,
  HouseholdWithMembers,
  MissingPerson,
  NeedsReport,
  Profile,
  SmsLog,
  StatusPing,
  WelfareDispatchQueueItem,
} from "@project-agap/api/supabase";
import type { LocationPoint } from "@/types/map";

import { listBroadcastsForBarangay, listOutboundSmsLogsForBarangay } from "@/features/broadcast/services/broadcasts";
import { getConfiguredOfflineTilePack } from "@/features/map/services/offlineTileStrategy";
import { saveOfflineMapPack } from "@/services/mapCache";
import { trpcClient } from "@/services/trpc";

import {
  deleteOfflineDocument,
  listOfflineDocuments,
  readOfflineDocument,
  readOfflineSyncTimestamp,
  replaceOfflineCollection,
  setOfflineSyncTimestamp,
  writeOfflineDocument,
} from "./offlineDataDb";

const GLOBAL_SCOPE_ID = "global";
const AUTH_PROFILE_COLLECTION = "auth-profile";

const OFFLINE_COLLECTIONS = {
  barangay: "barangay",
  profile: "profile",
  pinnedLocation: "pinned-location",
  household: "household",
  evacuationCenters: "evacuation-centers",
  evacuationRoutes: "evacuation-routes",
  centerSupplies: "center-supplies",
  residentAccess: "resident-access",
  alerts: "alerts",
  broadcasts: "broadcasts",
  latestStatusPing: "latest-status-ping",
  missingPersons: "missing-persons",
  dashboardSummary: "dashboard-summary",
  unresolvedPings: "unresolved-pings",
  unaccountedHouseholds: "unaccounted-households",
  welfareDispatch: "welfare-dispatch",
  welfareAssignments: "welfare-assignments",
  registryHouseholds: "registry-households",
  needsReports: "needs-reports",
  needsSummary: "needs-summary",
  smsLogs: "sms-logs",
} as const;

type OfflineCollectionName = (typeof OFFLINE_COLLECTIONS)[keyof typeof OFFLINE_COLLECTIONS];

export type OfflineResidentAccess = {
  barangayId: string;
  residentPingEnabled: boolean;
  residentCheckInEnabled: boolean;
  alertLevel: Barangay["alert_level"];
  activeAlertText: string | null;
  updatedAt: string | null;
};

export type OfflineScope = {
  scopeId: string;
  role: AppRole;
  barangayId: string;
  profileId: string;
};

export function getOfflineScope(profile: Pick<Profile, "id" | "role" | "barangay_id"> | null) {
  if (!profile?.barangay_id) {
    return null;
  }

  return {
    scopeId: `${profile.role}:${profile.barangay_id}:${profile.id}`,
    role: profile.role,
    barangayId: profile.barangay_id,
    profileId: profile.id,
  } satisfies OfflineScope;
}

function toSingletonDocument<TValue>(id: string, value: TValue) {
  return {
    id,
    value,
  };
}

async function writeSingleton<TValue>(scopeId: string, collection: OfflineCollectionName, value: TValue) {
  await writeOfflineDocument(scopeId, collection, "singleton", value);
}

async function readSingleton<TValue>(scopeId: string, collection: OfflineCollectionName) {
  return readOfflineDocument<TValue>(scopeId, collection, "singleton");
}

export async function saveOfflineAuthProfile(profile: Profile) {
  await writeOfflineDocument(GLOBAL_SCOPE_ID, AUTH_PROFILE_COLLECTION, profile.id, profile);
}

export async function getOfflineAuthProfile(userId: string) {
  return readOfflineDocument<Profile>(GLOBAL_SCOPE_ID, AUTH_PROFILE_COLLECTION, userId);
}

export async function saveOfflineProfile(profile: Profile) {
  const scope = getOfflineScope(profile);

  await saveOfflineAuthProfile(profile);

  if (!scope) {
    return;
  }

  await writeSingleton(scope.scopeId, OFFLINE_COLLECTIONS.profile, profile);
}

export async function getOfflineProfile(scopeId: string) {
  return readSingleton<Profile>(scopeId, OFFLINE_COLLECTIONS.profile);
}

export async function patchOfflineProfile(scopeId: string, patch: Partial<Profile>) {
  const current = await getOfflineProfile(scopeId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies Profile;

  await saveOfflineProfile(next);
  return next;
}

export async function getOfflinePinnedLocation(scopeId: string) {
  return readSingleton<{ latitude: number; longitude: number; pinnedAt: string | null } | null>(
    scopeId,
    OFFLINE_COLLECTIONS.pinnedLocation,
  );
}

export async function saveOfflinePinnedLocation(
  scopeId: string,
  value: { latitude: number; longitude: number; pinnedAt: string | null } | null,
) {
  if (!value) {
    await deleteOfflineDocument(scopeId, OFFLINE_COLLECTIONS.pinnedLocation, "singleton");
    return;
  }

  await writeSingleton(scopeId, OFFLINE_COLLECTIONS.pinnedLocation, value);
}

export async function getOfflineBarangay(scopeId: string) {
  return readSingleton<Barangay>(scopeId, OFFLINE_COLLECTIONS.barangay);
}

export async function getOfflineHousehold(scopeId: string) {
  return readSingleton<HouseholdWithMembers | null>(scopeId, OFFLINE_COLLECTIONS.household);
}

export async function saveOfflineHousehold(scopeId: string, household: HouseholdWithMembers | null) {
  if (!household) {
    await deleteOfflineDocument(scopeId, OFFLINE_COLLECTIONS.household, "singleton");
    return;
  }

  await writeSingleton(scopeId, OFFLINE_COLLECTIONS.household, household);
}

export async function patchOfflineHousehold(
  scopeId: string,
  patch: Partial<HouseholdWithMembers>,
) {
  const current = await getOfflineHousehold(scopeId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies HouseholdWithMembers;

  await saveOfflineHousehold(scopeId, next);
  return next;
}

export async function listOfflineEvacuationCenters(scopeId: string) {
  return listOfflineDocuments<EvacuationCenter>(scopeId, OFFLINE_COLLECTIONS.evacuationCenters);
}

export async function listOfflineEvacuationRoutes(scopeId: string) {
  return listOfflineDocuments<EvacuationRoute>(scopeId, OFFLINE_COLLECTIONS.evacuationRoutes);
}

export async function getOfflineCenterSupplies(scopeId: string, centerId: string) {
  return readOfflineDocument<CenterSupplies>(scopeId, OFFLINE_COLLECTIONS.centerSupplies, centerId);
}

export async function upsertOfflineCenterSupplies(scopeId: string, supplies: CenterSupplies) {
  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.centerSupplies, supplies.center_id, supplies);
}

export async function patchOfflineCenterSupplies(
  scopeId: string,
  centerId: string,
  patch: Partial<CenterSupplies>,
) {
  const current = await getOfflineCenterSupplies(scopeId, centerId);
  const next = {
    center_id: centerId,
    food_packs: current?.food_packs ?? 0,
    water_liters: current?.water_liters ?? 0,
    medicine_units: current?.medicine_units ?? 0,
    blankets: current?.blankets ?? 0,
    updated_at: current?.updated_at ?? null,
    updated_by: current?.updated_by ?? null,
    ...patch,
  } satisfies CenterSupplies;

  await upsertOfflineCenterSupplies(scopeId, next);
  return next;
}

export async function listOfflineAlerts(scopeId: string) {
  return listOfflineDocuments<Alert>(scopeId, OFFLINE_COLLECTIONS.alerts);
}

export async function listOfflineBroadcasts(scopeId: string) {
  return listOfflineDocuments<Broadcast>(scopeId, OFFLINE_COLLECTIONS.broadcasts);
}

export async function upsertOfflineBroadcast(scopeId: string, broadcast: Broadcast) {
  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.broadcasts, broadcast.id, broadcast);
}

export async function listOfflineMissingPersons(scopeId: string) {
  return listOfflineDocuments<MissingPerson>(scopeId, OFFLINE_COLLECTIONS.missingPersons);
}

export async function getOfflineDashboardSummary(scopeId: string) {
  return readSingleton<DashboardSummary>(scopeId, OFFLINE_COLLECTIONS.dashboardSummary);
}

export async function listOfflineUnresolvedPings(scopeId: string) {
  return listOfflineDocuments<StatusPing>(scopeId, OFFLINE_COLLECTIONS.unresolvedPings);
}

export async function listOfflineUnaccountedHouseholds(scopeId: string) {
  return listOfflineDocuments<Household>(scopeId, OFFLINE_COLLECTIONS.unaccountedHouseholds);
}

export async function listOfflineWelfareDispatch(scopeId: string) {
  return listOfflineDocuments<WelfareDispatchQueueItem>(scopeId, OFFLINE_COLLECTIONS.welfareDispatch);
}

export async function listOfflineWelfareAssignments(scopeId: string) {
  return listOfflineDocuments<Household>(scopeId, OFFLINE_COLLECTIONS.welfareAssignments);
}

export async function listOfflineRegistryHouseholds(scopeId: string) {
  return listOfflineDocuments<Household>(scopeId, OFFLINE_COLLECTIONS.registryHouseholds);
}

export async function getOfflineRegistryHousehold(scopeId: string, householdId: string) {
  const household = await readOfflineDocument<Household | HouseholdWithMembers>(
    scopeId,
    OFFLINE_COLLECTIONS.registryHouseholds,
    householdId,
  );

  if (!household) {
    return null;
  }

  return {
    ...household,
    household_members: "household_members" in household ? household.household_members : [],
  } satisfies HouseholdWithMembers;
}

export async function searchOfflineRegistryHouseholds(scopeId: string, query: string) {
  const trimmedQuery = query.trim().toLowerCase();
  const households = await listOfflineRegistryHouseholds(scopeId);

  if (!trimmedQuery) {
    return households;
  }

  return households.filter((household) => {
    const text = [
      household.household_head,
      household.purok,
      household.address,
      household.phone_number ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(trimmedQuery);
  });
}

export async function listOfflineNeedsReports(scopeId: string) {
  return listOfflineDocuments<NeedsReport>(scopeId, OFFLINE_COLLECTIONS.needsReports);
}

export async function getOfflineNeedsSummary(scopeId: string) {
  return readSingleton<NeedsSummary | null>(scopeId, OFFLINE_COLLECTIONS.needsSummary);
}

export async function listOfflineSmsLogs(scopeId: string) {
  return listOfflineDocuments<SmsLog>(scopeId, OFFLINE_COLLECTIONS.smsLogs);
}

export async function getOfflineResidentAccess(scopeId: string) {
  return readSingleton<OfflineResidentAccess>(scopeId, OFFLINE_COLLECTIONS.residentAccess);
}

export async function saveOfflineResidentAccess(scopeId: string, access: OfflineResidentAccess) {
  await writeSingleton(scopeId, OFFLINE_COLLECTIONS.residentAccess, access);
}

export async function getOfflineLatestStatusPing(scopeId: string) {
  return readSingleton<StatusPing | null>(scopeId, OFFLINE_COLLECTIONS.latestStatusPing);
}

export async function saveOfflineLatestStatusPing(scopeId: string, ping: StatusPing | null) {
  if (!ping) {
    await deleteOfflineDocument(scopeId, OFFLINE_COLLECTIONS.latestStatusPing, "singleton");
    return;
  }

  await writeSingleton(scopeId, OFFLINE_COLLECTIONS.latestStatusPing, ping);
}

export async function getOfflineLastSyncedAt(scopeId: string) {
  return readOfflineSyncTimestamp(scopeId, "full");
}

async function markDatasetSynced(scopeId: string, dataset: string) {
  await setOfflineSyncTimestamp(scopeId, dataset);
}

export async function refreshOfflineMapPack(scope: OfflineScope) {
  const [centers, routes, alerts] = await Promise.all([
    listOfflineEvacuationCenters(scope.scopeId),
    listOfflineEvacuationRoutes(scope.scopeId),
    listOfflineAlerts(scope.scopeId),
  ]);

  await saveOfflineMapPack({
    barangayId: scope.barangayId,
    centers,
    routes,
    alerts,
    tilePack: getConfiguredOfflineTilePack(),
    updatedAt: Date.now(),
  });
}

function createPendingNeedsSummary(reports: NeedsReport[], barangayName: string) {
  if (reports.length === 0) {
    return null;
  }

  return buildNeedsSummary(aggregateNeedsReports(reports), barangayName);
}

export async function syncOfflineBarangay(scope: OfflineScope) {
  const barangay = await trpcClient.barangays.getById.query({ id: scope.barangayId });
  await writeSingleton(scope.scopeId, OFFLINE_COLLECTIONS.barangay, barangay);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.barangay);
  return barangay;
}

export async function syncOfflineEvacuationCenters(scope: OfflineScope) {
  const centers = await trpcClient.evacuationCenters.listByBarangay.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.evacuationCenters, centers);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.evacuationCenters);
  await refreshOfflineMapPack(scope);
  return centers;
}

export async function syncOfflineEvacuationRoutes(scope: OfflineScope) {
  const routes = await trpcClient.evacuationRoutes.listByBarangay.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.evacuationRoutes, routes);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.evacuationRoutes);
  await refreshOfflineMapPack(scope);
  return routes;
}

export async function syncOfflineResidentAccess(scope: OfflineScope) {
  const access = await trpcClient.barangays.getMyResidentAccess.query();
  await saveOfflineResidentAccess(scope.scopeId, access);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.residentAccess);
  return access;
}

export async function syncOfflinePinnedLocation(scope: OfflineScope) {
  const pinnedLocation = await trpcClient.profile.getPinnedLocation.query();
  await saveOfflinePinnedLocation(scope.scopeId, pinnedLocation);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.pinnedLocation);
  return pinnedLocation;
}

export async function syncOfflineCenterSupplies(scope: OfflineScope, centerId: string) {
  const supplies = await trpcClient.evacuationCenters.getSupplies.query({ centerId });
  await upsertOfflineCenterSupplies(scope.scopeId, supplies);
  await markDatasetSynced(scope.scopeId, `${OFFLINE_COLLECTIONS.centerSupplies}:${centerId}`);
  return supplies;
}

export async function syncOfflineAllCenterSupplies(scope: OfflineScope) {
  const centers = await listOfflineEvacuationCenters(scope.scopeId);
  await Promise.all(centers.map((center) => syncOfflineCenterSupplies(scope, center.id)));
}

export async function syncOfflineAlerts(scope: OfflineScope) {
  const alerts = await trpcClient.alerts.listActive.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.alerts, alerts);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.alerts);
  await refreshOfflineMapPack(scope);
  return alerts;
}

export async function syncOfflineBroadcasts(scope: OfflineScope) {
  const broadcasts = await listBroadcastsForBarangay(scope.barangayId);
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.broadcasts, broadcasts);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.broadcasts);
  return broadcasts;
}

export async function syncOfflineHousehold(scope: OfflineScope) {
  const household = await trpcClient.households.getMine.query();
  await saveOfflineHousehold(scope.scopeId, household);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.household);
  return household;
}

export async function syncOfflineLatestStatusPing(scope: OfflineScope) {
  const ping = await trpcClient.statusPings.getLatestMine.query();
  await saveOfflineLatestStatusPing(scope.scopeId, ping);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.latestStatusPing);
  return ping;
}

export async function syncOfflineMissingPersons(scope: OfflineScope) {
  const missingPersons = await trpcClient.missingPersons.list.query({ statusFilter: "missing" });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.missingPersons, missingPersons);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.missingPersons);
  return missingPersons;
}

export async function syncOfflineDashboardSummary(scope: OfflineScope) {
  const summary = await trpcClient.dashboard.summary.query({ barangayId: scope.barangayId });
  await writeSingleton(scope.scopeId, OFFLINE_COLLECTIONS.dashboardSummary, summary);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.dashboardSummary);
  return summary;
}

export async function syncOfflineUnresolvedPings(scope: OfflineScope) {
  const pings = await trpcClient.statusPings.listUnresolved.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.unresolvedPings, pings);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.unresolvedPings);
  return pings;
}

export async function syncOfflineUnaccountedHouseholds(scope: OfflineScope) {
  const households = await trpcClient.households.getUnaccounted.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.unaccountedHouseholds, households);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.unaccountedHouseholds);
  return households;
}

export async function syncOfflineWelfareDispatch(scope: OfflineScope) {
  const items = await trpcClient.households.listWelfareDispatchQueue.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.welfareDispatch, items);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.welfareDispatch);
  return items;
}

export async function syncOfflineWelfareAssignments(scope: OfflineScope) {
  const households = await trpcClient.households.listMyWelfareAssignments.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.welfareAssignments, households);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.welfareAssignments);
  return households;
}

export async function syncOfflineRegistryHouseholds(scope: OfflineScope) {
  const householdList = await trpcClient.households.list.query({
    barangayId: scope.barangayId,
    page: 1,
    pageSize: 500,
  });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.registryHouseholds, householdList.items);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.registryHouseholds);
  return householdList.items;
}

export async function syncOfflineNeedsReports(scope: OfflineScope) {
  const reports = await trpcClient.needsReports.list.query({ barangayId: scope.barangayId });
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.needsReports, reports);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.needsReports);
  return reports;
}

export async function syncOfflineNeedsSummary(scope: OfflineScope) {
  const summary = await trpcClient.needsReports.getSummary.query({ barangayId: scope.barangayId });
  await writeSingleton(scope.scopeId, OFFLINE_COLLECTIONS.needsSummary, summary);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.needsSummary);
  return summary;
}

export async function syncOfflineSmsLogs(scope: OfflineScope) {
  const smsLogs = await listOutboundSmsLogsForBarangay(scope.barangayId);
  await replaceOfflineCollection(scope.scopeId, OFFLINE_COLLECTIONS.smsLogs, smsLogs);
  await markDatasetSynced(scope.scopeId, OFFLINE_COLLECTIONS.smsLogs);
  return smsLogs;
}

async function syncResidentDatasets(scope: OfflineScope) {
  await Promise.all([
    syncOfflineBarangay(scope),
    syncOfflineEvacuationCenters(scope),
    syncOfflineEvacuationRoutes(scope),
    syncOfflinePinnedLocation(scope),
    syncOfflineResidentAccess(scope),
    syncOfflineAlerts(scope),
    syncOfflineBroadcasts(scope),
    syncOfflineHousehold(scope),
    syncOfflineLatestStatusPing(scope),
    syncOfflineMissingPersons(scope),
  ]);
}

async function syncOfficialDatasets(scope: OfflineScope) {
  await Promise.all([
    syncOfflineBarangay(scope),
    syncOfflineEvacuationCenters(scope),
    syncOfflineEvacuationRoutes(scope),
    syncOfflinePinnedLocation(scope),
    syncOfflineResidentAccess(scope),
    syncOfflineAlerts(scope),
    syncOfflineBroadcasts(scope),
    syncOfflineDashboardSummary(scope),
    syncOfflineUnresolvedPings(scope),
    syncOfflineUnaccountedHouseholds(scope),
    syncOfflineWelfareDispatch(scope),
    syncOfflineWelfareAssignments(scope),
    syncOfflineRegistryHouseholds(scope),
    syncOfflineNeedsReports(scope),
    syncOfflineNeedsSummary(scope),
    syncOfflineSmsLogs(scope),
  ]);
  await syncOfflineAllCenterSupplies(scope);
}

export async function syncOfflineDataForProfile(profile: Profile) {
  const scope = getOfflineScope(profile);

  await saveOfflineProfile(profile);

  if (!scope) {
    return null;
  }

  if (scope.role === "resident") {
    await syncResidentDatasets(scope);
  } else {
    await syncOfficialDatasets(scope);
  }

  await setOfflineSyncTimestamp(scope.scopeId, "full");
  await refreshOfflineMapPack(scope);
  return scope;
}

export async function upsertOfflineRegistryHousehold(scopeId: string, household: Household) {
  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.registryHouseholds, household.id, household);
}

export async function patchOfflineResidentAccess(
  scopeId: string,
  patch: Partial<OfflineResidentAccess>,
) {
  const current = await getOfflineResidentAccess(scopeId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies OfflineResidentAccess;

  await saveOfflineResidentAccess(scopeId, next);
  return next;
}

export async function patchOfflineRegistryHousehold(
  scopeId: string,
  householdId: string,
  patch: Partial<Household>,
) {
  const current = await readOfflineDocument<Household>(scopeId, OFFLINE_COLLECTIONS.registryHouseholds, householdId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies Household;

  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.registryHouseholds, householdId, next);
  return next;
}

export async function patchOfflineEvacuationCenter(
  scopeId: string,
  centerId: string,
  patch: Partial<EvacuationCenter>,
) {
  const current = await readOfflineDocument<EvacuationCenter>(
    scopeId,
    OFFLINE_COLLECTIONS.evacuationCenters,
    centerId,
  );

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies EvacuationCenter;

  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.evacuationCenters, centerId, next);
  return next;
}

export async function removeOfflineUnresolvedPing(scopeId: string, pingId: string) {
  await deleteOfflineDocument(scopeId, OFFLINE_COLLECTIONS.unresolvedPings, pingId);
}

export async function patchOfflineDashboardSummary(
  scopeId: string,
  updater: (current: DashboardSummary | null) => DashboardSummary | null,
) {
  const current = await getOfflineDashboardSummary(scopeId);
  const next = updater(current ?? null);

  if (!next) {
    return null;
  }

  await writeSingleton(scopeId, OFFLINE_COLLECTIONS.dashboardSummary, next);
  return next;
}

export async function upsertOfflineNeedsReport(scopeId: string, report: NeedsReport) {
  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.needsReports, report.id, report);
}

export async function rebuildOfflineNeedsSummary(scopeId: string) {
  const [reports, barangay] = await Promise.all([
    listOfflineNeedsReports(scopeId),
    getOfflineBarangay(scopeId),
  ]);

  const summary = createPendingNeedsSummary(
    reports.filter((report) => report.status === "pending"),
    barangay?.name ?? "Unknown Barangay",
  );

  await writeSingleton(scopeId, OFFLINE_COLLECTIONS.needsSummary, summary);
  return summary;
}

export async function upsertOfflineMissingPerson(scopeId: string, person: MissingPerson) {
  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.missingPersons, person.id, person);
}

export async function patchOfflineMissingPerson(
  scopeId: string,
  personId: string,
  patch: Partial<MissingPerson>,
) {
  const current = await readOfflineDocument<MissingPerson>(
    scopeId,
    OFFLINE_COLLECTIONS.missingPersons,
    personId,
  );

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
  } satisfies MissingPerson;

  await writeOfflineDocument(scopeId, OFFLINE_COLLECTIONS.missingPersons, personId, next);
  return next;
}

export async function removeOfflineWelfareAssignment(scopeId: string, householdId: string) {
  await deleteOfflineDocument(scopeId, OFFLINE_COLLECTIONS.welfareAssignments, householdId);
}

export async function syncOfflineDatasets(
  scope: OfflineScope,
  datasets: Array<
    | "evacuationCenters"
    | "centerSupplies"
    | "dashboardSummary"
    | "unresolvedPings"
    | "unaccountedHouseholds"
    | "welfareDispatch"
    | "welfareAssignments"
    | "registryHouseholds"
    | "needsReports"
    | "needsSummary"
    | "missingPersons"
    | "alerts"
    | "broadcasts"
    | "smsLogs"
    | "barangay"
    | "evacuationRoutes"
    | "household"
    | "latestStatusPing"
    | "residentAccess"
    | "pinnedLocation"
  >,
) {
  const tasks = datasets.map((dataset) => {
    switch (dataset) {
      case "evacuationCenters":
        return syncOfflineEvacuationCenters(scope);
      case "dashboardSummary":
        return syncOfflineDashboardSummary(scope);
      case "centerSupplies":
        return syncOfflineAllCenterSupplies(scope);
      case "unresolvedPings":
        return syncOfflineUnresolvedPings(scope);
      case "unaccountedHouseholds":
        return syncOfflineUnaccountedHouseholds(scope);
      case "welfareDispatch":
        return syncOfflineWelfareDispatch(scope);
      case "welfareAssignments":
        return syncOfflineWelfareAssignments(scope);
      case "registryHouseholds":
        return syncOfflineRegistryHouseholds(scope);
      case "needsReports":
        return syncOfflineNeedsReports(scope);
      case "needsSummary":
        return syncOfflineNeedsSummary(scope);
      case "missingPersons":
        return syncOfflineMissingPersons(scope);
      case "alerts":
        return syncOfflineAlerts(scope);
      case "broadcasts":
        return syncOfflineBroadcasts(scope);
      case "smsLogs":
        return syncOfflineSmsLogs(scope);
      case "barangay":
        return syncOfflineBarangay(scope);
      case "evacuationRoutes":
        return syncOfflineEvacuationRoutes(scope);
      case "household":
        return syncOfflineHousehold(scope);
      case "latestStatusPing":
        return syncOfflineLatestStatusPing(scope);
      case "residentAccess":
        return syncOfflineResidentAccess(scope);
      case "pinnedLocation":
        return syncOfflinePinnedLocation(scope);
      default:
        return Promise.resolve(null);
    }
  });

  await Promise.all(tasks);
}
