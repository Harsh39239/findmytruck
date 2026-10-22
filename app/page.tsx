"use client";
/* eslint-disable @next/next/no-img-element -- slip photos are small data URLs, not files Next can optimise */

import { useCallback, useEffect, useState } from "react";
import { LANGUAGES } from "@/lib/labels";
import type { Event, Trip } from "@/lib/store";

const STORAGE_KEY = "findmytruck-trip";

function ago(from: number, now: number) {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 60) return `${s} sec ago`;
  return `${Math.round(s / 60)} min ago`;
}

const levelText = { ok: "OK", review: "REVIEW", flag: "FLAG" } as const;

export default function ManagerPage() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0); // set by the first timer tick
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/trip?id=${id}`);
    if (res.ok) setTrip(await res.json());
    else {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      setTrip(null);
    }
  }, []);

  // Runs once on open (to restore the saved trip) and then every 3 seconds to pick up new events.
  const tripId = trip?.id;
  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      let id = tripId ?? "";
      if (!id) {
        try { id = localStorage.getItem(STORAGE_KEY) ?? ""; } catch {}
      }
      if (id) load(id);
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 3000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [tripId, load]);

  async function createTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    try { localStorage.setItem(STORAGE_KEY, data.id); } catch {}
    setTrip(data);
  }

  function newTrip() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setTrip(null);
  }

  if (!trip) {
    return (
      <main>
        <h1>FindMyTruck</h1>
        <p className="muted">Create a trip, send the driver the link, and watch the status come in.</p>
        <form className="card" onSubmit={createTrip}>
          <label>Truck number</label>
          <input name="truck" placeholder="MH12 AB 1234" />
          <label>Driver name</label>
          <input name="driver" placeholder="Ramesh" />
          <label>Driver&apos;s language</label>
          <select name="language" defaultValue="hi">
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <label>Material</label>
          <input name="material" placeholder="Steel coils" />
          <label>Expected weight (kg)</label>
          <input name="expectedKg" type="number" inputMode="numeric" placeholder="18500" />
          {error && <div className="error">{error}</div>}
          <p><button type="submit" disabled={busy}>{busy ? "Creating..." : "Create trip"}</button></p>
        </form>
      </main>
    );
  }

  const events = [...trip.events].reverse();
  const last = trip.events[trip.events.length - 1];
  const link = `${window.location.origin}/driver/${trip.id}`;

  return (
    <main>
      <h1>{trip.truck}</h1>
      <p className="muted">{trip.driver} · {trip.material} · expected {trip.expectedKg.toLocaleString("en-US")} kg</p>

      <div className="card">
        <strong>Last update: {last ? ago(last.at, now) : "nothing yet"}</strong>
        <div className="linkbox">{link}</div>
        <div className="row">
          <button
            className="secondary"
            onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          >{copied ? "Copied ✓" : "Copy driver link"}</button>
          <button className="secondary" onClick={newTrip}>New trip</button>
        </div>
      </div>

      <h2>Timeline</h2>
      {events.length === 0 && <p className="muted">Waiting for the driver. Open the driver link on another phone or tab.</p>}
      {events.map((ev: Event) => (
        <div key={ev.id} className={`card event ${ev.level}`}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{ev.status}</strong>
            <span className={`badge ${ev.level}`}>{levelText[ev.level]}</span>
          </div>
          <div className="muted">{new Date(ev.at).toLocaleTimeString()} · {ago(ev.at, now)}</div>
          {ev.note && <p style={{ margin: "6px 0" }}><strong>{ev.note}</strong></p>}
          <div className="pair">
            <span>Original</span><span>{ev.original}</span>
            {ev.kind === "text" && (<><span>Translation</span><span>{ev.translation || "—"}</span></>)}
            {ev.weightKg !== undefined && (<><span>Weight read</span><span>{ev.weightKg.toLocaleString("en-US")} kg</span></>)}
          </div>
          {ev.photo && <img src={ev.photo} alt="Slip" />}
        </div>
      ))}
    </main>
  );
}
