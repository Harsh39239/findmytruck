// Sends the driver link by SMS or WhatsApp through Twilio, when its keys are set in the environment:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
// TWILIO_FROM is a Twilio phone number for SMS, or "whatsapp:+14155238886" (the sandbox) for WhatsApp.
// With no keys it does nothing, and the manager screen shows one-tap send buttons instead.

export type SendResult = { sent: boolean; via?: "SMS" | "WhatsApp"; error?: string };

export async function sendInvite(toPhone: string, text: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return { sent: false, error: "Automatic sending is not set up" };

  const whatsapp = from.startsWith("whatsapp:");
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: whatsapp ? `whatsapp:${toPhone}` : toPhone, From: from, Body: text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { sent: false, error: `Message service returned ${res.status}` };
    return { sent: true, via: whatsapp ? "WhatsApp" : "SMS" };
  } catch (err) {
    console.error("send error:", (err as Error).message);
    return { sent: false, error: "Could not reach the message service" };
  }
}
