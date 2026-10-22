import { Redis } from "@upstash/redis";
import type { Level } from "./rules";

export type Language = "hi" | "ta" | "ml" | "en";

export type Event = {
  id: string;
  at: number;
  kind: "tap" | "text" | "slip";
  original: string;
  translation: string;
  status: string;
  level: Level;
  note: string;
  weightKg?: number;
  photo?: string;
  handled?: boolean; // the manager has dealt with a review/flag item
};

export type RouteInfo = {
  from: string;
  to: string;
  points: [number, number][]; // [lat, lng] along the road, thinned out
  distanceKm: number;
  durationMin: number;
};

export type Trip = {
  id: string;
  truck: string;
  driver: string;
  phoneHint?: string; // last 4 digits only; the full number is never stored
  route?: RouteInfo;
  language: Language;
  material: string;
  expectedKg: number;
  createdAt: number;
  events: Event[];
};

// Hosted database (Upstash Redis) when its keys are set, otherwise memory (local testing only).
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const g = globalThis as unknown as { __trips?: Map<string, Trip> };
const memory = (g.__trips ??= new Map<string, Trip>());

// A light copy of a trip for the fleet list: no photos and no road points, so it stays small.
export type TripSummary = Omit<Trip, "events" | "route"> & {
  events: Omit<Event, "photo">[];
  route?: Omit<RouteInfo, "points">;
};

export function summarize(trip: Trip): TripSummary {
  const { events, route, ...rest } = trip;
  return {
    ...rest,
    events: events.map((e) => {
      const lite = { ...e };
      delete lite.photo;
      return lite;
    }),
    route: route && { from: route.from, to: route.to, distanceKm: route.distanceKm, durationMin: route.durationMin },
  };
}

export async function saveTrip(trip: Trip) {
  if (redis) await redis.set(`trip:${trip.id}`, trip, { ex: 60 * 60 * 24 * 7 });
  else memory.set(trip.id, trip);
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (redis) return (await redis.get<Trip>(`trip:${id}`)) ?? null;
  return memory.get(id) ?? null;
}
