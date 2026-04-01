"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/utils/trpc";

type VulnerabilityFlag =
  | "elderly"
  | "pwd"
  | "infant"
  | "pregnant"
  | "solo_parent"
  | "chronic_illness";

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
  barangay_id: string;
  registered_by: string | null;
  household_head: string;
  purok: string;
  address: string;
  phone_number: string | null;
  total_members: number;
  vulnerability_flags: VulnerabilityFlag[];
  is_sms_only: boolean;
  evacuation_status: EvacuationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<EvacuationStatus, { label: string; className: string }> = {
  safe: { label: "Safe", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  checked_in: {
    label: "Checked In",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  need_help: { label: "Need Help", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  unknown: { label: "Unaccounted", className: "bg-muted text-muted-foreground" },
  home: { label: "Unaccounted", className: "bg-muted text-muted-foreground" },
  evacuating: {
    label: "Evacuating",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  welfare_check_dispatched: {
    label: "Welfare dispatch",
    className: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
  },
  not_home: {
    label: "Not home",
    className: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
};

const VULNERABILITY_LABELS: Record<VulnerabilityFlag, string> = {
  elderly: "Elderly",
  pwd: "PWD",
  infant: "Infant",
  pregnant: "Pregnant",
  solo_parent: "Solo Parent",
  chronic_illness: "Chronic",
};

const ALL_VULNERABILITY_FLAGS: VulnerabilityFlag[] = [
  "elderly",
  "pwd",
  "infant",
  "pregnant",
  "solo_parent",
  "chronic_illness",
];

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isUnaccounted(status: EvacuationStatus) {
  return status === "unknown" || status === "home" || status === "not_home";
}

function getSortPriority(h: Household): number {
  if (h.evacuation_status === "need_help") return 0;
  if (h.evacuation_status === "welfare_check_dispatched") return 1;
  if (isUnaccounted(h.evacuation_status) && h.vulnerability_flags.length > 0) return 2;
  if (isUnaccounted(h.evacuation_status)) return 3;
  if (h.evacuation_status === "evacuating") return 4;
  if (h.evacuation_status === "checked_in") return 5;
  if (h.evacuation_status === "safe") return 6;
  return 5;
}

function getChannel(h: Household) {
  if (h.is_sms_only) return "SMS";
  if (h.phone_number) return "App";
  return "—";
}

export function LiveStatusPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [purokFilter, setPurokFilter] = useState("all");
  const [vulnFilter, setVulnFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    ...trpc.dashboard.summary.queryOptions({}),
    refetchInterval: 15000,
  });

  const { data: householdData, isLoading: householdsLoading } = useQuery({
    ...trpc.households.list.queryOptions({ page: 1, pageSize: 100 }),
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    ...trpc.households.updateStatus.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["households"]] });
      queryClient.invalidateQueries({ queryKey: [["dashboard"]] });
    },
  });

  const households = (householdData?.items ?? []) as Household[];

  const puroks = useMemo(
    () => [...new Set(households.map((h) => h.purok))].sort(),
    [households],
  );

  const filtered = useMemo(() => {
    let result = households;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((h) => h.household_head.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      result = result.filter((h) => {
        if (statusFilter === "unaccounted") return isUnaccounted(h.evacuation_status);
        return h.evacuation_status === statusFilter;
      });
    }

    if (purokFilter !== "all") {
      result = result.filter((h) => h.purok === purokFilter);
    }

    if (vulnFilter !== "all") {
      result = result.filter((h) =>
        h.vulnerability_flags.includes(vulnFilter as VulnerabilityFlag),
      );
    }

    return [...result].sort((a, b) => getSortPriority(a) - getSortPriority(b));
  }, [households, search, statusFilter, purokFilter, vulnFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const handleOverride = (householdId: string, evacuationStatus: EvacuationStatus) => {
    updateStatus.mutate({ householdId, evacuationStatus });
  };

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Activity className="h-5 w-5" />
        Live Status
      </h1>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : (
          <>
            <StatCard
              label="Safe / Checked In"
              value={(summary?.safe_count ?? 0) + (summary?.checked_in_count ?? 0)}
              variant="success"
            />
            <StatCard
              label="Need Help"
              value={summary?.need_help_count ?? 0}
              variant="danger"
            />
            <StatCard
              label="Unaccounted"
              value={summary?.unaccounted_count ?? 0}
              variant="muted"
            />
          </>
        )}
      </div>

      {/* ── Resident Table ── */}
      <div className="rounded-lg border border-border bg-card">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="pl-8"
            />
          </div>

          <select
            value={purokFilter}
            onChange={(e) => {
              setPurokFilter(e.target.value);
              resetPage();
            }}
            className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="all">All Puroks</option>
            {puroks.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              resetPage();
            }}
            className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="all">All Statuses</option>
            <option value="safe">Safe</option>
            <option value="checked_in">Checked In</option>
            <option value="need_help">Need Help</option>
            <option value="unaccounted">Unaccounted</option>
            <option value="evacuating">Evacuating</option>
          </select>

          <select
            value={vulnFilter}
            onChange={(e) => {
              setVulnFilter(e.target.value);
              resetPage();
            }}
            className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
          >
            <option value="all">All Vulnerabilities</option>
            {ALL_VULNERABILITY_FLAGS.map((flag) => (
              <option key={flag} value={flag}>
                {VULNERABILITY_LABELS[flag]}
              </option>
            ))}
          </select>
        </div>

        {/* Table Body */}
        {householdsLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : households.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">No households registered</p>
              <p className="text-muted-foreground">
                Households will appear here once they are added to the registry.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">No matching households</p>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Name</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Purok</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-center">
                      Members
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Status</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Vulnerability</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Channel</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Updated</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((h) => {
                    const needsHelp = h.evacuation_status === "need_help";
                    const unaccountedVuln =
                      isUnaccounted(h.evacuation_status) && h.vulnerability_flags.length > 0;

                    const rowBg = needsHelp
                      ? "bg-red-500/5"
                      : unaccountedVuln
                        ? "bg-amber-500/5"
                        : "";

                    return (
                      <tr
                        key={h.id}
                        className={`border-b border-border transition-colors hover:bg-muted/50 ${rowBg}`}
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                          {h.household_head}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {h.purok}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-center">
                          {h.total_members}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span
                            className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[h.evacuation_status].className}`}
                          >
                            {STATUS_BADGE[h.evacuation_status].label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {h.vulnerability_flags.map((flag) => (
                              <span
                                key={flag}
                                className="inline-block rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                              >
                                {VULNERABILITY_LABELS[flag]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {getChannel(h)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatTimestamp(h.updated_at ?? h.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <StatusOverride
                            householdId={h.id}
                            currentStatus={h.evacuation_status}
                            onOverride={handleOverride}
                            isPending={updateStatus.isPending}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="px-2">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "danger" | "muted";
}) {
  const accent =
    variant === "success"
      ? "border-l-green-500"
      : variant === "danger"
        ? "border-l-red-500"
        : "border-l-muted-foreground";

  return (
    <div className={`rounded-lg border border-l-4 border-border bg-card p-4 ${accent}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

/* ─── Status Override Dropdown ─── */

function StatusOverride({
  householdId,
  currentStatus,
  onOverride,
  isPending,
}: {
  householdId: string;
  currentStatus: EvacuationStatus;
  onOverride: (id: string, status: EvacuationStatus) => void;
  isPending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="xs" disabled={isPending} />}>
        Set status
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={currentStatus === "safe"}
          onClick={() => onOverride(householdId, "safe")}
        >
          <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-green-500" />
          Safe
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={currentStatus === "need_help"}
          onClick={() => onOverride(householdId, "need_help")}
        >
          <span className="mr-2 h-2 w-2 shrink-0 rounded-full bg-red-500" />
          Need Help
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
