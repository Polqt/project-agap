import { NextRequest, NextResponse } from "next/server";

/**
 * Dev-only endpoint to simulate an inbound SMS from TextBee.
 * Usage: POST /api/webhooks/sms/test
 * Body: { "sender": "+639171234567", "message": "LIGTAS" }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json();
  const { sender, message } = body as { sender?: string; message?: string };

  if (!sender || !message) {
    return NextResponse.json(
      { error: "Provide sender (phone number) and message in body" },
      { status: 400 },
    );
  }

  const webhookPayload = {
    smsId: `test-${Date.now()}`,
    sender,
    message,
    receivedAt: new Date().toISOString(),
    deviceId: "test-device",
    webhookEvent: "MESSAGE_RECEIVED",
  };

  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/webhooks/sms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload),
  });

  const result = await res.json();
  return NextResponse.json({ simulatedPayload: webhookPayload, webhookResponse: result });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  return NextResponse.json({
    usage: "POST /api/webhooks/sms/test",
    body: { sender: "+639171234567", message: "LIGTAS" },
    keywords: ["LIGTAS (safe)", "TULONG (need help)", "NASAAN (evac centers)", "SINO (captain info)"],
  });
}
