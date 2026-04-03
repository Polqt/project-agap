"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Phone,
  Plus,
  Search,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

type VulnerabilityFlag =
  | "elderly"
  | "pwd"
  | "infant"
  | "pregnant"
  | "solo_parent"
  | "chronic_illness";

const ALL_FLAGS: { value: VulnerabilityFlag; label: string }[] = [
  { value: "elderly", label: "Elderly" },
  { value: "pwd", label: "PWD" },
  { value: "infant", label: "Infant" },
  { value: "pregnant", label: "Pregnant" },
  { value: "solo_parent", label: "Solo Parent" },
  { value: "chronic_illness", label: "Chronic Illness" },
];

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
  evacuation_status:
    | "home"
    | "evacuating"
    | "checked_in"
    | "safe"
    | "need_help"
    | "unknown"
    | "not_home"
    | "welfare_check_dispatched"
    | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

const PAGE_SIZE = 15;

function formatPHT(date: string) {
  return new Date(date).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PH_PHONE_RE = /^(\+?63|0)9\d{9}$/;

function flagColor(flag: VulnerabilityFlag) {
  const map: Record<VulnerabilityFlag, string> = {
    elderly: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    pwd: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    infant: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
    pregnant: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    solo_parent: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
    chronic_illness: "bg-red-500/15 text-red-700 dark:text-red-400",
  };
  return map[flag];
}

function statusBadge(status: string | null) {
  switch (status) {
    case "unknown":
      return "bg-muted text-muted-foreground";
    case "safe":
      return "bg-green-500/15 text-green-700 dark:text-green-400";
    case "home":
    case "evacuating":
    case "checked_in":
    case "not_home":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "need_help":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "welfare_check_dispatched":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function RegistryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Debounce search query for server search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isSearching = debouncedQuery.length > 2;

  const listQuery = useQuery({
    ...trpc.households.list.queryOptions({ page, pageSize: PAGE_SIZE }),
    enabled: !isSearching,
  });

  const searchQueryResult = useQuery({
    ...trpc.households.search.queryOptions({ query: debouncedQuery }),
    enabled: isSearching,
  });

  const households: Household[] = isSearching
    ? (searchQueryResult.data ?? [])
    : (listQuery.data?.items ?? []);
  const totalCount = isSearching
    ? (searchQueryResult.data?.length ?? 0)
    : (listQuery.data?.totalCount ?? 0);
  const totalPages = isSearching ? 1 : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isLoading = isSearching ? searchQueryResult.isLoading : listQuery.isLoading;

  // Client-side filter for instant results (1-2 chars)
  const filtered = useMemo(() => {
    if (searchQuery.length > 0 && searchQuery.length <= 2) {
      const q = searchQuery.toLowerCase();
      return households.filter(
        (h) =>
          h.household_head.toLowerCase().includes(q) ||
          h.purok.toLowerCase().includes(q) ||
          h.phone_number?.toLowerCase().includes(q),
      );
    }
    return households;
  }, [households, searchQuery]);

  const openAdd = useCallback(() => {
    setEditingHousehold(null);
    setPanelOpen(true);
    setDeleteConfirm(false);
  }, []);

  const openEdit = useCallback((h: Household) => {
    setEditingHousehold(h);
    setPanelOpen(true);
    setDeleteConfirm(false);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setEditingHousehold(null);
    setDeleteConfirm(false);
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [["households"]] });
  }, [queryClient]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <ClipboardList className="h-5 w-5" />
          Household Registry
        </h1>
        <Button onClick={openAdd} size="sm">
          <Plus data-icon="inline-start" className="h-3.5 w-3.5" />
          Add Household
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, purok, phone…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No households found</p>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term."
                    : "Get started by adding your first household."}
                </p>
              </div>
              {!searchQuery && (
                <Button onClick={openAdd} variant="outline" size="sm">
                  <Plus data-icon="inline-start" className="h-3.5 w-3.5" />
                  Add Household
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Head Name</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Purok</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium text-center">Members</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Vulnerability</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Phone</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Channel</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => (
                    <tr
                      key={h.id}
                      onClick={() => openEdit(h)}
                      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                        {h.household_head}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">{h.purok}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-center">
                        {h.total_members}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {h.vulnerability_flags.map((f) => (
                            <span
                              key={f}
                              className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${flagColor(f)}`}
                            >
                              {f.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {h.phone_number ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {h.is_sms_only ? (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                            <Smartphone className="h-2.5 w-2.5" />
                            SMS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" />
                            App
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span
                          className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(h.evacuation_status)}`}
                        >
                          {h.evacuation_status?.replace("_", " ") ?? "none"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isSearching && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of{" "}
            {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Slide-over Panel */}
      {panelOpen && (
        <SlideOverPanel
          household={editingHousehold}
          onClose={closePanel}
          onSuccess={() => {
            invalidate();
            closePanel();
          }}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
        />
      )}
    </div>
  );
}

/* ─── Slide-over Add/Edit Panel ─── */

type FormState = {
  householdHead: string;
  purok: string;
  address: string;
  phoneNumber: string;
  totalMembers: number;
  vulnerabilityFlags: VulnerabilityFlag[];
  isSmsOnly: boolean;
  notes: string;
};

function emptyForm(): FormState {
  return {
    householdHead: "",
    purok: "",
    address: "",
    phoneNumber: "",
    totalMembers: 1,
    vulnerabilityFlags: [],
    isSmsOnly: false,
    notes: "",
  };
}

function householdToForm(h: Household): FormState {
  return {
    householdHead: h.household_head,
    purok: h.purok,
    address: h.address ?? "",
    phoneNumber: h.phone_number ?? "",
    totalMembers: h.total_members,
    vulnerabilityFlags: h.vulnerability_flags,
    isSmsOnly: h.is_sms_only,
    notes: h.notes ?? "",
  };
}

function SlideOverPanel({
  household,
  onClose,
  onSuccess,
  deleteConfirm,
  setDeleteConfirm,
}: {
  household: Household | null;
  onClose: () => void;
  onSuccess: () => void;
  deleteConfirm: boolean;
  setDeleteConfirm: (v: boolean) => void;
}) {
  const isEdit = household !== null;
  const [form, setForm] = useState<FormState>(
    isEdit ? householdToForm(household) : emptyForm(),
  );
  const [phoneError, setPhoneError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const upsert = useMutation({
    ...trpc.households.upsert.mutationOptions(),
    onSuccess,
  });

  const deleteMutation = useMutation({
    ...trpc.households.delete.mutationOptions(),
    onSuccess,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFlag = (flag: VulnerabilityFlag) => {
    setForm((prev) => ({
      ...prev,
      vulnerabilityFlags: prev.vulnerabilityFlags.includes(flag)
        ? prev.vulnerabilityFlags.filter((f) => f !== flag)
        : [...prev.vulnerabilityFlags, flag],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.phoneNumber && !PH_PHONE_RE.test(form.phoneNumber.replace(/[\s-]/g, ""))) {
      setPhoneError("Enter a valid PH mobile number (e.g. 09171234567)");
      return;
    }
    setPhoneError("");
    upsert.mutate({
      ...(isEdit ? { id: household.id } : {}),
      householdHead: form.householdHead,
      purok: form.purok,
      address: form.address || undefined,
      phoneNumber: form.phoneNumber || undefined,
      totalMembers: form.totalMembers,
      vulnerabilityFlags: form.vulnerabilityFlags,
      isSmsOnly: form.isSmsOnly,
      notes: form.notes || undefined,
    });
  };

  const handleDelete = () => {
    if (!household) return;
    deleteMutation.mutate({ householdId: household.id });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Household" : "Add Household"}
          </h2>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 p-4">
            {/* Household Head */}
            <fieldset className="space-y-1.5">
              <Label htmlFor="hh-head">
                Household Head <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hh-head"
                required
                value={form.householdHead}
                onChange={(e) => set("householdHead", e.target.value)}
                placeholder="Juan dela Cruz"
              />
            </fieldset>

            {/* Purok */}
            <fieldset className="space-y-1.5">
              <Label htmlFor="hh-purok">
                Purok <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hh-purok"
                required
                value={form.purok}
                onChange={(e) => set("purok", e.target.value)}
                placeholder="Purok 1"
              />
            </fieldset>

            {/* Address */}
            <fieldset className="space-y-1.5">
              <Label htmlFor="hh-address">Address</Label>
              <Input
                id="hh-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="123 Main St"
              />
            </fieldset>

            {/* Phone Number */}
            <fieldset className="space-y-1.5">
              <Label htmlFor="hh-phone">Phone Number</Label>
              <Input
                id="hh-phone"
                value={form.phoneNumber}
                onChange={(e) => {
                  set("phoneNumber", e.target.value);
                  setPhoneError("");
                }}
                placeholder="09171234567"
              />
              {phoneError && (
                <p className="text-[10px] text-destructive">{phoneError}</p>
              )}
            </fieldset>

            {/* Total Members */}
            <fieldset className="space-y-1.5">
              <Label htmlFor="hh-members">Total Members</Label>
              <Input
                id="hh-members"
                type="number"
                min={1}
                required
                value={form.totalMembers}
                onChange={(e) => set("totalMembers", Math.max(1, Number(e.target.value)))}
              />
            </fieldset>

            {/* Vulnerability Flags */}
            <fieldset className="space-y-2">
              <Label>Vulnerability Flags</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_FLAGS.map((f) => (
                  <label
                    key={f.value}
                    className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-2.5 py-2 text-xs transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={form.vulnerabilityFlags.includes(f.value)}
                      onCheckedChange={() => toggleFlag(f.value)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* SMS-Only */}
            <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-2.5 py-2 text-xs transition-colors hover:bg-muted/50">
              <Checkbox
                checked={form.isSmsOnly}
                onCheckedChange={(checked) => set("isSmsOnly", !!checked)}
              />
              SMS-Only household (no app access)
            </label>

            {/* Notes */}
            <fieldset className="space-y-1.5">
              <Label htmlFor="hh-notes">Notes</Label>
              <textarea
                id="hh-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-none border bg-transparent px-2.5 py-2 text-xs outline-none transition-colors focus-visible:ring-1"
                placeholder="Additional notes…"
              />
            </fieldset>

            {isEdit && (
              <p className="text-[10px] text-muted-foreground">
                Registered {formatPHT(household.created_at)}
                {household.updated_at && <> · Updated {formatPHT(household.updated_at)}</>}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t border-border p-4">
            {isEdit && !deleteConfirm && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 data-icon="inline-start" className="h-3 w-3" />
                Delete
              </Button>
            )}
            {isEdit && deleteConfirm && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={handleDelete}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={upsert.isPending}>
              {upsert.isPending
                ? "Saving…"
                : isEdit
                  ? "Save Changes"
                  : "Add Household"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
