import { NextResponse } from "next/server";
import { reminderMessage, type Lang } from "@/lib/chat";
import { messagingConfigured, sendToDriver } from "@/lib/sms";
import { getTrip, saveTrip } from "@/lib/store";

const COOLDOWN_MS = 30_000;

// "Remind driver": send the driver a nudge in their language, on every connected channel.
// Without messaging set up (or for the demo) the text is only returned, so the screen can open WhatsApp with it.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const trip = await getTrip(String(b?.tripId ?? ""));
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const lastReminder = [...trip.events].reverse().find((e) => e.status === "Reminder");
  if (lastReminder && Date.now() - lastReminder.at < COOLDOWN_MS) {
    return NextResponse.json({ error: "A reminder was just sent. Give the driver a moment." }, { status: 429 });
  }

  // What is the reminder about? A slip problem asks for a photo; anything else asks for a status update.
  const about = b?.eventId ? trip.events.find((e) => e.id === b.eventId) : undefined;
  const aboutSlip = !!about && (about.kind === "slip" || (about.status === "Loaded" && about.level !== "ok"));
  const message = reminderMessage({
    lang: trip.language as Lang,
    truck: trip.truck,
    stage: trip.chat?.stage ?? "active",
    reason: aboutSlip ? "slip" : "update",
  });

  const simulate = b?.simulate === true; // the demo page: pretend it was delivered
  const results = !simulate && trip.phone ? await sendToDriver(trip.phone, message) : [];
  const sent = simulate || results.some((r) => r.sent);
  const channels = results.filter((r) => r.sent).map((r) => r.via).join(" and ");

  trip.events.push({
    id: crypto.randomUUID().slice(0, 8),
    at: Date.now(),
    kind: "system",
    original: "",
    translation: "",
    status: "Reminder",
    level: "ok",
    note: sent ? (simulate ? "Reminder sent to the driver." : `Reminder sent to the driver on ${channels}.`) : "Reminder prepared. It was not sent automatically.",
  });
  await saveTrip(trip);

  return NextResponse.json({ message, sent, configured: messagingConfigured(), results });
}
