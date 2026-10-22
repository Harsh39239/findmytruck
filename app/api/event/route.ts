import { NextResponse } from "next/server";
import { readSlip, translateReply } from "@/lib/ai";
import { LABELS } from "@/lib/labels";
import { STATUSES, decideSlip, decideText, hasReadableText } from "@/lib/rules";
import { getTrip, saveTrip, type Event } from "@/lib/store";

const MAX_PHOTO_CHARS = 3_000_000;

// The manager marks a flagged or review item as handled. The original verdict stays on record.
export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null);
  const trip = await getTrip(String(b?.tripId ?? ""));
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const event = trip.events.find((e) => e.id === b?.eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.level === "ok") return NextResponse.json({ error: "Only review or flag items can be marked as handled" }, { status: 400 });
  event.handled = true;
  await saveTrip(trip);
  return NextResponse.json(event);
}

// The driver sends a tap, free text, or a slip photo. Claude reads; plain rules decide.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const trip = await getTrip(String(b?.tripId ?? ""));
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const hasPhoto = trip.events.some((e) => e.kind === "slip" && e.photo);
  const base = { id: crypto.randomUUID().slice(0, 8), at: Date.now() };
  let event: Event;

  if (b.kind === "tap") {
    const status = String(b.status);
    if (!(STATUSES as readonly string[]).includes(status)) return NextResponse.json({ error: "Unknown button" }, { status: 400 });
    const loadedNoPhoto = status === "Loaded" && !hasPhoto;
    event = {
      ...base,
      kind: "tap",
      original: LABELS[trip.language][status],
      translation: status,
      status,
      level: loadedNoPhoto ? "review" : "ok",
      note: loadedNoPhoto ? "Loaded, but no slip photo yet." : "",
    };
  } else if (b.kind === "text") {
    const text = String(b.text ?? "").trim().slice(0, 500);
    if (!text) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    if (!hasReadableText(text)) {
      event = {
        ...base,
        kind: "text",
        original: text,
        translation: "",
        status: "Unknown",
        level: "review",
        note: "The message has no readable words. Check with the driver.",
      };
      trip.events.push(event);
      await saveTrip(trip);
      return NextResponse.json(event);
    }
    try {
      const ai = await translateReply(text);
      const verdict = decideText(ai.status, ai.confidence, hasPhoto);
      event = { ...base, kind: "text", original: text, translation: ai.translation, status: ai.status, ...verdict };
    } catch (err) {
      console.error("AI text error:", (err as Error).message);
      event = {
        ...base,
        kind: "text",
        original: text,
        translation: "",
        status: "Unknown",
        level: "review",
        note: "Could not translate. Needs manual check of the original text.",
      };
    }
  } else if (b.kind === "slip") {
    const photo = String(b.photo ?? "");
    if (!photo.startsWith("data:image/") || photo.length > MAX_PHOTO_CHARS) {
      return NextResponse.json({ error: "Photo missing or too large" }, { status: 400 });
    }
    try {
      const slip = await readSlip(photo);
      const verdict = decideSlip(slip, trip.expectedKg);
      event = { ...base, kind: "slip", original: "Slip photo", translation: "", weightKg: slip.weightKg ?? undefined, photo, ...verdict };
    } catch (err) {
      console.error("AI slip error:", (err as Error).message);
      event = {
        ...base,
        kind: "slip",
        original: "Slip photo",
        translation: "",
        status: "Slip check",
        level: "flag",
        note: "Could not read the slip (AI unavailable). Check the photo yourself.",
        photo,
      };
    }
  } else {
    return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
  }

  trip.events.push(event);
  await saveTrip(trip);
  return NextResponse.json(event);
}
