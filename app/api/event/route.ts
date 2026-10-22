import { NextResponse } from "next/server";
import { addEvent, type Incoming } from "@/lib/events";
import { getTrip, saveTrip } from "@/lib/store";

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

// The driver's web page sends a tap, free text, or a slip photo. The same rules run for WhatsApp and SMS replies.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const trip = await getTrip(String(b?.tripId ?? ""));
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const result = await addEvent(trip, b as Incoming, "web");
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.code });
  return NextResponse.json(result.event);
}
