import { env } from "@project-agap/env/server";

export type TextBeeResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type TextBeeBulkResult = {
  totalSent: number;
  totalFailed: number;
  results: TextBeeResponse[];
};

const TEXTBEE_BASE_URL = "https://api.textbee.dev/api/v1/gateway/devices";

function getEndpoint(): string {
  return `${TEXTBEE_BASE_URL}/${env.TEXTBEE_DEVICE_ID}/send-sms`;
}

export async function sendSms(
  recipient: string,
  message: string,
): Promise<TextBeeResponse> {
  try {
    const res = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        "x-api-key": env.TEXTBEE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipients: [recipient], message }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`TextBee API error (${res.status}): ${text}`);
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { messageId?: string; id?: string };
    return { success: true, messageId: data.messageId ?? data.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error sending SMS";
    console.error("TextBee fetch failed:", message);
    return { success: false, error: message };
  }
}

export async function sendBulkSms(
  recipients: string[],
  message: string,
): Promise<TextBeeBulkResult> {
  try {
    const res = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        "x-api-key": env.TEXTBEE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipients, message }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`TextBee bulk API error (${res.status}): ${text}`);
      return {
        totalSent: 0,
        totalFailed: recipients.length,
        results: recipients.map(() => ({
          success: false,
          error: `HTTP ${res.status}: ${text}`,
        })),
      };
    }

    const data = (await res.json()) as { messageId?: string; id?: string };

    return {
      totalSent: recipients.length,
      totalFailed: 0,
      results: recipients.map(() => ({
        success: true,
        messageId: data.messageId ?? data.id,
      })),
    };
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : "Unknown error sending bulk SMS";
    console.error("TextBee bulk fetch failed:", errMsg);
    return {
      totalSent: 0,
      totalFailed: recipients.length,
      results: recipients.map(() => ({ success: false, error: errMsg })),
    };
  }
}
