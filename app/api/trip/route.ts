import { NextResponse } from "next/server";
import { activeMenu, languageMenu } from "@/lib/chat";
import { normalizePhone } from "@/lib/rules";
import { messagingConfigured, sendToDriver } from "@/lib/sms";
import { getTrip, publicTrip, saveTrip, type Language, type RouteInfo, type Trip } from "@/lib/store";

const LANGS: Language[] = ["hi", "ta", "ml", "en"];

// The route is looked up in the manager's browser. Check its shape before we store it.
function cleanRoute(r: unknown): RouteInfo | undefined {
  const x = r as RouteInfo | null;
  if (!x || !Array.isArray(x.points) || x.points.length < 2 || x.points.length > 400) return undefined;
  const ok = x.points.every((p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!ok) return undefined;
  return {
    from: String(x.from ?? "").slice(0, 80),
    to: String(x.to ?? "").slice(0, 80),
    points: x.points,
    distanceKm: Number(x.distanceKm) || 0,
    durationMin: Number(x.durationMin) || 0,
  };
}

// Manager reads a trip (with its events). The driver's web page also uses this. The phone number never leaves the server.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const trip = await getTrip(id);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(publicTrip(trip));
}

// Manager creates the trip. With a phone number, the driver is messaged on WhatsApp and SMS straight away,
// in all languages, and picks their own by replying. After that the conversation happens in their chat.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const truck = String(b?.truck ?? "").trim();
  const driver = String(b?.driver ?? "").trim();
  const material = String(b?.material ?? "").trim();
  const expectedKg = Number(b?.expectedKg);
  const rawLanguage = String(b?.language ?? "auto");
  const language = rawLanguage as Language;
  const rawPhone = String(b?.phone ?? "").trim();
  const phone = rawPhone ? normalizePhone(rawPhone) : null;

  const missing = [
    !truck && "truck",
    !driver && "driver",
    !material && "material",
    !(expectedKg > 0) && "expected weight (kg)",
    rawLanguage !== "auto" && !LANGS.includes(language) && "driver's language",
  ].filter(Boolean);
  if (missing.length) return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}` }, { status: 400 });
  if (rawPhone && !phone) {
    return NextResponse.json({ error: "Enter a valid phone number, for example 98765 43210 or +91 98765 43210" }, { status: 400 });
  }

  const driverChooses = rawLanguage === "auto";
  const trip: Trip = {
    id: crypto.randomUUID().slice(0, 8),
    truck,
    driver,
    phone: phone ?? undefined,
    phoneHint: phone ? phone.slice(-4) : undefined,
    chat: phone ? { stage: driverChooses ? "awaiting_language" : "active" } : undefined,
    route: cleanRoute(b?.route),
    language: driverChooses ? "en" : language,
    material,
    expectedKg,
    createdAt: Date.now(),
    events: [],
  };
  await saveTrip(trip);

  if (!phone) return NextResponse.json(publicTrip(trip));

  const text = driverChooses ? languageMenu(truck) : activeMenu(trip.language, truck);
  const results = await sendToDriver(phone, text);
  return NextResponse.json({
    ...publicTrip(trip),
    invite: { configured: messagingConfigured(), results, sent: results.some((r) => r.sent) },
  });
}
