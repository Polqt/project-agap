"use client";

import { useState, useMemo } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Inbox,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SmsLog = {
  id: string;
  barangay_id: string;
  household_id: string | null;
  broadcast_id: string | null;
  direction: "outbound" | "inbound";
  phone_number: string;
  message: string;
  delivery_status: "queued" | "sent" | "delivered" | "failed" | "replied";
  keyword_reply:
    | "LIGTAS"
    | "TULONG"
    | "NASAAN"
    | "SINO"
    | "unknown"
    | null;
  gateway_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  created_at: string;
};

type SmsFollowupItem = {
  household_id: string;
  household_head: string;
  purok: string;
  phone_number: string;
  vulnerability_flags: string[];
  sms_sent_at: string;
  minutes_since_sent: number;
};

type Broadcast = {
  id: string;
  broadcast_type: string;
  message: string;
  sent_at: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPHT(date: string | Date) {
  return new Date(date).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DELIVERY_STYLE: Record<SmsLog["delivery_status"], string> = {
  queued: "bg-muted text-muted-foreground",
  sent: "bg-muted text-muted-foreground",
  delivered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  replied: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const KEYWORD_STYLE: Record<string, string> = {
  LIGTAS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  TULONG: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NASAAN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SINO: "bg-muted text-muted-foreground",
  unknown:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const SELECT_CLS =
  "h-8 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30";

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SmsPage() {
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [followupOpen, setFollowupOpen] = useState(true);
  const [threadSelection, setThreadSelection] = useState<{
    householdId: string;
    phoneNumber: string;
  } | null>(null);

  /* ── Queries ───────────────────────────────────────────── */

  const broadcastsQuery = useQuery(trpc.broadcasts.list.queryOptions({}));
  const broadcasts = (broadcastsQuery.data ?? []) as Broadcast[];

  const smsQuery = useQuery({
    ...trpc.smsLogs.list.queryOptions({
      broadcastId: selectedBroadcastId || undefined,
      deliveryStatus: (statusFilter as SmsLog["delivery_status"]) || undefined,
      direction: (directionFilter as "outbound" | "inbound") || undefined,
    }),
  });
  const smsLogs = (smsQuery.data ?? []) as SmsLog[];

  const followupQuery = useQuery({
    ...trpc.dashboard.smsFollowup.queryOptions({
      broadcastId: selectedBroadcastId,
    }),
    enabled: !!selectedBroadcastId,
  });
  const followups = (followupQuery.data ?? []) as SmsFollowupItem[];
  const sortedFollowups = useMemo(
    () =>
      [...followups].sort(
        (a, b) =>
          (b.vulnerability_flags?.length ?? 0) -
          (a.vulnerability_flags?.length ?? 0),
      ),
    [followups],
  );

  const threadQuery = useQuery({
    ...trpc.smsLogs.getByHousehold.queryOptions({
      householdId: threadSelection?.householdId ?? "",
    }),
    enabled: !!threadSelection?.householdId,
  });
  const threadLogs = useMemo(() => {
    const logs = (threadQuery.data ?? []) as SmsLog[];
    return [...logs].sort(
      (a, b) =>
        new Date(a.sent_at ?? a.created_at).getTime() -
        new Date(b.sent_at ?? b.created_at).getTime(),
    );
  }, [threadQuery.data]);

  /* ── Client-side phone search ──────────────────────────── */

  const filteredLogs = useMemo(() => {
    if (!phoneSearch) return smsLogs;
    const q = phoneSearch.toLowerCase();
    return smsLogs.filter((l) => l.phone_number.toLowerCase().includes(q));
  }, [smsLogs, phoneSearch]);

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <MessageSquare className="h-5 w-5" />
        SMS Monitor
      </h1>

      {/* ── Broadcast selector ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">
          Broadcast
        </label>
        <select
          className={SELECT_CLS + " min-w-[240px]"}
          value={selectedBroadcastId}
          onChange={(e) => {
            setSelectedBroadcastId(e.target.value);
            setThreadSelection(null);
          }}
        >
          <option value="">All broadcasts</option>
          {broadcasts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.broadcast_type.toUpperCase()} — {formatPHT(b.sent_at)}
            </option>
          ))}
        </select>
        {broadcastsQuery.isLoading && (
          <Skeleton className="h-8 w-60" />
        )}
      </div>

      <>
        {/* ── Follow-up section ──────────────────────────── */}
        {selectedBroadcastId && (
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setFollowupOpen((v) => !v)}
            >
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Follow-up Required
                {followups.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {followups.length}
                  </Badge>
                )}
                <span className="ml-auto">
                  {followupOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
              </CardTitle>
            </CardHeader>

            {followupOpen && (
              <CardContent>
                {followupQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : sortedFollowups.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    All recipients have responded
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {sortedFollowups.map((item) => (
                      <div
                        key={item.household_id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2"
                      >
                        <span className="text-sm font-medium">
                          {item.household_head}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Purok {item.purok}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.phone_number}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.minutes_since_sent}m ago
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(item.vulnerability_flags ?? []).map((flag, i) => (
                            <Badge
                              key={i}
                              className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            >
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

          {/* ── Filters ────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              className={SELECT_CLS}
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
            >
              <option value="">All directions</option>
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>

            <select
              className={SELECT_CLS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="replied">Replied</option>
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-7"
                placeholder="Search phone…"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
            </div>
          </div>

          {/* ── Table + Thread panel ───────────────────────── */}
          <div className="flex gap-4">
            {/* Table */}
            <Card className="min-w-0 flex-1">
              <CardContent className="overflow-x-auto p-0">
                {smsQuery.isLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <EmptyState
                    icon={
                      <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                    }
                    message="No SMS logs found"
                  />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Phone
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Message
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Dir
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Sent At
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Status
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Keyword
                        </th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">
                          Replied At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => {
                        const isActive =
                          threadSelection?.householdId === log.household_id &&
                          threadSelection?.phoneNumber === log.phone_number;
                        return (
                          <tr
                            key={log.id}
                            className={`border-b border-border transition-colors ${
                              log.household_id
                                ? "cursor-pointer hover:bg-muted/50"
                                : ""
                            } ${isActive ? "bg-muted/70" : ""}`}
                            onClick={() => {
                              if (log.household_id) {
                                setThreadSelection({
                                  householdId: log.household_id,
                                  phoneNumber: log.phone_number,
                                });
                              }
                            }}
                          >
                            <td className="whitespace-nowrap px-3 py-2 font-mono">
                              {log.phone_number}
                            </td>
                            <td
                              className="max-w-[200px] truncate px-3 py-2"
                              title={log.message}
                            >
                              {log.message}
                            </td>
                            <td className="px-3 py-2">
                              {log.direction === "outbound" ? (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  <ArrowUpRight className="mr-0.5 h-3 w-3" />
                                  OUT
                                </Badge>
                              ) : (
                                <Badge className="bg-muted text-muted-foreground">
                                  <ArrowDownLeft className="mr-0.5 h-3 w-3" />
                                  IN
                                </Badge>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {log.sent_at ? formatPHT(log.sent_at) : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                className={
                                  DELIVERY_STYLE[log.delivery_status] ?? ""
                                }
                              >
                                {log.delivery_status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              {log.keyword_reply ? (
                                <Badge
                                  className={
                                    KEYWORD_STYLE[log.keyword_reply] ??
                                    KEYWORD_STYLE.unknown!
                                  }
                                >
                                  {log.keyword_reply}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {log.replied_at
                                ? formatPHT(log.replied_at)
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* ── Thread panel ─────────────────────────────── */}
            {threadSelection && (
              <Card className="w-96 shrink-0">
                <CardHeader className="border-b border-border">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="font-mono">
                      {threadSelection.phoneNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setThreadSelection(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                  {threadQuery.isLoading ? (
                    <div className="space-y-2 py-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className={`h-14 ${i % 2 === 0 ? "ml-auto w-3/4" : "w-3/4"}`}
                        />
                      ))}
                    </div>
                  ) : threadLogs.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      No messages
                    </p>
                  ) : (
                    <div className="space-y-2 py-2">
                      {threadLogs.map((msg) => (
                        <div
                          key={msg.id}
                          className={`max-w-[85%] rounded px-3 py-2 text-xs ${
                            msg.direction === "outbound"
                              ? "ml-auto bg-primary/10"
                              : "mr-auto bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {formatPHT(msg.sent_at ?? msg.created_at)}
                            {msg.keyword_reply && (
                              <>
                                {" · "}
                                <span
                                  className={`font-medium ${
                                    msg.keyword_reply === "TULONG"
                                      ? "text-red-600"
                                      : msg.keyword_reply === "LIGTAS"
                                        ? "text-green-600"
                                        : ""
                                  }`}
                                >
                                  {msg.keyword_reply}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared empty state                                                 */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {icon}
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
