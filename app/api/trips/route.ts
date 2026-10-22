import { NextResponse } from "next/server";
import { getTrip, summarize } from "@/lib/store";

const MAX_TRUCKS = 30;

// The fleet list: many trips in one call, without photos. Trips that no longer exist come back in `missing`.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9]{4,16}$/i.test(s)))].slice(0, MAX_TRUCKS);
  const found = await Promise.all(ids.map((id) => getTrip(id)));
  const trips = found.filter((t): t is NonNullable<typeof t> => !!t).map(summarize);
  const have = new Set(trips.map((t) => t.id));
  return NextResponse.json({ trips, missing: ids.filter((id) => !have.has(id)) });
}
