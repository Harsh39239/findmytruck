"use client";
/* eslint-disable @next/next/no-img-element -- slip photos are small data URLs */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildRoute } from "@/lib/geo";
import { languageMenu } from "@/lib/chat";
import type { RouteInfo } from "@/lib/store";
import TripDetail from "../trip-detail";

// The presentation page: the driver's WhatsApp on one side, the manager's live screen on the other.
// It runs the real code (the same chat rules, the same AI reading the slip), with no phone or Twilio account.
// The story plays in Hindi by default, and the view can show just the driver, just the manager, or both.

const TRUCK = "MH12 AB 1234";
const noop = () => {};

type Message = { from: "driver" | "bot"; text?: string; photo?: string };
type Step = { say?: string; photo?: boolean; remind?: boolean; note: string; after: number };
type View = "both" | "driver" | "manager";

// What the driver types to pick each language from the first message, and one problem report in that language.
const DEMO_LANGS = [
  { code: "hi", name: "Hindi", pick: "1", problem: "रास्ते में टायर पंक्चर हो गया" },
  { code: "ta", name: "Tamil", pick: "2", problem: "வழியில் டயர் பஞ்சர் ஆகிவிட்டது" },
  { code: "ml", name: "Malayalam", pick: "3", problem: "വഴിയിൽ ടയർ പഞ്ചറായി" },
  { code: "en", name: "English", pick: "4", problem: "Tyre punctured on the way" },
] as const;

function buildScript(lang: (typeof DEMO_LANGS)[number]): Step[] {
  return [
    { say: lang.pick, note: `The driver picks ${lang.name} from the first message`, after: 3500 },
    { say: "1", note: "Reports that the truck reached the pickup", after: 3500 },
    { photo: true, note: "Photographs the weighment slip: AI reads it, rules check it", after: 5000 },
    { say: "3", note: "Leaves the yard: the lorry starts moving on the map", after: 11000 },
    { say: lang.problem, note: `Reports a problem in ${lang.name}: AI translates it, it lands in Review`, after: 6000 },
    { remind: true, note: `The manager taps Remind driver: the driver is nudged in ${lang.name}`, after: 6000 },
    { say: "4", note: "Delivers the load", after: 0 },
  ];
}

// If the route service is slow or offline (conference wifi), fall back to a plain line from Pune to Mumbai.
function fallbackRoute(): RouteInfo {
  const a: [number, number] = [18.5204, 73.8567];
  const b: [number, number] = [19.076, 72.8777];
  const points = Array.from({ length: 60 }, (_, i) => {
    const t = i / 59;
    return [a[0] + (b[0] - a[0]) * t + Math.sin(t * Math.PI) * 0.12, a[1] + (b[1] - a[1]) * t] as [number, number];
  });
  return { from: "Pune", to: "Mumbai", points, distanceKm: 149, durationMin: 119 };
}

async function demoRoute(): Promise<RouteInfo> {
  try {
    return await Promise.race([
      buildRoute("Pune", "Mumbai"),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 7000)),
    ]);
  } catch {
    return fallbackRoute();
  }
}

// A drawn weighment slip, so the demo needs no files. "blurry" shows what happens with a bad photo.
function slipPhoto(kg: number, blurry = false) {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 560;
  const x = c.getContext("2d")!;
  x.fillStyle = "#f4f1e8";
  x.fillRect(0, 0, 900, 560);
  x.fillStyle = "#1b1b1b";
  x.font = "bold 40px monospace";
  x.fillText("SHREE WEIGHBRIDGE", 170, 80);
  x.font = "30px monospace";
  x.fillText("Ticket No: 20481", 100, 160);
  x.fillText(`Vehicle: ${TRUCK}`, 100, 210);
  x.fillText(`Gross: ${kg + 9200} kg`, 100, 290);
  x.fillText("Tare : 9200 kg", 100, 340);
  x.font = "bold 46px monospace";
  x.fillText(`NET WT: ${kg} kg`, 100, 450);
  if (!blurry) return c.toDataURL("image/jpeg", 0.7);
  const d = document.createElement("canvas");
  d.width = 900;
  d.height = 560;
  const y = d.getContext("2d")!;
  y.filter = "blur(12px)";
  y.drawImage(c, 0, 0);
  return d.toDataURL("image/jpeg", 0.7);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function DemoClient() {
  const [tripId, setTripId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("both");
  const [langCode, setLangCode] = useState<(typeof DEMO_LANGS)[number]["code"]>("hi");
  const [shutter, setShutter] = useState<string | null>(null); // the slip as the driver's camera sees it, just before it is sent
  const stop = useRef(false);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, view]);

  // A fresh trip, and the first message the driver would receive on WhatsApp and SMS.
  async function restart(): Promise<string | null> {
    setError("");
    setNote("");
    setMessages([]);
    setTripId(null);
    setShutter(null);
    try {
      const route = await demoRoute();
      const res = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truck: TRUCK, driver: "Ramesh", material: "Steel coils", expectedKg: 18500, language: "auto", route }),
      });
      const trip = await res.json();
      if (!res.ok) throw new Error(trip.error ?? "Could not start the demo");
      setTripId(trip.id);
      setMessages([{ from: "bot", text: languageMenu(TRUCK) }]);
      return trip.id as string;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  useEffect(() => {
    const first = setTimeout(() => { restart(); }, 0);
    return () => clearTimeout(first);
  }, []);

  async function sendAsDriver(id: string, msg: { text?: string; photo?: string }) {
    setMessages((cur) => [...cur, { from: "driver", text: msg.text, photo: msg.photo }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: id, text: msg.text ?? "", photo: msg.photo, via: "whatsapp" }),
      });
      const data = await res.json();
      setMessages((cur) => [...cur, { from: "bot", text: res.ok ? data.reply : data.error ?? "Something went wrong" }]);
    } catch {
      setMessages((cur) => [...cur, { from: "bot", text: "No connection. Try again." }]);
    }
    setBusy(false);
  }

  // The driver holds the phone over the slip, then the photo is sent.
  async function takeSlipPhoto(id: string) {
    const photo = slipPhoto(18450);
    setShutter(photo);
    await sleep(1800);
    setShutter(null);
    await sendAsDriver(id, { photo });
  }

  // What "Remind driver" does on the manager screen: the nudge shows up on the driver phone.
  async function remindDriver(id: string) {
    try {
      const res = await fetch("/api/remind", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId: id, simulate: true }) });
      const data = await res.json();
      if (res.ok) setMessages((cur) => [...cur, { from: "bot", text: data.message }]);
    } catch {}
  }

  async function play() {
    if (playing) return;
    setPlaying(true);
    stop.current = false;
    const lang = DEMO_LANGS.find((l) => l.code === langCode) ?? DEMO_LANGS[0];
    const script = buildScript(lang);
    const id = await restart();
    if (id) {
      await sleep(2500); // let the first message sink in
      for (let i = 0; i < script.length && !stop.current; i++) {
        const s = script[i];
        setNote(`Step ${i + 1} of ${script.length}: ${s.note}`);
        if (s.remind) await remindDriver(id);
        else if (s.photo) await takeSlipPhoto(id);
        else await sendAsDriver(id, { text: s.say });
        if (s.after) await sleep(s.after);
      }
      if (!stop.current) setNote("Done. Every reply updated the manager's screen by itself.");
    }
    setPlaying(false);
  }

  function halt() {
    stop.current = true;
    setNote("Stopped. You can keep replying by hand.");
  }

  const send = (m: { text?: string; photo?: string }) => { if (tripId && !busy) sendAsDriver(tripId, m); };
  const views: [View, string][] = [["both", "Both"], ["driver", "Driver's side"], ["manager", "Manager's side"]];

  return (
    <div className="demo">
      <header className="demohead">
        <Link href="/" className="navbrand"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6h13v10H1zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" fill="#1f5eff" /><circle cx="18" cy="18" r="2" fill="#1f5eff" /></svg></span><span>FindMyTruck live demo</span></Link>
        <div className="row" style={{ flex: "none", gap: 8, flexWrap: "wrap" }}>
          <select value={langCode} onChange={(e) => setLangCode(e.target.value as typeof langCode)} disabled={playing} aria-label="Driver's language in the demo" style={{ width: "auto" }}>
            {DEMO_LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          {playing
            ? <button className="secondary" onClick={halt}>Stop</button>
            : <button onClick={play} disabled={!!error && !tripId}>Play the demo</button>}
          <button className="secondary" onClick={() => { stop.current = true; setPlaying(false); restart(); }}>Restart</button>
          <Link href="/driver" className="hint" style={{ alignSelf: "center" }}>Driver practice</Link>
        </div>
      </header>

      <div className="seg" role="tablist" aria-label="What to show">
        {views.map(([v, label]) => (
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{label}</button>
        ))}
      </div>

      {note && <div className={`demonote ${view === "driver" ? "big" : ""}`}>{note}</div>}
      {error && <div className="banner danger">{error}</div>}

      <div className={`demogrid view-${view}`}>
        {view !== "manager" && (
          <section>
            <h2>{view === "driver" ? "What the driver sees: just WhatsApp or SMS, no app and no login" : "The driver's phone (WhatsApp)"}</h2>
            <div className="wa">
              <div className="wa-top"><span className="wa-avatar">F</span><div><b>FindMyTruck</b><small>{busy ? "typing..." : "online"}</small></div></div>
              <div className="wa-log" ref={log}>
                {messages.map((m, i) => (
                  <div key={i} className={`wa-msg ${m.from === "driver" ? "out" : "in"}`}>
                    {m.photo && <img src={m.photo} alt="Weighment slip sent by the driver" />}
                    {m.text}
                  </div>
                ))}
                {busy && <div className="wa-msg in typing">...</div>}
              </div>
              {shutter && (
                <div className="wa-camera" aria-live="polite">
                  <img src={shutter} alt="The weighment slip in the driver's camera" />
                  <span>Photographing the weighment slip...</span>
                </div>
              )}
              <div className="wa-chips">
                {["1", "2", "3", "4", "0"].map((n) => <button key={n} type="button" disabled={busy || playing || !tripId} onClick={() => send({ text: n })}>{n}</button>)}
                <button type="button" disabled={busy || playing || !tripId} onClick={() => send({ photo: slipPhoto(18450) })}>Slip photo</button>
                <button type="button" disabled={busy || playing || !tripId} onClick={() => send({ photo: slipPhoto(18450, true) })}>Blurry photo</button>
              </div>
              <form className="wa-input" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send({ text }); setText(""); } }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" disabled={playing || !tripId} />
                <button type="submit" disabled={busy || playing || !text.trim() || !tripId}>Send</button>
              </form>
            </div>
            <p className="hint">Number keys follow the menu. After a language is chosen: 1 Reached, 2 Loaded, 3 Left, 4 Delivered, 0 changes the language.</p>
          </section>
        )}

        {view !== "driver" && (
          <section>
            <h2>The manager&apos;s screen (updates by itself)</h2>
            {tripId
              ? <TripDetail key={tripId} tripId={tripId} created={null} demoSpeed setDemoSpeed={noop} silentMin={120} onBack={noop} onRemove={noop} onFound={noop} embedded onRemind={(t) => setMessages((cur) => [...cur, { from: "bot", text: t }])} />
              : <p className="muted">Starting the demo...</p>}
          </section>
        )}
      </div>
    </div>
  );
}
