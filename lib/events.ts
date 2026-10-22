import { readSlip, translateReply } from "./ai";
import { LABELS } from "./labels";
import { STATUSES, decideSlip, decideText, hasReadableText } from "./rules";
import { saveTrip, type Event, type Trip, type Via } from "./store";

// Photos bigger than this are still read by the AI but not kept (the database accepts about 1 MB per save).
const MAX_STORED_PHOTO_CHARS = 600_000;
const MAX_PHOTO_CHARS = 8_000_000;

export type Incoming =
  | { kind: "tap"; status: string }
  | { kind: "text"; text: string }
  | { kind: "slip"; photo: string };

export type Added = { event: Event; error?: undefined } | { event?: undefined; error: string; code: number };

// One place that records anything a driver sends, from the web page, WhatsApp or SMS.
// The AI reads and translates; plain rules decide OK, review or flag.
export async function addEvent(trip: Trip, input: Incoming, via: Via): Promise<Added> {
  const hasPhoto = trip.events.some((e) => e.kind === "slip" && e.photo);
  const base = { id: crypto.randomUUID().slice(0, 8), at: Date.now(), via };
  let event: Event;

  if (input.kind === "tap") {
    const status = String(input.status);
    if (!(STATUSES as readonly string[]).includes(status)) return { error: "Unknown button", code: 400 };
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
  } else if (input.kind === "text") {
    const text = String(input.text ?? "").trim().slice(0, 500);
    if (!text) return { error: "Message is empty", code: 400 };
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
    } else {
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
    }
  } else if (input.kind === "slip") {
    const photo = String(input.photo ?? "");
    if (!photo.startsWith("data:image/") || photo.length > MAX_PHOTO_CHARS) return { error: "Photo missing or too large", code: 400 };
    const keep = photo.length <= MAX_STORED_PHOTO_CHARS;
    try {
      const slip = await readSlip(photo);
      const verdict = decideSlip(slip, trip.expectedKg);
      event = {
        ...base,
        kind: "slip",
        original: "Slip photo",
        translation: "",
        weightKg: slip.weightKg ?? undefined,
        photo: keep ? photo : undefined,
        ...verdict,
        note: keep ? verdict.note : `${verdict.note} (The photo was too large to keep.)`,
      };
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
        photo: keep ? photo : undefined,
      };
    }
  } else {
    return { error: "Unknown event type", code: 400 };
  }

  trip.events.push(event);
  await saveTrip(trip);
  return { event };
}
