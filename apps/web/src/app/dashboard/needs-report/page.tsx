"use client";

import { useState } from "react";
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  X,
  Loader2,
  Send,
} from "lucide-react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

type NeedsReport = {
  id: string;
  barangay_id: string;
  center_id: string | null;
  submitted_by: string;
  total_evacuees: number;
  needs_food_packs: number;
  needs_water_liters: number;
  needs_medicine: boolean;
  needs_blankets: number;
  medical_cases: string | null;
  notes: string | null;
  status: "pending" | "acknowledged" | "resolved";
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  submitted_at: string;
  updated_at: string;
};

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

const STATUS_STYLES: Record<NeedsReport["status"], string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  acknowledged:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

function StatusBadge({ status }: { status: NeedsReport["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

const TEXTAREA_CLS =
  "border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 min-h-[60px] w-full rounded-none border px-2.5 py-1.5 text-xs outline-none transition-colors focus-visible:ring-1 resize-y";

export default function NeedsReportPage() {
  const [centerName, setCenterName] = useState("");
  const [totalEvacuees, setTotalEvacuees] = useState("");
  const [foodPacks, setFoodPacks] = useState("");
  const [waterLiters, setWaterLiters] = useState("");
  const [needsMedicine, setNeedsMedicine] = useState(false);
  const [blankets, setBlankets] = useState("");
  const [medicalCases, setMedicalCases] = useState("");
  const [notes, setNotes] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{
    totalEvacuees: number;
    needsFoodPacks: number;
    needsWaterLiters: number;
    needsBlankets: number;
    needsMedicine: boolean;
    centerName: string;
  } | null>(null);

  const [viewingReport, setViewingReport] = useState<NeedsReport | null>(null);

  const listQuery = useQuery(trpc.needsReports.list.queryOptions({}));
  const submitMutation = useMutation(trpc.needsReports.submit.mutationOptions());

  const reports = (listQuery.data ?? []) as NeedsReport[];
  const sortedReports = [...reports].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
  );

  const resetForm = () => {
    setCenterName("");
    setTotalEvacuees("");
    setFoodPacks("");
    setWaterLiters("");
    setNeedsMedicine(false);
    setBlankets("");
    setMedicalCases("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      totalEvacuees: parseInt(totalEvacuees) || 0,
      needsFoodPacks: parseInt(foodPacks) || 0,
      needsWaterLiters: parseInt(waterLiters) || 0,
      needsMedicine,
      needsBlankets: parseInt(blankets) || 0,
      medicalCases: medicalCases.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    submitMutation.mutate(data, {
      onSuccess: () => {
        setLastSubmitted({ ...data, centerName });
        setShowSuccess(true);
        resetForm();
        listQuery.refetch();
      },
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <FileText className="h-5 w-5" />
        Needs Report
      </h1>

      {/* ── Success confirmation ────────────────────────────── */}
      {showSuccess && lastSubmitted && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div className="flex-1 space-y-1">
              <p className="font-medium text-green-900 dark:text-green-200">
                Report submitted successfully
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                {lastSubmitted.centerName && `${lastSubmitted.centerName} · `}
                {lastSubmitted.totalEvacuees} evacuees ·{" "}
                {lastSubmitted.needsFoodPacks} food packs ·{" "}
                {lastSubmitted.needsWaterLiters}L water ·{" "}
                {lastSubmitted.needsBlankets} blankets
                {lastSubmitted.needsMedicine ? " · Medicine needed" : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowSuccess(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Submit form ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Needs Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="centerName">Evacuation Center Name</Label>
              <Input
                id="centerName"
                placeholder="e.g. Barangay Hall, School Gym"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totalEvacuees">
                Number of Evacuees{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="totalEvacuees"
                type="number"
                min={0}
                placeholder="0"
                value={totalEvacuees}
                onChange={(e) => setTotalEvacuees(e.target.value)}
                required
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-medium">Supply Needs</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="foodPacks">Food Packs</Label>
                  <Input
                    id="foodPacks"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={foodPacks}
                    onChange={(e) => setFoodPacks(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waterLiters">Drinking Water (liters)</Label>
                  <Input
                    id="waterLiters"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={waterLiters}
                    onChange={(e) => setWaterLiters(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="blankets">Blankets</Label>
                  <Input
                    id="blankets"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={blankets}
                    onChange={(e) => setBlankets(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 self-end pb-1.5">
                  <Checkbox
                    checked={needsMedicine}
                    onCheckedChange={(checked) =>
                      setNeedsMedicine(checked as boolean)
                    }
                  />
                  <span className="select-none text-xs">Medicine Needed</span>
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="medicalCases">Medical Cases</Label>
              <textarea
                id="medicalCases"
                className={TEXTAREA_CLS}
                placeholder="Describe any medical cases or health concerns..."
                value={medicalCases}
                onChange={(e) => setMedicalCases(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Special Notes</Label>
              <textarea
                id="notes"
                className={TEXTAREA_CLS}
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              type="submit"
              disabled={submitMutation.isPending || !totalEvacuees}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitMutation.isPending ? "Submitting…" : "Submit Report"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Report history ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Report History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No reports submitted yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatPHT(report.submitted_at)}
                      </span>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm">
                      {report.center_id ?? "N/A"} ·{" "}
                      {report.total_evacuees} evacuees
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setViewingReport(report)}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail modal ───────────────────────────────────── */}
      {viewingReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewingReport(null)}
        >
          <div
            className="mx-4 w-full max-w-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Report Details</h2>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setViewingReport(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <dl className="space-y-2.5 text-xs">
              <Row label="Submitted" value={formatPHT(viewingReport.submitted_at)} />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={viewingReport.status} />
                </dd>
              </div>
              {viewingReport.acknowledged_at && (
                <Row
                  label="Acknowledged"
                  value={formatPHT(viewingReport.acknowledged_at)}
                />
              )}

              <hr className="border-border" />

              <Row
                label="Total Evacuees"
                value={String(viewingReport.total_evacuees)}
                bold
              />
              <Row
                label="Food Packs"
                value={String(viewingReport.needs_food_packs)}
              />
              <Row
                label="Water (L)"
                value={String(viewingReport.needs_water_liters)}
              />
              <Row
                label="Medicine"
                value={viewingReport.needs_medicine ? "Yes" : "No"}
              />
              <Row
                label="Blankets"
                value={String(viewingReport.needs_blankets)}
              />

              {viewingReport.medical_cases && (
                <>
                  <hr className="border-border" />
                  <div>
                    <dt className="text-muted-foreground">Medical Cases</dt>
                    <dd className="mt-1 whitespace-pre-wrap">
                      {viewingReport.medical_cases}
                    </dd>
                  </div>
                </>
              )}
              {viewingReport.notes && (
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap">
                    {viewingReport.notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "font-medium" : ""}>{value}</dd>
    </div>
  );
}
