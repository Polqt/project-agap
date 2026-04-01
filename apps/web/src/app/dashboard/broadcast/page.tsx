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
  const [customNote, setCustomNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successState, setSuccessState] = useState<{ sentAt: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const broadcastList = useQuery(trpc.broadcasts.list.queryOptions({}));
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
      ? `${selectedTemplate.messageFil}\n\n${customNote}\n\nSumagot "LIGTAS" kung ligtas ka na.`
      : `${selectedTemplate.messageFil}\n\nSumagot "LIGTAS" kung ligtas ka na.`
    : "";

  const finalMessageFil = selectedTemplate
    ? customNote
      ? `${selectedTemplate.messageFil}\n\n${customNote}`
      : selectedTemplate.messageFil
    : "";

  // Calculate available characters for custom note
  const templateAndReplyLength = selectedTemplate
    ? selectedTemplate.messageFil.length + '\n\nSumagot "LIGTAS" kung ligtas ka na.'.length + 2 // +2 for \n\n
    : 0;
  const availableForCustomNote = Math.max(0, CHAR_LIMIT - templateAndReplyLength);

  const handleSend = useCallback(() => {
    if (!selectedType) return;
    createBroadcast.mutate({
      broadcastType: selectedType,
      message: finalMessage,
    });
  }, [selectedType, finalMessage, createBroadcast]);

  const resetForm = useCallback(() => {
    setSelectedType(null);
    setCustomNote("");
    setSuccessState(null);
  }, []);

  const history: Broadcast[] = (broadcastList.data ?? []).slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Bell className="h-5 w-5" />
        Broadcast Alert
      </h1>

      {/* Success State */}
      {successState && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Broadcast sent successfully
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPHT(successState.sentAt)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetForm}>
              Send Another
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Selector */}
      <div>
        <p className="mb-3 text-sm font-medium">Select alert type</p>
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
                className={`flex flex-col gap-2.5 rounded-none border p-4 text-left transition-all ${
                  isSelected ? tpl.selectedRing : tpl.accent
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{tpl.label}</span>
                </div>
                <p className="text-xs font-medium leading-relaxed">{tpl.messageFil}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tpl.messageEng}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Free-text Override */}
      {selectedType && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Custom note <span className="text-muted-foreground">(optional)</span>
              </label>
              <span
                className={`text-xs tabular-nums ${
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
              className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-none border bg-transparent px-2.5 py-2 text-xs outline-none transition-colors focus-visible:ring-1"
              placeholder={`Append a custom message to the broadcast… (${availableForCustomNote} chars available)`}
            />
            <p className="text-xs text-muted-foreground">
              {availableForCustomNote} characters available for custom note (modern SMS supports up to {CHAR_LIMIT} chars)
            </p>
          </div>
          
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Add data from external sources</p>
            <ExternalAlerts
              onAppendNote={(text) => {
                const newNote = customNote ? `${customNote}\n\n${text}` : text;
                setCustomNote(newNote);
              }}
            />
          </div>
        </div>
      )}

      {/* Send Button */}
      <Button
        size="lg"
        className="w-full"
        disabled={!selectedType || cooldown > 0 || createBroadcast.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <Send data-icon="inline-start" className="h-4 w-4" />
        {cooldown > 0
          ? `Wait ${cooldown}s before sending again`
          : createBroadcast.isPending
            ? "Sending…"
            : "Send to All Residents"}
      </Button>

      {/* Confirmation Modal */}
      {confirmOpen && selectedTemplate && (
        <ConfirmModal
          template={selectedTemplate}
          customNote={customNote}
          finalMessage={finalMessage}
          finalMessageFil={finalMessageFil}
          isPending={createBroadcast.isPending}
          onConfirm={handleSend}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Broadcast History */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Broadcast History
            {history.length > 0 && (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
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

        {historyOpen && (
          <div className="mt-3 space-y-2">
            {broadcastList.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No broadcasts sent yet.
              </p>
            ) : (
              history.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 rounded-sm border border-border p-3"
                >
                  <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${typeBadge(b.broadcast_type)}`}
                      >
                        {b.broadcast_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatPHT(b.sent_at)}
                      </span>
                    </div>
                    <p className="truncate text-xs">{b.message}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
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
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Confirmation Modal ─── */

function ConfirmModal({
  template,
  customNote,
  finalMessage,
  finalMessageFil,
  isPending,
  onConfirm,
  onCancel,
}: {
  template: (typeof TEMPLATES)[number];
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
        <div className="w-full max-w-md rounded-none border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Confirm Broadcast</h3>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={onCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Body */}
          <div className="space-y-3 p-4">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Filipino
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">
                {finalMessageFil}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                English
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">
                {finalMessage}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              This will be sent to all registered residents via push notification and SMS.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" disabled={isPending} onClick={onConfirm}>
              <Send data-icon="inline-start" className="h-3 w-3" />
              {isPending ? "Sending…" : "Confirm & Send"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
