"use client";
/* eslint-disable @next/next/no-img-element -- slip photos are small data URLs, not files Next can optimise */

import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SendMode } from "@/lib/fleet";
import { LABELS, LANGUAGES } from "@/lib/labels";
import { STATUSES, lastDriverEvent, normalizePhone, openCount, routeProgress, silentFor, stageIndex } from "@/lib/rules";
import type { Event, Trip } from "@/lib/store";
import type { Created } from "./new-trip-form";
import { Brand, Icon, Skeleton, ago, duration } from "./ui";

const RouteMap = dynamic(() => import("./route-map"), { ssr: false, loading: () => <div className="map" /> });

const levelText = { ok: "OK", review: "REVIEW", flag: "FLAG" } as const;
const LANGUAGE_NAMES = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name])) as Record<string, string>;

// A QR code of the driver link: the driver scans it with the phone camera and the page opens.
function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setSrc).catch(() => setSrc(""));
  }, [url]);
  return src ? <img className="qr" src={src} alt="QR code for the driver link" /> : null;
}

type Props = {
  tripId: string;
  created: Created | null; // set only right after this trip was made on this screen
  demoSpeed: boolean;
  setDemoSpeed: (on: boolean) => void;
  silentMin: number;
  sendMode?: SendMode; // what Remind driver does when messaging is not connected
  onBack: () => void;
  onRemove: () => void; // drop this truck from the list
  onFound: () => void; // the trip exists, make sure it is on the list
  embedded?: boolean; // shown inside the demo page: no header, buttons or driver link, and the full timeline
  onRemind?: (text: string) => void; // the demo page shows the reminder on its phone
};

export default function TripDetail({ tripId, created, demoSpeed, setDemoSpeed, silentMin, sendMode = "demo", onBack, onRemove, onFound, embedded = false, onRemind }: Props) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [missing, setMissing] = useState(false);
  const [now, setNow] = useState(0); // set by the first timer tick
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false); // first tap on Remove asks "tap again"
  const removing = useRef(false); // once removal starts, this page must not put the truck back on the list
  const [remindBusy, setRemindBusy] = useState(false);
  const [remindNote, setRemindNote] = useState("");

  const foundRef = useRef(onFound);
  useEffect(() => { foundRef.current = onFound; });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trip?id=${tripId}`);
      if (res.ok) { setTrip(await res.json()); if (!removing.current) foundRef.current(); }
      else if (res.status === 404) setMissing(true);
    } catch {
      // No connection right now: keep showing what we have and try again on the next tick.
    }
  }, [tripId]);

  useEffect(() => {
    const tick = () => { setNow(Date.now()); load(); };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, embedded ? 1500 : 3000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [load, embedded]);

  // "Remind driver": the server sends it to the driver on WhatsApp. If messaging is not connected, demo mode shows it as
  // sent (clearly marked as demo), or WhatsApp opens with the text ready, depending on the manager's setting.
  async function remind(eventId?: string) {
    if (remindBusy) return;
    setRemindBusy(true);
    setRemindNote("");
    const manual = sendMode === "manual" && !embedded;
    const tab = manual ? window.open("", "_blank") : null; // opened now, while the click still counts
    tab?.document.write("Opening WhatsApp...");
    try {
      const res = await fetch("/api/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, eventId, simulate: embedded, demo: !manual }),
      });
      const data = await res.json();
      if (!res.ok) {
        tab?.close();
        setRemindNote(data.error ?? "Could not send the reminder.");
      } else if (data.sent) {
        tab?.close();
        if (embedded) onRemind?.(data.message);
        setRemindNote(data.simulated ? "Reminder sent on WhatsApp. (Demo mode: nothing was really delivered.)" : "Reminder sent on WhatsApp.");
      } else if (tab) {
        tab.location.href = `https://wa.me/?text=${encodeURIComponent(data.message)}`;
        setRemindNote("WhatsApp opened with the reminder ready to send.");
      } else {
        setRemindNote(data.hasPhone ? "The reminder could not be sent." : "No phone number is saved for this driver, so nothing could be sent.");
      }
    } catch {
      tab?.close();
      setRemindNote("No connection. Try again.");
    }
    setRemindBusy(false);
    load();
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
    load();
  }

  if (missing) {
    return (
      <main>
        <Brand />
        <div className="card">
          <strong>Trip not found</strong>
          <p className="muted">There is no trip with the code {tripId}. It may have expired or the code is wrong.</p>
          <div className="row">
            <button className="secondary" onClick={onBack}>← All trucks</button>
            <button className="secondary" onClick={() => { removing.current = true; onRemove(); }}>Remove from my list</button>
          </div>
        </div>
      </main>
    );
  }
  if (!trip) return <main><Brand /><Skeleton rows={2} /></main>;

  const invite = !embedded && created?.trip.id === trip.id ? created.invite : null;
  const routeNote = !embedded && created?.trip.id === trip.id ? created.routeNote : "";
  const Shell = embedded ? "div" : "main";
  const phone = created?.trip.id === trip.id ? created.phone : "";

  const events = [...trip.events].reverse();
  const needsYou = events.filter((e) => e.level !== "ok" && !e.handled); // what still waits for a decision
  const last = lastDriverEvent(trip.events);
  const link = `${window.location.origin}/driver/${trip.id}`;
  const open = openCount(trip.events);
  const stage = stageIndex(trip.events);
  const speed = demoSpeed ? (embedded ? 240 : 60) : 1; // the demo page runs the whole route in about 30 seconds
  const route = trip.route;
  const progress = route ? routeProgress(trip.events, route.durationMin, speed, now) : 0;
  const message = LABELS[trip.language].invite.replace("{url}", link);
  const digits = (normalizePhone(phone) ?? "").replace("+", "");
  const silent = silentFor(trip.events, trip.createdAt, stage, now, silentMin);

  // One card for a message from the driver. The demo page lists all of them; the manager's screen lists only
  // the ones that still need a decision.
  const eventCard = (ev: Event) => (
    <div key={ev.id} className={`card event ${ev.handled ? "handled" : ev.level} ${now > 0 && now - ev.at < 6000 ? "fresh" : ""}`}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="title"><span className="kindicon"><Icon name={ev.kind === "slip" ? "camera" : ev.kind === "text" ? "chat" : ev.kind === "system" ? "globe" : "check"} size={16} /></span>{ev.status}</span>
        {ev.handled
          ? <span className="badge handled" style={{ flex: "none" }}>HANDLED</span>
          : <span className={`badge ${ev.level}`} style={{ flex: "none" }}>{levelText[ev.level]}</span>}
      </div>
      <div className="muted">
        {new Date(ev.at).toLocaleTimeString()} · {ago(ev.at, now)}
        {ev.via && ` · ${ev.via === "whatsapp" ? "WhatsApp" : ev.via === "sms" ? "SMS" : "web page"}`}
      </div>
      {ev.note && <p className="note">{ev.note}</p>}
      <div className="pair">
        <span>Original</span><span>{ev.original}</span>
        {ev.kind === "text" && (<><span>Translation</span><span>{ev.translation || "—"}</span></>)}
        {ev.weightKg !== undefined && (<><span>Weight read</span><span>{ev.weightKg.toLocaleString("en-US")} kg</span></>)}
      </div>
      {ev.photo && <img src={ev.photo} alt="Slip" />}
      {ev.level !== "ok" && !ev.handled && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="wa" disabled={remindBusy} onClick={() => remind(ev.id)}>Remind driver</button>
          <button className="secondary" onClick={() => markHandled(ev.id)}>Mark as handled</button>
        </div>
      )}
    </div>
  );

  return (
    <Shell className={embedded ? "embed" : undefined}>
      {!embedded && <Brand />}

      {!embedded && (
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="secondary" onClick={onBack}>← All trucks</button>
          <button
            className={confirmRemove ? "danger" : "secondary"}
            onClick={() => {
              if (!confirmRemove) {
                setConfirmRemove(true);
                setTimeout(() => setConfirmRemove(false), 4000); // changed your mind? it goes back by itself
                return;
              }
              removing.current = true;
              onRemove();
            }}
          >{confirmRemove ? "Tap again to remove" : "Remove"}</button>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: "1.2rem" }}>{trip.truck}</strong>
        <div className="muted">{trip.driver} · {trip.material} · {trip.expectedKg.toLocaleString("en-US")} kg expected</div>
      </div>

      <div className="steps">
        {STATUSES.map((s, i) => (
          <div key={s} className={`step ${i <= stage ? "done" : ""} ${i === stage ? "current" : ""}`}><i />{s}</div>
        ))}
      </div>

      <div className="stats">
        <div className={`stat ${silent > 0 ? "alert" : ""}`}><b>{last ? ago(last.at, now) : "None yet"}</b><span>Last update</span></div>
        <div className={`stat ${open > 0 ? "alert" : ""}`}><b>{open}</b><span>Need your decision</span></div>
        <div className="stat">
          <b>{route ? `${route.distanceKm} km` : `${trip.expectedKg.toLocaleString("en-US")} kg`}</b>
          <span>{route ? `About ${duration(route.durationMin)}` : "Expected load"}</span>
        </div>
      </div>

      {silent > 0 && (
        <div className="banner danger">
          <strong>No news from the driver for {duration(silent)}.</strong>
          <div style={{ margin: "4px 0 10px" }}>Call them, or send a reminder in {LANGUAGE_NAMES[trip.language]}.</div>
          <button className="wa wide" type="button" disabled={remindBusy} onClick={() => remind()}>Remind driver</button>
        </div>
      )}

      {silent <= 0 && stage < 3 && (
        <button className="wa wide" type="button" style={{ marginBottom: 12 }} disabled={remindBusy} onClick={() => remind()}>
          Remind driver on WhatsApp
        </button>
      )}

      {remindNote && <div className="banner">{remindNote}</div>}

      {invite?.sent && (
        <div className="banner good">
          Driver messaged on {invite.results.filter((r) => r.sent).map((r) => r.via).join(" and ")} (number ending {trip.phoneHint}).
          {invite.results.some((r) => !r.sent) && ` ${invite.results.filter((r) => !r.sent).map((r) => r.error).join(". ")}.`}
          {" "}They choose their language by replying.
        </div>
      )}
      {invite && !invite.sent && (
        <div className="banner">
          {invite.configured
            ? `The driver could not be messaged (${invite.results.map((r) => r.error).join(". ")}). `
            : "Messaging is not connected yet, so nothing was sent automatically. "}
          WhatsApp opens with the driver link ready for you to send.
        </div>
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

      {embedded ? (
        <>
          <h2>Timeline</h2>
          {events.length === 0 && <p className="muted">Waiting for the driver.</p>}
          <div className="timeline">{events.map(eventCard)}</div>
        </>
      ) : (
        <>
          {needsYou.length > 0 && (
            <>
              <h2>Needs your attention</h2>
              {needsYou.map(eventCard)}
            </>
          )}

          <div className="card">
            <strong>Driver link</strong>
            <div className="linkbox">{link}</div>
            <div className="btns">
              <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button className="wa wide" type="button">Send on WhatsApp</button>
              </a>
              <a href={`sms:${normalizePhone(phone) ?? ""}?body=${encodeURIComponent(message)}`} style={{ textDecoration: "none" }}>
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
        </>
      )}
    </Shell>
  );
}
