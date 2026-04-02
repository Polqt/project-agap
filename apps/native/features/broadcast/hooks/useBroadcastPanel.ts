import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { useAuth } from "@/shared/hooks/useAuth";
import { useOfflineQueue } from "@/shared/hooks/useOfflineQueue";
import { createQueuedAction } from "@/services/offlineQueueActions";
import { trpc } from "@/services/trpc";
import {
  getErrorMessage,
  getServerConnectionErrorMessage,
  isOfflineLikeError,
} from "@/shared/utils/errors";
import { broadcastSchema, type BroadcastFormValues } from "@/types/forms";

export function useBroadcastPanel() {
  const { profile } = useAuth();
  const { isOnline, queueAction } = useOfflineQueue();
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
    form.clearErrors("root");

    const payload = {
      broadcastType: values.broadcastType,
      message: values.message,
      messageFilipino: values.messageFilipino || null,
      targetPurok: values.targetPurok || null,
    };

    if (!isOnline) {
      await queueAction(createQueuedAction("broadcast.create", payload));
      form.reset({
        broadcastType: "stay_alert",
        message: "",
        messageFilipino: "",
        targetPurok: "",
      });
      setFeedback("No connection. Broadcast queued and will auto-send once online.");
      return;
    }

    try {
      await createBroadcastMutation.mutateAsync({
        ...payload,
      });
    } catch (error) {
      if (isOfflineLikeError(error)) {
        await queueAction(createQueuedAction("broadcast.create", payload));
        form.reset({
          broadcastType: "stay_alert",
          message: "",
          messageFilipino: "",
          targetPurok: "",
        });
        setFeedback("Connection dropped. Broadcast queued for auto-send.");
        return;
      }

      form.setError("root", {
        message:
          getErrorMessage(error, "") === "Network request failed"
            ? getServerConnectionErrorMessage("Unable to send the broadcast.")
            : getErrorMessage(error, "Unable to send the broadcast."),
      });
    }
  });

  return {
    form,
    feedback,
    broadcasts: broadcastsQuery.data ?? [],
    isOnline,
    createBroadcastMutation,
    handleSubmit,
  };
}
