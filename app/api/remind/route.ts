import { NextResponse } from "next/server";
import { reminderMessage, type Lang } from "@/lib/chat";
import { messagingConfigured, sendToDriver } from "@/lib/sms";
import { getTrip, saveTrip } from "@/lib/store";

const COOLDOWN_MS = 30_000;

// "Remind driver": send the driver a nudge in their language on WhatsApp.
//  - Twilio connected and the driver has a number: a real WhatsApp message is sent.
//  - Otherwise, in demo mode (the manager chose "show as sent", or the demo page): it is shown as sent but marked
//    as demo everywhere, because nothing really left the app.
//  - Otherwise the text is returned so the screen can open WhatsApp for the manager to send by hand.
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

  const configured = messagingConfigured();
  const simulated = b?.simulate === true || (b?.demo === true && !configured); // never pretends when real sending works
  const results = !simulated && trip.phone ? await sendToDriver(trip.phone, message, "WhatsApp") : [];
  const sent = simulated || results.some((r) => r.sent);

  trip.events.push({
    id: crypto.randomUUID().slice(0, 8),
    at: Date.now(),
    kind: "system",
    original: "",
    translation: "",
    status: "Reminder",
    level: "ok",
    note: simulated
      ? "Reminder sent on WhatsApp. (Demo mode: nothing was really delivered.)"
      : sent
        ? "Reminder sent on WhatsApp."
        : "Reminder prepared. It was not sent automatically.",
  });
  await saveTrip(trip);

  return NextResponse.json({ message, sent, simulated, configured, hasPhone: !!trip.phone, results });
}
