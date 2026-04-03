/**
 * Expo Push Notification service.
 * Sends push notifications via Expo's push API to registered device tokens.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type ExpoPushMessage = {
  to: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
};

export type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

export type ExpoPushResult = {
  totalSent: number;
  totalFailed: number;
  tickets: ExpoPushTicket[];
};

/**
 * Send push notifications in batches of 100 (Expo limit).
 * Never throws — returns results for logging.
 */
export async function sendExpoPush(
  messages: ExpoPushMessage[],
): Promise<ExpoPushResult> {
  if (!messages.length) {
    return { totalSent: 0, totalFailed: 0, tickets: [] };
  }

  const allTickets: ExpoPushTicket[] = [];
  const batches = chunkArray(messages, 100);

  for (const batch of batches) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Expo Push API error (${res.status}): ${text}`);
        allTickets.push(
          ...batch.map(() => ({
            status: "error" as const,
            message: `HTTP ${res.status}`,
          })),
        );
        continue;
      }

      const json = (await res.json()) as { data: ExpoPushTicket[] };
      allTickets.push(...json.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown push error";
      console.error("Expo Push fetch failed:", msg);
      allTickets.push(
        ...batch.map(() => ({
          status: "error" as const,
          message: msg,
        })),
      );
    }
  }

  const totalSent = allTickets.filter((t) => t.status === "ok").length;

  return {
    totalSent,
    totalFailed: allTickets.length - totalSent,
    tickets: allTickets,
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
