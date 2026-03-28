import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { AppButton, EmptyState, Pill, ScreenHeader, SectionCard, TextField } from "@/shared/components/ui";
import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import { broadcastSchema, type BroadcastFormValues } from "@/types/forms";
import { formatDateTime } from "@/shared/utils/date";
import { getErrorMessage } from "@/shared/utils/errors";

const templates = [
  {
    broadcastType: "evacuate_now" as const,
    message: "Immediate evacuation is advised. Proceed to the nearest open evacuation center now.",
    messageFilipino: "Kailangang lumikas agad. Pumunta na sa pinakamalapit na bukas na evacuation center.",
  },
  {
    broadcastType: "stay_alert" as const,
    message: "Stay alert and keep your phones charged. Follow official updates from the barangay.",
    messageFilipino: "Manatiling alerto at siguraduhing may charge ang inyong telepono. Hintayin ang opisyal na abiso ng barangay.",
  },
  {
    broadcastType: "all_clear" as const,
    message: "All clear for now. Continue monitoring Agap for any change in instructions.",
    messageFilipino: "Ligtas na sa ngayon. Patuloy pa ring bantayan ang Agap para sa susunod na abiso.",
  },
];

export function BroadcastPanel() {
  const { profile } = useAuth();
  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      broadcastType: "custom",
      message: "",
      messageFilipino: "",
      targetPurok: "",
    },
  });

  const broadcastsQuery = useQuery(
    trpc.broadcasts.list.queryOptions(
      { barangayId: profile?.barangay_id ?? undefined },
      { enabled: Boolean(profile?.barangay_id) },
    ),
  );

  const createBroadcastMutation = useMutation(
    trpc.broadcasts.create.mutationOptions({
      onSuccess: () => {
        broadcastsQuery.refetch();
        form.reset({
          broadcastType: "custom",
          message: "",
          messageFilipino: "",
          targetPurok: "",
        });
      },
    }),
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await createBroadcastMutation.mutateAsync({
        broadcastType: values.broadcastType,
        message: values.message,
        messageFilipino: values.messageFilipino || null,
        targetPurok: values.targetPurok || null,
      });
    } catch (error) {
      form.setError("root", {
        message: getErrorMessage(error, "Unable to send the broadcast."),
      });
    }
  });

  return (
    <View className="flex-1 bg-slate-50 pb-8">
      <ScreenHeader
        eyebrow="5.3.3 Broadcast"
        title="Broadcast to your barangay"
        description="Use templates or craft a custom bilingual message, then scope it to the whole barangay or a specific purok."
      />

      <SectionCard title="Templates" subtitle="These give officials a fast starting point during active response.">
        <View className="gap-3">
          {templates.map((template) => (
            <Pressable
              key={template.broadcastType}
              onPress={() => {
                form.setValue("broadcastType", template.broadcastType);
                form.setValue("message", template.message);
                form.setValue("messageFilipino", template.messageFilipino);
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <Text className="text-base font-semibold text-slate-950">
                {template.broadcastType.replace("_", " ").toUpperCase()}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">{template.message}</Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="Compose broadcast" subtitle="Push notifications and SMS fanout can consume the same message payload.">
        <View className="gap-4">
          <Controller
            control={form.control}
            name="message"
            render={({ field, fieldState }) => (
              <TextField
                label="English message"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Enter the primary message"
                multiline
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="messageFilipino"
            render={({ field, fieldState }) => (
              <TextField
                label="Filipino message"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder="Optional Filipino version"
                multiline
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="targetPurok"
            render={({ field, fieldState }) => (
              <TextField
                label="Target purok"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                placeholder="Leave blank to reach the whole barangay"
                error={fieldState.error?.message}
              />
            )}
          />

          {form.formState.errors.root?.message ? (
            <Text className="text-sm text-rose-600">{form.formState.errors.root.message}</Text>
          ) : null}

          <AppButton
            label="Send broadcast"
            onPress={handleSubmit}
            loading={createBroadcastMutation.isPending}
          />
        </View>
      </SectionCard>

      <SectionCard title="Recent broadcasts" subtitle="This becomes the operational audit trail for sent messaging.">
        {broadcastsQuery.data?.length ? (
          broadcastsQuery.data.map((broadcast) => (
            <View key={broadcast.id} className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-950">{broadcast.message}</Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    {broadcast.target_purok ? `Scoped to ${broadcast.target_purok}` : "Whole barangay"}
                  </Text>
                </View>
                <Pill label={broadcast.broadcast_type.replace("_", " ").toUpperCase()} tone="info" />
              </View>
              <Text className="mt-3 text-xs uppercase tracking-[1.2px] text-slate-400">
                Sent {formatDateTime(broadcast.sent_at)}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState
            title="No broadcasts yet"
            description="Once you send operational messages, they will appear here for follow-up and review."
          />
        )}
      </SectionCard>
    </View>
  );
}
