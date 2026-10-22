import type { RouteInfo } from "./store";

// Runs in the manager's browser. Place search: OpenStreetMap Nominatim. Road route: OSRM.
// Both are free and need no key. The route is an estimate, not a truck-specific route.

type Point = { lat: number; lng: number; label: string };

export async function geocode(place: string): Promise<Point> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`, {
    headers: { "Accept-Language": "en" },
  });
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error(`Could not find "${place}" on the map`);
  return { lat: Number(rows[0].lat), lng: Number(rows[0].lon), label: place };
}

export async function buildRoute(fromText: string, toText: string): Promise<RouteInfo> {
  const [a, b] = await Promise.all([geocode(fromText), geocode(toText)]);
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`,
  );
  const data = await res.json();
  const r = data?.routes?.[0];
  if (!r) throw new Error("No road route found between those places");
  const all: [number, number][] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  return {
    from: fromText,
    to: toText,
    points: thin(all, 250),
    distanceKm: Math.round(r.distance / 100) / 10,
    durationMin: Math.round(r.duration / 60),
  };
}

function thin(points: [number, number][], max: number) {
  if (points.length <= max) return points;
  const out: [number, number][] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round((i * (points.length - 1)) / (max - 1))]);
  return out;
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function metres(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearing(a: [number, number], b: [number, number]) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Distance walked along the path to every point, so we can place the lorry at "x% of the road".
export function cumulative(points: [number, number][]) {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + metres(points[i - 1], points[i]));
  return out;
}

export function positionAt(points: [number, number][], cum: number[], progress: number) {
  const total = cum[cum.length - 1];
  const d = Math.min(Math.max(progress, 0), 1) * total;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const t = (d - cum[lo]) / seg;
  const a = points[lo];
  const b = points[hi];
  const ahead = points[Math.min(hi + 2, points.length - 1)];
  return {
    pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number],
    heading: bearing(a, ahead),
    index: hi,
  };
}
