// Sends messages to the driver through Twilio, on WhatsApp and SMS at the same time.
// Set these in the environment (Vercel, and .env.local on your computer):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
//   TWILIO_FROM_WHATSAPP  e.g. whatsapp:+14155238886 (the Twilio WhatsApp sandbox)
//   TWILIO_FROM_SMS       e.g. +15005550006 (a Twilio phone number that can send SMS)
// With none of these set nothing is sent, and the manager screen explains it.

export type Channel = "WhatsApp" | "SMS";
export type SendResult = { via: Channel; sent: boolean; error?: string };

function senders(): { via: Channel; from: string }[] {
  const out: { via: Channel; from: string }[] = [];
  const wa = process.env.TWILIO_FROM_WHATSAPP;
  const sms = process.env.TWILIO_FROM_SMS;
  const old = process.env.TWILIO_FROM; // single-number setting from the first version
  if (wa) out.push({ via: "WhatsApp", from: wa.startsWith("whatsapp:") ? wa : `whatsapp:${wa}` });
  if (sms) out.push({ via: "SMS", from: sms });
  if (old && !wa && old.startsWith("whatsapp:")) out.push({ via: "WhatsApp", from: old });
  if (old && !sms && !old.startsWith("whatsapp:")) out.push({ via: "SMS", from: old });
  return out;
}

export const messagingConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && senders().length);

async function sendOne(sid: string, token: string, via: Channel, from: string, toPhone: string, text: string): Promise<SendResult> {
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: via === "WhatsApp" ? `whatsapp:${toPhone}` : toPhone, From: from, Body: text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { via, sent: false, error: `${via} service returned ${res.status}` };
    return { via, sent: true };
  } catch (err) {
    console.error(`${via} send error:`, (err as Error).message);
    return { via, sent: false, error: `Could not reach the ${via} service` };
  }
}

// Sends the same text on every configured channel, or only on `only` (for example just WhatsApp for reminders).
// Returns one result per channel.
export async function sendToDriver(toPhone: string, text: string, only?: Channel): Promise<SendResult[]> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const list = senders().filter((x) => !only || x.via === only);
  if (!sid || !token || list.length === 0) return [];
  return Promise.all(list.map((s) => sendOne(sid, token, s.via, s.from, toPhone, text)));
}
