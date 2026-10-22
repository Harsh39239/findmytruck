import { NextResponse } from "next/server";
import { handleInbound } from "@/lib/inbound";
import { getTrip } from "@/lib/store";

// Demo tool: lets the manager pretend to be the driver, so the whole WhatsApp / SMS conversation
// can be shown without a Twilio account. It runs the very same code as a real reply.
// (Anyone with a trip code can already send updates through the driver's web page, so this adds no new access.)
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const trip = await getTrip(String(b?.tripId ?? ""));
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const text = String(b?.text ?? "").slice(0, 500);
  if (!text.trim()) return NextResponse.json({ error: "Type a message first" }, { status: 400 });
  const via = b?.via === "sms" ? "sms" : "whatsapp";
  const reply = await handleInbound(trip, { text, via });
  return NextResponse.json({ reply });
}
