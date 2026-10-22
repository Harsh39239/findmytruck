import { NextResponse } from "next/server";
import { getTrip, saveTrip, type Language, type Trip } from "@/lib/store";

const LANGS: Language[] = ["hi", "ta", "ml", "en"];

// Manager reads a trip (with its events). The driver page also uses this to load its labels.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const trip = await getTrip(id);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(trip);
}

// Manager creates the trip.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const truck = String(b?.truck ?? "").trim();
  const driver = String(b?.driver ?? "").trim();
  const material = String(b?.material ?? "").trim();
  const expectedKg = Number(b?.expectedKg);
  const language = b?.language as Language;

  const missing = [
    !truck && "truck",
    !driver && "driver",
    !material && "material",
    !(expectedKg > 0) && "expected weight (kg)",
    !LANGS.includes(language) && "driver's language",
  ].filter(Boolean);
  if (missing.length) return NextResponse.json({ error: `Please fill in: ${missing.join(", ")}` }, { status: 400 });

  const trip: Trip = {
    id: crypto.randomUUID().slice(0, 8),
    truck,
    driver,
    language,
    material,
    expectedKg,
    createdAt: Date.now(),
    events: [],
  };
  await saveTrip(trip);
  return NextResponse.json(trip);
}
