import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

type Keyword = "LIGTAS" | "TULONG" | "NASAAN" | "SINO" | "unknown";

const KEYWORD_MAP: Record<string, Keyword> = {
  LIGTAS: "LIGTAS",
  SAFE: "LIGTAS",
  OK: "LIGTAS",
  TULONG: "TULONG",
  HELP: "TULONG",
  NASAAN: "NASAAN",
  WHERE: "NASAAN",
  SINO: "SINO",
  WHO: "SINO",
};

const STATUS_FROM_KEYWORD: Record<string, string> = {
  LIGTAS: "safe",
  TULONG: "need_help",
};

function parseKeyword(message: string): Keyword {
  const firstWord = message.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  return KEYWORD_MAP[firstWord] ?? "unknown";
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function sendAutoReply(recipient: string, message: string, barangayId: string, supabase: ReturnType<typeof createClient>) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  if (!apiKey || !deviceId) return null;

  const endpoint = `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: [recipient], message }),
    });

    const success = res.ok;
    const data = success ? await res.json() : null;
    const messageId = data?.messageId ?? data?.id ?? null;

    await supabase.from("sms_logs").insert({
      barangay_id: barangayId,
      direction: "outbound" as const,
      phone_number: recipient,
      message,
      delivery_status: success ? ("sent" as const) : ("failed" as const),
      gateway_message_id: messageId,
      error_message: success ? null : `HTTP ${res.status}`,
      sent_at: success ? new Date().toISOString() : null,
    });

    return { success, messageId };
  } catch (err) {
    console.error("Auto-reply failed:", err);
    return { success: false };
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.SMS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  const signature = req.headers.get("x-signature");
  if (process.env.NODE_ENV === "production" && !verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    smsId?: string;
    sender?: string;
    message?: string;
    receivedAt?: string;
    deviceId?: string;
    webhookEvent?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.webhookEvent !== "MESSAGE_RECEIVED") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { sender, message, receivedAt, smsId } = payload;
  if (!sender || !message) {
    return NextResponse.json({ error: "Missing sender or message" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const normalizedPhone = sender.replace(/\s+/g, "");

  const { data: household } = await supabase
    .from("households")
    .select("id, barangay_id, household_head, evacuation_status")
    .or(`phone_number.eq.${normalizedPhone},phone_number.eq.${normalizedPhone.replace(/^\+63/, "0")}`)
    .limit(1)
    .maybeSingle();

  const keyword = parseKeyword(message);

  const barangayId = household?.barangay_id ?? null;

  // barangay_id is NOT NULL in schema, skip insert if no match
  if (!barangayId) {
    console.warn(`Inbound SMS from unknown number ${normalizedPhone}, no matching household`);
    return NextResponse.json({ ok: true, matched: false });
  }

  const { error: insertError } = await supabase.from("sms_logs").insert({
    barangay_id: barangayId,
    household_id: household?.id ?? null,
    direction: "inbound" as const,
    phone_number: normalizedPhone,
    message,
    delivery_status: "replied" as const,
    keyword_reply: keyword,
    gateway_message_id: smsId ?? null,
    replied_at: receivedAt ?? new Date().toISOString(),
  });

  if (insertError) {
    console.error("Failed to insert inbound SMS log:", insertError);
    return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
  }

  let autoReplied = false;

  // LIGTAS → mark household as safe
  // TULONG → mark household as need_help (urgent)
  const newStatus = STATUS_FROM_KEYWORD[keyword];
  if (household && newStatus && household.evacuation_status !== newStatus) {
    await supabase
      .from("households")
      .update({ evacuation_status: newStatus })
      .eq("id", household.id);
  }

  if (keyword === "LIGTAS" && household) {
    await sendAutoReply(
      normalizedPhone,
      `Salamat ${household.household_head}! Na-mark na kayo bilang LIGTAS. Mag-ingat pa rin po.`,
      barangayId,
      supabase,
    );
    autoReplied = true;
  }

  if (keyword === "TULONG" && household) {
    await sendAutoReply(
      normalizedPhone,
      `Natanggap na ang inyong TULONG request, ${household.household_head}. Nakarating na ito sa kapitan. Hintayin po ang tulong.`,
      barangayId,
      supabase,
    );
    autoReplied = true;
  }

  // NASAAN → auto-reply with nearest evacuation center address
  if (keyword === "NASAAN") {
    const { data: centers } = await supabase
      .from("evacuation_centers")
      .select("name, address, contact_number")
      .eq("barangay_id", barangayId)
      .eq("is_open", true)
      .limit(3);

    if (centers && centers.length > 0) {
      const list = centers
        .map((c, i) => `${i + 1}. ${c.name} - ${c.address}${c.contact_number ? ` (${c.contact_number})` : ""}`)
        .join("\n");

      await sendAutoReply(
        normalizedPhone,
        `Evacuation centers na bukas:\n${list}\nPumunta sa pinakamalapit. Mag-ingat!`,
        barangayId,
        supabase,
      );
    } else {
      const { data: barangay } = await supabase
        .from("barangays")
        .select("name, municipality")
        .eq("id", barangayId)
        .single();

      await sendAutoReply(
        normalizedPhone,
        `Wala pang bukas na evacuation center sa Brgy. ${barangay?.name ?? ""}. Makipag-ugnayan sa kapitan. Mag-ingat!`,
        barangayId,
        supabase,
      );
    }
    autoReplied = true;
  }

  // SINO → auto-reply with barangay captain info
  if (keyword === "SINO") {
    const { data: barangay } = await supabase
      .from("barangays")
      .select("name, municipality, province")
      .eq("id", barangayId)
      .single();

    const { data: captain } = await supabase
      .from("profiles")
      .select("full_name, phone_number")
      .eq("barangay_id", barangayId)
      .eq("role", "official")
      .limit(1)
      .maybeSingle();

    const captainName = captain?.full_name || "Hindi available";
    const captainPhone = captain?.phone_number ? ` (${captain.phone_number})` : "";
    const brgyName = barangay?.name ?? "";
    const municipality = barangay?.municipality ?? "";

    await sendAutoReply(
      normalizedPhone,
      `Kapitan: ${captainName}${captainPhone}\nBarangay: ${brgyName}, ${municipality}\nMakipag-ugnayan kung kailangan ng tulong.`,
      barangayId,
      supabase,
    );
    autoReplied = true;
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    householdId: household?.id,
    keyword,
    statusUpdated: !!newStatus,
    autoReplied,
  });
}
