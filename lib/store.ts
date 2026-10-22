import { Redis } from "@upstash/redis";
import type { Level } from "./rules";

export type Language = "hi" | "ta" | "ml" | "en";
export type Via = "web" | "whatsapp" | "sms";

export type Event = {
  id: string;
  at: number;
  kind: "tap" | "text" | "slip" | "system";
  via?: Via; // where the driver's message came from
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

// Where the chat with the driver stands. The driver picks a language by replying with a number.
export type Chat = { stage: "awaiting_language" | "active"; channel?: Via };

export type Trip = {
  id: string;
  truck: string;
  driver: string;
  phone?: string; // server only: used to message the driver and to match their replies. Never sent to a browser.
  phoneHint?: string; // last 4 digits, safe to show
  chat?: Chat;
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

const g = globalThis as unknown as { __trips?: Map<string, Trip>; __phones?: Map<string, string> };
const memory = (g.__trips ??= new Map<string, Trip>());
const phones = (g.__phones ??= new Map<string, string>());
const WEEK = 60 * 60 * 24 * 7;

// What a browser may see: the trip without the driver's phone number.
export function publicTrip(trip: Trip): Trip {
  const copy = { ...trip };
  delete copy.phone;
  return copy;
}

// A light copy of a trip for the fleet list: no photos, no road points, no phone number.
export type TripSummary = Omit<Trip, "events" | "route" | "phone"> & {
  events: Omit<Event, "photo">[];
  route?: Omit<RouteInfo, "points">;
};

export function summarize(trip: Trip): TripSummary {
  const { events, route, phone, ...rest } = trip;
  void phone;
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
  if (redis) {
    await redis.set(`trip:${trip.id}`, trip, { ex: WEEK });
    if (trip.phone) await redis.set(`phone:${trip.phone}`, trip.id, { ex: WEEK });
  } else {
    memory.set(trip.id, trip);
    if (trip.phone) phones.set(trip.phone, trip.id);
  }
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (redis) return (await redis.get<Trip>(`trip:${id}`)) ?? null;
  return memory.get(id) ?? null;
}

// The most recent trip created for this phone number: the one a reply from them belongs to.
export async function getTripByPhone(phone: string): Promise<Trip | null> {
  const id = redis ? await redis.get<string>(`phone:${phone}`) : phones.get(phone);
  return id ? getTrip(id) : null;
}
