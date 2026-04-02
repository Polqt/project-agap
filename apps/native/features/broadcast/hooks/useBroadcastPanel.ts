import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { trpc } from "@/services/trpc";
import {
  getErrorMessage,
  getServerConnectionErrorMessage,
  isOfflineLikeError,
} from "@/shared/utils/errors";
import { broadcastSchema, type BroadcastFormValues } from "@/types/forms";

export function useBroadcastPanel() {
  const { profile } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      broadcastType: "stay_alert",
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
        void broadcastsQuery.refetch();
        form.reset({
          broadcastType: "stay_alert",
          message: "",
          messageFilipino: "",
          targetPurok: "",
        });
        setFeedback("Broadcast sent.");
      },
    }),
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const normalizedType = values.targetPurok?.trim().length ? values.broadcastType : "stay_alert";
      await createBroadcastMutation.mutateAsync({
        broadcastType: normalizedType,
        message: values.message,
        messageFilipino: values.messageFilipino || null,
        targetPurok: values.targetPurok || null,
      });
    } catch (error) {
      form.setError("root", {
        message: isOfflineLikeError(error)
          ? getServerConnectionErrorMessage("Unable to send the broadcast.")
          : getErrorMessage(error, "Unable to send the broadcast."),
      });
    }
  });

  return {
    form,
    feedback,
    broadcasts: broadcastsQuery.data ?? [],
    createBroadcastMutation,
    handleSubmit,
  };
}
