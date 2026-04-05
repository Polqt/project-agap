"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

const ResidentHeatmap = dynamic(
  () => import("../resident-heatmap").then((mod) => mod.ResidentHeatmap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[24rem] w-full" />,
  },
);

type EvacuationStatus =
  | "home"
  | "evacuating"
  | "checked_in"
  | "safe"
  | "need_help"
  | "unknown"
  | "welfare_check_dispatched"
  | "not_home";

type Household = {
  id: string;
  registered_by: string | null;
  household_head: string;
  purok: string;
  phone_number: string | null;
  evacuation_status: EvacuationStatus;
  updated_at: string | null;
  created_at: string;
};

type NeedHelpPing = {
  id: string;
  resident_id: string | null;
  household_id: string | null;
  status: "safe" | "need_help";
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  is_resolved: boolean;
  pinged_at: string;
};

type NeedHelpRow = {
  rowId: string;
  householdId: string | null;
  residentId: string | null;
  householdHead: string;
  purok: string;
  phoneNumber: string | null;
  currentStatus: EvacuationStatus;
  pingedAt: string;
  pingMessage: string | null;
};

function formatPHT(value: string | null | undefined) {
  if (!value) {
    return "No timestamp";
  }

  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: EvacuationStatus) {
  if (status === "need_help") return "Need Help";
  if (status === "safe") return "Safe";
  if (status === "welfare_check_dispatched") return "Welfare Dispatched";
  if (status === "checked_in") return "Checked In";
  if (status === "evacuating") return "Evacuating";
  if (status === "not_home") return "Not Home";
  if (status === "home") return "Home";
  return "Unaccounted";
}

export default function NeedHelpPage() {
  const queryClient = useQueryClient();

  const [statusDraftByHousehold, setStatusDraftByHousehold] = useState<Record<string, EvacuationStatus>>({});

  const summaryQuery = useQuery({
    ...trpc.dashboard.summary.queryOptions({}),
    refetchInterval: 15000,
  });

  const heatmapQuery = useQuery({
    ...trpc.dashboard.residentHeatmap.queryOptions({}),
    refetchInterval: 30000,
  });

  const householdsQuery = useQuery({
    ...trpc.households.list.queryOptions({ page: 1, pageSize: 100 }),
    refetchInterval: 15000,
  });

  const unresolvedPingsQuery = useQuery({
    ...trpc.statusPings.listUnresolved.queryOptions({}),
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    ...trpc.households.updateStatus.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [["households"]] });
      queryClient.invalidateQueries({ queryKey: [["dashboard"]] });
      queryClient.invalidateQueries({ queryKey: [["statusPings"]] });

      const comms = (data as {
        _statusComms?: {
          smsSent?: boolean;
          smsAttempted?: boolean;
          smsError?: string | null;
          appNotified?: boolean;
          appError?: string | null;
        };
      })._statusComms;

      if (comms?.smsAttempted && !comms.smsSent) {
        toast.error(comms.smsError || "Status updated, but SMS did not send through the gateway.");
        return;
      }

      if (comms?.appError && !comms.appNotified) {
        toast.error(comms.appError);
        return;
      }

      toast.success("Status updated and notifications dispatched.");
    },
  });

  const households = (householdsQuery.data?.items ?? []) as Household[];
  const householdById = useMemo(() => {
    const next = new Map<string, Household>();
    for (const household of households) {
      next.set(household.id, household);
    }
    return next;
  }, [households]);

  const householdByResidentId = useMemo(() => {
    const next = new Map<string, Household>();
    for (const household of households) {
      if (household.registered_by && !next.has(household.registered_by)) {
        next.set(household.registered_by, household);
      }
    }
    return next;
  }, [households]);

  const needHelpPings = useMemo(() => {
    const filtered = ((unresolvedPingsQuery.data ?? []) as NeedHelpPing[]).filter(
      (ping) => ping.status === "need_help" && ping.is_resolved === false,
    );

    const seen = new Set<string>();
    return filtered.filter((ping) => {
      if (seen.has(ping.id)) {
        return false;
      }
      seen.add(ping.id);
      return true;
    });
  }, [unresolvedPingsQuery.data]);

  const rows = useMemo<NeedHelpRow[]>(() => {
    const fromPings = needHelpPings.map((ping) => {
      const household = ping.household_id
        ? householdById.get(ping.household_id)
        : ping.resident_id
          ? householdByResidentId.get(ping.resident_id)
          : undefined;
      const fallbackHead = ping.resident_id
        ? `Resident ${ping.resident_id.slice(0, 8)}`
        : "Unknown resident";

      return {
        rowId: `ping:${ping.id}`,
        householdId: ping.household_id ?? household?.id ?? null,
        residentId: ping.resident_id,
        householdHead: household?.household_head ?? fallbackHead,
        purok: household?.purok ?? "N/A",
        phoneNumber: household?.phone_number ?? null,
        currentStatus: household?.evacuation_status ?? "need_help",
        pingedAt: ping.pinged_at,
        pingMessage: ping.message,
      };
    });

    if (fromPings.length > 0) {
      const latestByEntity = new Map<string, NeedHelpRow>();

      for (const row of fromPings) {
        const entityKey = row.householdId
          ? `household:${row.householdId}`
          : row.residentId
            ? `resident:${row.residentId}`
            : row.rowId;

        const current = latestByEntity.get(entityKey);

        if (!current || Date.parse(row.pingedAt) > Date.parse(current.pingedAt)) {
          latestByEntity.set(entityKey, {
            ...row,
            rowId: entityKey,
          });
        }
      }

      return Array.from(latestByEntity.values()).sort(
        (left, right) => Date.parse(right.pingedAt) - Date.parse(left.pingedAt),
      );
    }

    return households
      .filter((household) => household.evacuation_status === "need_help")
      .map((household) => ({
        rowId: `household:${household.id}`,
        householdId: household.id,
        residentId: null,
        householdHead: household.household_head,
        purok: household.purok,
        phoneNumber: household.phone_number,
        currentStatus: household.evacuation_status,
        pingedAt: household.updated_at ?? household.created_at,
        pingMessage: null,
      }));
  }, [needHelpPings, householdById, householdByResidentId, households]);

  const needHelpPingPoints = useMemo(
    () =>
      needHelpPings
        .filter((ping) => ping.latitude !== null && ping.longitude !== null)
        .map((ping) => ({
          id: ping.id,
          resident_id: ping.resident_id,
          latitude: ping.latitude as number,
          longitude: ping.longitude as number,
          pinged_at: ping.pinged_at,
        })),
    [needHelpPings],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          Need Help Status Pings
        </h1>
        <p className="text-base text-muted-foreground">
          Review active need-help cases, update status, and send automatic SMS plus app notifications.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Need Help (summary)</p>
            <p className="mt-1 text-3xl font-semibold">{summaryQuery.data?.need_help_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Active need-help pings</p>
            <p className="mt-1 text-3xl font-semibold">{needHelpPings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Residents in list</p>
            <p className="mt-1 text-3xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="text-base">Need-help map</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ResidentHeatmap points={heatmapQuery.data ?? []} needHelpPings={needHelpPingPoints} />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Residents needing help
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {householdsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
              <p className="text-base font-medium">No residents currently marked as need help</p>
              <p className="text-sm text-muted-foreground">New need-help cases will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Resident</th>
                    <th className="px-3 py-2 font-semibold">Purok</th>
                    <th className="px-3 py-2 font-semibold">Phone</th>
                    <th className="px-3 py-2 font-semibold">Current status</th>
                    <th className="px-3 py-2 font-semibold">Latest ping</th>
                    <th className="px-3 py-2 font-semibold">Ping note</th>
                    <th className="px-3 py-2 font-semibold">Update to</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const nextStatus = row.householdId
                      ? (statusDraftByHousehold[row.householdId] ?? "safe")
                      : "safe";
                    const canUpdate = Boolean(row.householdId);

                    return (
                      <tr key={row.rowId} className="border-b border-border/70 align-top">
                        <td className="px-3 py-2 font-medium">{row.householdHead}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.purok}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.phoneNumber ?? "No phone"}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-md bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
                            {statusLabel(row.currentStatus)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{formatPHT(row.pingedAt)}</td>
                        <td className="max-w-[300px] px-3 py-2 text-muted-foreground">
                          <p className="line-clamp-3">{row.pingMessage ?? "No message attached."}</p>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={nextStatus}
                            disabled={!canUpdate}
                            onChange={(e) => {
                              const householdId = row.householdId;
                              if (!householdId) {
                                return;
                              }

                              setStatusDraftByHousehold((prev) => ({
                                ...prev,
                                [householdId]: e.target.value as EvacuationStatus,
                              }));
                            }}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="safe">Safe</option>
                            <option value="welfare_check_dispatched">Welfare dispatched</option>
                            <option value="need_help">Keep as need help</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            className="h-8 rounded-md px-2.5 text-xs"
                            disabled={updateStatus.isPending || !canUpdate}
                            onClick={() => {
                              if (!row.householdId) {
                                return;
                              }

                              updateStatus.mutate({
                                householdId: row.householdId,
                                evacuationStatus: nextStatus,
                                notifyBySms: true,
                                notifyInApp: true,
                              });
                            }}
                          >
                            {updateStatus.isPending ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5" />
                                {canUpdate ? "Update + notify" : "No linked household"}
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
