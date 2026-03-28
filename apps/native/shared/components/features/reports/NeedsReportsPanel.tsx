import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import { formatDateTime } from "@/shared/utils/date";
import { getErrorMessage } from "@/shared/utils/errors";
import { needsReportSchema, type NeedsReportFormValues } from "@/types/forms";

export function NeedsReportsPanel() {
  const { profile } = useAuth();
  const form = useForm<NeedsReportFormValues>({
    resolver: zodResolver(needsReportSchema),
      defaultValues: {
        centerId: "",
        totalEvacuees: "0",
        needsFoodPacks: "0",
        needsWaterLiters: "0",
        needsBlankets: "0",
        needsMedicine: false,
        medicalCases: "",
        notes: "",
    },
  });

  const centersQuery = useQuery(
    trpc.evacuationCenters.listByBarangay.queryOptions(
      { barangayId: profile?.barangay_id ?? "" },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const reportsQuery = useQuery(
    trpc.needsReports.list.queryOptions(undefined, {
      enabled: Boolean(profile?.barangay_id),
    }),
  );

  const submitMutation = useMutation(
    trpc.needsReports.submit.mutationOptions({
      onSuccess: () => {
        reportsQuery.refetch();
      },
    }),
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await submitMutation.mutateAsync({
        center_id: values.centerId || undefined,
        total_evacuees: Number(values.totalEvacuees),
        needs_food_packs: Number(values.needsFoodPacks),
        needs_water_liters: Number(values.needsWaterLiters),
        needs_blankets: Number(values.needsBlankets),
        needs_medicine: values.needsMedicine,
        medical_cases: values.medicalCases || undefined,
        notes: values.notes || undefined,
      });
    } catch (error) {
      form.setError("root", {
        message: getErrorMessage(error, "Unable to submit the needs report."),
      });
    }
  });

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.4 Needs reports"
        title="Submit shelter needs"
        description="Capture evacuee counts and urgent supply needs from the field so the barangay can escalate quickly."
      />

      <SectionCard title="Report form" subtitle="Use the center id when the report is tied to a specific evacuation site.">
        <View className="gap-4">
          <Controller
            control={form.control}
            name="centerId"
            render={({ field, fieldState }) => (
              <TextField
                label="Center id"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder={centersQuery.data?.[0]?.id ?? "Optional center uuid"}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="totalEvacuees"
            render={({ field, fieldState }) => (
              <TextField
                label="Total evacuees"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="0"
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="needsFoodPacks"
            render={({ field, fieldState }) => (
              <TextField
                label="Food packs needed"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="0"
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="needsWaterLiters"
            render={({ field, fieldState }) => (
              <TextField
                label="Water liters needed"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="0"
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="needsBlankets"
            render={({ field, fieldState }) => (
              <TextField
                label="Blankets needed"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="0"
                keyboardType="number-pad"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="medicalCases"
            render={({ field, fieldState }) => (
              <TextField
                label="Medical cases"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder="Optional medical notes"
                multiline
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="notes"
            render={({ field, fieldState }) => (
              <TextField
                label="Additional notes"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder="Operational context or escalation notes"
                multiline
                error={fieldState.error?.message}
              />
            )}
          />

          {form.formState.errors.root?.message ? (
            <Text className="text-sm text-rose-600">{form.formState.errors.root.message}</Text>
          ) : null}

          <AppButton label="Submit needs report" onPress={handleSubmit} loading={submitMutation.isPending} />
        </View>
      </SectionCard>

      <SectionCard title="Recent reports" subtitle="Latest shelter supply reports for this barangay.">
        {reportsQuery.data?.length ? (
          reportsQuery.data.map((report) => (
            <View key={report.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">
                    {report.total_evacuees} evacuees
                  </Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    Food: {report.needs_food_packs} packs • Water: {report.needs_water_liters} L • Blankets: {report.needs_blankets}
                  </Text>
                </View>
                <Pill label={report.status.toUpperCase()} tone="warning" />
              </View>
              <Text className="mt-3 text-xs uppercase tracking-[1.2px] text-slate-400">
                Submitted {formatDateTime(report.submitted_at)}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            title="No needs reports yet"
            description="Submit a report when shelters need food packs, water, blankets, medicine, or escalation."
          />
        )}
      </SectionCard>
    </View>
  );
}
