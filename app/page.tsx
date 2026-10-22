"use client";
/* eslint-disable @next/next/no-img-element -- slip photos are small data URLs, not files Next can optimise */

import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { buildRoute } from "@/lib/geo";
import { LABELS, LANGUAGES } from "@/lib/labels";
import { STATUSES, normalizePhone, routeProgress, stageIndex } from "@/lib/rules";
import type { Event, Language, RouteInfo, Trip } from "@/lib/store";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false, loading: () => <div className="map" /> });

const STORAGE_KEY = "findmytruck-trip";
const levelText = { ok: "OK", review: "REVIEW", flag: "FLAG" } as const;

type Invite = { sent: boolean; via?: string; error?: string };

function ago(from: number, now: number) {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

function duration(min: number) {
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

// A QR code of the driver link: the driver scans it with the phone camera and the page opens.
function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setSrc).catch(() => setSrc(""));
  }, [url]);
  return src ? <img className="qr" src={src} alt="QR code for the driver link" /> : null;
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 6h13v10H1zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" fill="#1f5eff" /><circle cx="18" cy="18" r="2" fill="#1f5eff" />
        </svg>
      </div>
      <div>
        <h1>FindMyTruck</h1>
        <small>Know your truck&apos;s status without a call</small>
      </div>
    </div>
  );
}

export default function ManagerPage() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(0); // set by the first timer tick
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false); // false until we know whether a saved trip exists
  const [invite, setInvite] = useState<Invite | null>(null);
  const [routeNote, setRouteNote] = useState("");
  const [phone, setPhone] = useState(""); // only kept in memory, for the one-tap send buttons
  const [demoSpeed, setDemoSpeed] = useState(true);

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/trip?id=${id}`);
      if (res.ok) setTrip(await res.json());
      else {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setTrip(null);
      }
    } catch {
      // No connection right now: keep showing what we have and try again on the next tick.
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
      if (id) load(id).finally(() => setReady(true));
      else setReady(true);
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 3000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [tripId, load]);

  async function createTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setRouteNote("");
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form) as Record<string, string>;
    const from = (values.from ?? "").trim();
    const to = (values.to ?? "").trim();
    if ((from && !to) || (!from && to)) return setError("Enter both the pickup place and the drop place, or leave both empty.");
    if (values.phone?.trim() && !normalizePhone(values.phone)) return setError("Enter a valid phone number, for example 98765 43210");

    // Open the WhatsApp tab right now (while the click still counts), and fill it in once the trip exists.
    const toPhone = normalizePhone(values.phone ?? "");
    const chat = toPhone ? window.open("", "_blank") : null;
    chat?.document.write("Opening WhatsApp...");

    let route: RouteInfo | undefined;
    if (from && to) {
      setBusy("Finding the road route...");
      try {
        route = await buildRoute(from, to);
      } catch (err) {
        setRouteNote(`${(err as Error).message}. The trip was created without a map.`);
      }
    }
    setBusy("Creating trip...");
    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, route }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      chat?.close();
      return setError(data.error ?? "Something went wrong");
    }
    if (chat && toPhone) {
      if (data.invite?.sent) chat.close(); // already delivered automatically
      else {
        const text = LABELS[values.language as Language].invite.replace("{url}", `${window.location.origin}/driver/${data.id}`);
        chat.location.href = `https://wa.me/${toPhone.replace("+", "")}?text=${encodeURIComponent(text)}`;
      }
    }
    try { localStorage.setItem(STORAGE_KEY, data.id); } catch {}
    setPhone(values.phone ?? "");
    setInvite(data.invite ?? null);
    setTrip(data);
  }

  function newTrip() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setTrip(null);
    setInvite(null);
    setRouteNote("");
  }

  async function markHandled(eventId: string) {
    if (!trip) return;
    setTrip({ ...trip, events: trip.events.map((e) => (e.id === eventId ? { ...e, handled: true } : e)) });
    try {
      await fetch("/api/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id, eventId }),
      });
    } catch {}
    load(trip.id);
  }

  if (!ready) return <main><Brand /><p className="muted">Loading...</p></main>;

  if (!trip) {
    return (
      <main>
        <Brand />
        <form className="card" onSubmit={createTrip}>
          <strong>New trip</strong>
          <p className="muted" style={{ margin: "2px 0 0" }}>The driver gets a link on their phone as soon as you create it.</p>

          <div className="grid2">
            <div><label>Truck number</label><input name="truck" placeholder="MH12 AB 1234" /></div>
            <div><label>Driver name</label><input name="driver" placeholder="Ramesh" /></div>
          </div>
          <label>Driver&apos;s phone (the link is sent here)</label>
          <input name="phone" type="tel" inputMode="tel" placeholder="98765 43210" />
          <div className="hint">10-digit Indian number, or +country code. Not saved after sending.</div>
          <label>Driver&apos;s language</label>
          <select name="language" defaultValue="hi">
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <div className="grid2">
            <div><label>Material</label><input name="material" placeholder="Steel coils" /></div>
            <div><label>Expected weight (kg)</label><input name="expectedKg" type="number" inputMode="numeric" placeholder="18500" /></div>
          </div>
          <div className="grid2">
            <div><label>From (pickup)</label><input name="from" placeholder="Pune" /></div>
            <div><label>To (drop)</label><input name="to" placeholder="Mumbai" /></div>
          </div>
          <div className="hint">Add both places to see the road route and the lorry on a map.</div>

          {error && <p className="error">{error}</p>}
          <p><button className="wide" type="submit" disabled={!!busy}>{busy || "Create trip and send link"}</button></p>
        </form>
      </main>
    );
  }

  const events = [...trip.events].reverse();
  const last = trip.events[trip.events.length - 1];
  const link = `${window.location.origin}/driver/${trip.id}`;
  const open = trip.events.filter((e) => e.level !== "ok" && !e.handled).length;
  const stage = stageIndex(trip.events);
  const speed = demoSpeed ? 60 : 1;
  const route = trip.route;
  const progress = route ? routeProgress(trip.events, route.durationMin, speed, now) : 0;
  const message = LABELS[trip.language].invite.replace("{url}", link);
  const digits = (normalizePhone(phone) ?? "").replace("+", "");

  return (
    <main>
      <Brand />

      <div className="row" style={{ alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 3 }}>
          <strong style={{ fontSize: "1.2rem" }}>{trip.truck}</strong>
          <div className="muted">{trip.driver} · {trip.material} · {trip.expectedKg.toLocaleString("en-US")} kg expected</div>
        </div>
        <button className="secondary" style={{ flex: 1 }} onClick={newTrip}>New trip</button>
      </div>

      <div className="steps">
        {STATUSES.map((s, i) => (
          <div key={s} className={`step ${i <= stage ? "done" : ""} ${i === stage ? "current" : ""}`}><i />{s}</div>
        ))}
      </div>

      <div className="stats">
        <div className="stat"><b>{last ? ago(last.at, now) : "None yet"}</b><span>Last update</span></div>
        <div className={`stat ${open > 0 ? "alert" : ""}`}><b>{open}</b><span>Need your decision</span></div>
        <div className="stat">
          <b>{route ? `${route.distanceKm} km` : `${trip.expectedKg.toLocaleString("en-US")} kg`}</b>
          <span>{route ? `About ${duration(route.durationMin)}` : "Expected load"}</span>
        </div>
      </div>

      {invite?.sent && <div className="banner good">Link sent to the driver by {invite.via} (number ending {trip.phoneHint}).</div>}
      {invite && !invite.sent && (
        <div className="banner">Not sent automatically ({invite.error}). Use the buttons below to send it in one tap.</div>
      )}
      {routeNote && <div className="banner">{routeNote}</div>}

      {route && (
        <div className="card mapcard">
          <div className="mapbar">
            <strong>{route.from} → {route.to}</strong>
            <select value={demoSpeed ? "demo" : "real"} onChange={(e) => setDemoSpeed(e.target.value === "demo")} aria-label="Lorry speed">
              <option value="demo">Demo speed (60x)</option>
              <option value="real">Real time</option>
            </select>
          </div>
          <RouteMap route={route} events={trip.events} speed={speed} />
          <div className="mapnote">
            {stage >= 3 ? "Delivered. " : stage >= 2 ? `Estimated ${Math.round(progress * 100)}% of the way. ` : "Waiting for the driver to leave. "}
            The lorry position is an estimate from the driver&apos;s status and the road time, not live GPS.
          </div>
        </div>
      )}

      <div className="card">
        <strong>Driver link</strong>
        <div className="linkbox">{link}</div>
        <div className="btns">
          <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button className="wa wide" type="button">Send on WhatsApp</button>
          </a>
          <a href={`sms:${phone ? normalizePhone(phone) ?? "" : ""}?body=${encodeURIComponent(message)}`} style={{ textDecoration: "none" }}>
            <button className="secondary wide" type="button">Send SMS</button>
          </a>
          <button
            className="secondary full"
            type="button"
            onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          >{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
        <div className="qrbox">
          <Qr url={link} />
          <div className="muted">Or show this code to the driver. Scanning it with the phone camera opens the same link.</div>
        </div>
      </div>

      <h2>Timeline</h2>
      {events.length === 0 && <p className="muted">Waiting for the driver. Open the driver link on a phone.</p>}
      {events.map((ev: Event) => (
        <div key={ev.id} className={`card event ${ev.handled ? "handled" : ev.level}`}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="title">{ev.status}</span>
            {ev.handled
              ? <span className="badge handled" style={{ flex: "none" }}>HANDLED</span>
              : <span className={`badge ${ev.level}`} style={{ flex: "none" }}>{levelText[ev.level]}</span>}
          </div>
          <div className="muted">{new Date(ev.at).toLocaleTimeString()} · {ago(ev.at, now)}</div>
          {ev.note && <p className="note">{ev.note}</p>}
          <div className="pair">
            <span>Original</span><span>{ev.original}</span>
            {ev.kind === "text" && (<><span>Translation</span><span>{ev.translation || "—"}</span></>)}
            {ev.weightKg !== undefined && (<><span>Weight read</span><span>{ev.weightKg.toLocaleString("en-US")} kg</span></>)}
          </div>
          {ev.photo && <img src={ev.photo} alt="Slip" />}
          {ev.level !== "ok" && !ev.handled && (
            <p style={{ marginBottom: 0 }}><button className="secondary" onClick={() => markHandled(ev.id)}>Mark as handled</button></p>
          )}
        </div>
      ))}
    </main>
  );
}
