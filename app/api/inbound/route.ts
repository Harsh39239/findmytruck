import { handleInbound } from "@/lib/inbound";
import { getTripByPhone } from "@/lib/store";
import { twiml, validTwilioSignature } from "@/lib/twilio";

const MAX_PHOTO_BYTES = 5_000_000;

// The address Twilio called, exactly as it was configured there (Twilio signs this URL).
function publicUrl(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${new URL(req.url).pathname}`;
}

// Twilio sends every WhatsApp or SMS reply from a driver here. We answer with the text to send back.
export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return new Response("Messaging is not set up", { status: 503 });

  const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>;
  if (!validTwilioSignature(authToken, publicUrl(req), params, req.headers.get("x-twilio-signature"))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const from = String(params.From ?? "");
  const via = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const phone = from.replace("whatsapp:", "").trim();
  const trip = phone ? await getTripByPhone(phone) : null;
  if (!trip) return twiml("No trip is linked to this number. Ask your manager to create one.");

  // A photo (WhatsApp only): download it from Twilio with our account login, then hand it to the slip reader.
  let photo: string | undefined;
  const mediaUrl = params.MediaUrl0;
  const mediaType = params.MediaContentType0 ?? "";
  if (Number(params.NumMedia) > 0 && mediaUrl && /^image\/(jpeg|png|webp)$/.test(mediaType)) {
    try {
      const sid = params.AccountSid || process.env.TWILIO_ACCOUNT_SID || "";
      const res = await fetch(mediaUrl, {
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}` },
        signal: AbortSignal.timeout(10000),
      });
      const bytes = Buffer.from(await res.arrayBuffer());
      if (res.ok && bytes.length <= MAX_PHOTO_BYTES) photo = `data:${mediaType};base64,${bytes.toString("base64")}`;
    } catch (err) {
      console.error("media download error:", (err as Error).message);
    }
  }

  const reply = await handleInbound(trip, { text: String(params.Body ?? ""), photo, via });
  return twiml(reply);
}
