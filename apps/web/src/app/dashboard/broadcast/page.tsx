"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Megaphone,
  Send,
  ShieldAlert,
  Smartphone,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { ExternalAlerts } from "./external-alerts";

type BroadcastType = "evacuate_now" | "stay_alert" | "all_clear" | "custom";

type Broadcast = {
  id: string;
  barangay_id: string;
  sent_by: string;
  broadcast_type: BroadcastType;
  message: string;
  message_filipino: string | null;
  target_purok: string | null;
  push_sent_count: number;
  sms_sent_count: number;
  sent_at: string;
};

const TEMPLATES: {
  type: Exclude<BroadcastType, "custom">;
  label: string;
  icon: typeof AlertTriangle;
  accent: string;
  selectedRing: string;
  messageFil: string;
  messageEng: string;
}[] = [
  {
    type: "evacuate_now",
    label: "Evacuate Now",
    icon: AlertTriangle,
    accent: "border-red-500 bg-red-500/5 hover:bg-red-500/10",
    selectedRing: "ring-2 ring-red-500 border-red-500 bg-red-500/10",
    messageFil: "LUMIKAS NA! Pumunta agad sa pinakamalapit na evacuation center.",
    messageEng: "EVACUATE NOW! Proceed to your nearest evacuation center immediately.",
  },
  {
    type: "stay_alert",
    label: "Stay Alert",
    icon: ShieldAlert,
    accent: "border-amber-500 bg-amber-500/5 hover:bg-amber-500/10",
    selectedRing: "ring-2 ring-amber-500 border-amber-500 bg-amber-500/10",
    messageFil: "MAGING ALERTO! Maghanda at subaybayan ang sitwasyon.",
    messageEng: "STAY ALERT! Prepare and monitor the situation closely.",
  },
  {
    type: "all_clear",
    label: "All Clear",
    icon: CheckCircle2,
    accent: "border-green-500 bg-green-500/5 hover:bg-green-500/10",
    selectedRing: "ring-2 ring-green-500 border-green-500 bg-green-500/10",
    messageFil: "LIGTAS NA. Pwede nang bumalik. Mag-ingat pa rin.",
    messageEng: "ALL CLEAR. It is now safe to return. Stay cautious.",
  },
];

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

function typeBadge(type: BroadcastType) {
  switch (type) {
    case "evacuate_now":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "stay_alert":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "all_clear":
      return "bg-green-500/15 text-green-700 dark:text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const CHAR_LIMIT = 1600;

export default function BroadcastPage() {
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<Exclude<BroadcastType, "custom"> | null>(null);
  const [audienceMode, setAudienceMode] = useState<"all" | "person">("all");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>("");
  const [customNote, setCustomNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successState, setSuccessState] = useState<{ sentAt: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const broadcastList = useQuery(trpc.broadcasts.list.queryOptions({}));
  const audienceHouseholdsQuery = useQuery(
    trpc.households.list.queryOptions({ page: 1, pageSize: 100 }),
  );
  const createBroadcast = useMutation({
    ...trpc.broadcasts.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["broadcasts"]] });
      setConfirmOpen(false);
      setSuccessState({ sentAt: new Date().toISOString() });
      setCooldown(60);
    },
  });

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown]);

  const selectedTemplate = TEMPLATES.find((t) => t.type === selectedType);

  const finalMessage = selectedTemplate
    ? customNote
      ? `${selectedTemplate.messageEng}\n\n${customNote}\n\nReply "SAFE" when you are already safe.`
      : `${selectedTemplate.messageEng}\n\nReply "SAFE" when you are already safe.`
    : "";

  const finalMessageFil = selectedTemplate
    ? customNote
      ? `${selectedTemplate.messageFil}\n\n${customNote}\n\nSumagot ng "LIGTAS" kung ligtas ka na.`
      : `${selectedTemplate.messageFil}\n\nSumagot ng "LIGTAS" kung ligtas ka na.`
    : "";

  // Calculate available characters for custom note
  const templateAndReplyLength = selectedTemplate
    ? selectedTemplate.messageFil.length + '\n\nSumagot "LIGTAS" kung ligtas ka na.'.length + 2 // +2 for \n\n
    : 0;
  const availableForCustomNote = Math.max(0, CHAR_LIMIT - templateAndReplyLength);

  const handleSend = useCallback(() => {
    if (!selectedType) return;

    if (audienceMode === "person" && !selectedHouseholdId) {
      return;
    }

    createBroadcast.mutate({
      broadcastType: selectedType,
      message: finalMessage,
      messageFilipino: finalMessageFil || null,
    });
  }, [selectedType, finalMessage, finalMessageFil, createBroadcast]);

  const resetForm = useCallback(() => {
    setSelectedType(null);
    setAudienceMode("all");
    setSelectedHouseholdId("");
    setCustomNote("");
    setSuccessState(null);
  }, []);

  const audienceHouseholds = ((audienceHouseholdsQuery.data?.items ?? []) as Array<{
    id: string;
    household_head: string;
    purok: string;
    phone_number: string | null;
  }>).filter((h) => !!h.phone_number);

  const selectedAudienceHousehold =
    audienceMode === "person"
      ? audienceHouseholds.find((h) => h.id === selectedHouseholdId) ?? null
      : null;

  const history: Broadcast[] = (broadcastList.data ?? []).slice(0, 10);
  const selectedTone = selectedTemplate
    ? selectedTemplate.type === "evacuate_now"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      : selectedTemplate.type === "stay_alert"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-7">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Command Center
          </span>
          <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            SMS + Push
          </span>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Bell className="h-6 w-6" />
          Broadcast Alert
        </h1>
        <p className="text-base text-muted-foreground">
          Send verified emergency instructions quickly across SMS and push.
        </p>
      </div>

      {/* Success State */}
      {successState && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-base font-semibold text-green-700 dark:text-green-400">
                Broadcast sent successfully
              </p>
              <p className="text-sm text-muted-foreground">
                {formatPHT(successState.sentAt)}
              </p>
            </div>
            <Button variant="outline" size="default" className="h-9 rounded-md px-3 text-sm" onClick={resetForm}>
              Send Another
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Selector */}
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" />
            Select alert type
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              const isSelected = selectedType === tpl.type;
              return (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(tpl.type);
                    setSuccessState(null);
                  }}
                  className={`flex flex-col gap-2.5 rounded-xl border p-4 text-left transition-all ${
                    isSelected ? tpl.selectedRing : tpl.accent
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-base font-semibold">{tpl.label}</span>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Template
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{tpl.messageFil}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {tpl.messageEng}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedTemplate && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${selectedTone}`}>
                Active
              </span>
              <span className="font-medium">{selectedTemplate.label}</span>
              <span className="text-muted-foreground">template will be used for broadcast.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="text-base">Audience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={audienceMode === "all" ? "default" : "outline"}
              size="default"
              className="h-9 rounded-md px-3 text-sm"
              onClick={() => {
                setAudienceMode("all");
                setSelectedHouseholdId("");
              }}
            >
              All residents
            </Button>
            <Button
              type="button"
              variant={audienceMode === "person" ? "default" : "outline"}
              size="default"
              className="h-9 rounded-md px-3 text-sm"
              onClick={() => setAudienceMode("person")}
            >
              Specific person only
            </Button>
          </div>

          {audienceMode === "person" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Choose one recipient household with a registered phone number.
              </p>
              <select
                value={selectedHouseholdId}
                onChange={(e) => setSelectedHouseholdId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Select person</option>
                {audienceHouseholds.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.household_head} • {household.purok} • {household.phone_number}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedType && (
        <div className="space-y-4">
          <Card className="border-border/70">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="text-base">
                Custom note <span className="font-normal text-muted-foreground">(optional)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Personalize the outgoing advisory.</span>
                <span
                  className={`text-sm tabular-nums ${
                    finalMessage.length > CHAR_LIMIT
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {finalMessage.length}/{CHAR_LIMIT}
                </span>
              </div>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={3}
                className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1"
              />
              <p className="text-sm text-muted-foreground">
                {availableForCustomNote} characters available for custom note (modern SMS supports up to {CHAR_LIMIT} chars)
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="text-base">Add data from external sources</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ExternalAlerts
                onAppendNote={(text) => {
                  const newNote = customNote ? `${customNote}\n\n${text}` : text;
                  setCustomNote(newNote);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Send Button */}
      <Card className="border-border/70 bg-muted/20">
        <CardContent className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">
            {audienceMode === "person"
              ? "Confirm details before dispatching to the selected recipient."
              : "Confirm details before dispatching to all registered residents."}
          </p>
          <Button
            size="lg"
            className="h-11 w-full rounded-md text-base"
            disabled={
              !selectedType ||
              cooldown > 0 ||
              createBroadcast.isPending ||
              (audienceMode === "person" && !selectedHouseholdId)
            }
            onClick={() => setConfirmOpen(true)}
          >
            <Send data-icon="inline-start" className="h-4 w-4" />
            {cooldown > 0
              ? `Wait ${cooldown}s before sending again`
              : createBroadcast.isPending
                ? "Sending..."
                : audienceMode === "person"
                  ? "Send to Selected Person"
                  : "Send to All Residents"}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {confirmOpen && selectedTemplate && (
        <ConfirmModal
          template={selectedTemplate}
          audienceLabel={
            audienceMode === "person"
              ? selectedAudienceHousehold
                ? `${selectedAudienceHousehold.household_head} (${selectedAudienceHousehold.phone_number})`
                : "Selected person"
              : "All registered residents"
          }
          customNote={customNote}
          finalMessage={finalMessage}
          finalMessageFil={finalMessageFil}
          isPending={createBroadcast.isPending}
          onConfirm={handleSend}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Broadcast History */}
      <Card className="border-border/70">
        <CardHeader className="border-b border-border/70 pb-3">
        <button
          type="button"
            className="flex w-full items-center justify-between text-left text-base font-semibold"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Broadcast History
            {history.length > 0 && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {history.length}
              </span>
            )}
          </span>
          {historyOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        </CardHeader>

        {historyOpen && (
          <CardContent className="mt-3 space-y-2 pt-0">
            {broadcastList.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No broadcasts sent yet.
              </p>
            ) : (
              history.map((b) => (
                <div
                  key={b.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-3"
                >
                  <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${typeBadge(b.broadcast_type)}`}
                      >
                        {b.broadcast_type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatPHT(b.sent_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm">{b.message}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Smartphone className="h-2.5 w-2.5" />
                        {b.sms_sent_count} SMS
                      </span>
                      <span className="flex items-center gap-1">
                        <Bell className="h-2.5 w-2.5" />
                        {b.push_sent_count} push
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/* ─── Confirmation Modal ─── */

function ConfirmModal({
  template,
  audienceLabel,
  customNote,
  finalMessage,
  finalMessageFil,
  isPending,
  onConfirm,
  onCancel,
}: {
  template: (typeof TEMPLATES)[number];
  audienceLabel: string;
  customNote: string;
  finalMessage: string;
  finalMessageFil: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const Icon = template.icon;

  return (
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === backdropRef.current) onCancel();
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-md border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <h3 className="text-base font-semibold">Confirm Broadcast</h3>
            </div>
            <Button variant="ghost" size="icon-sm" className="rounded-md" onClick={onCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Body */}
          <div className="space-y-3 p-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Audience
              </p>
              <p className="text-sm leading-relaxed">{audienceLabel}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Filipino
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {finalMessageFil}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                English
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {finalMessage}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              This will be sent to registered residents via push notification and SMS.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="outline" size="default" className="h-9 rounded-md px-3 text-sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button size="default" className="h-9 rounded-md px-3 text-sm" disabled={isPending} onClick={onConfirm}>
              <Send data-icon="inline-start" className="h-3.5 w-3.5" />
              {isPending ? "Sending…" : "Confirm & Send"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
