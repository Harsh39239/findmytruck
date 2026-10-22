"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, openCount, routeProgress, stageIndex } from "@/lib/rules";
import { parseTripCode } from "@/lib/fleet";
import type { TripSummary } from "@/lib/store";
import { Brand, ago } from "./ui";

type Props = {
  ids: string[];
  demoSpeed: boolean;
  setDemoSpeed: (on: boolean) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onAdd: (id: string) => void;
  onMissing: (ids: string[]) => void;
};

function LorryMini() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 6h13v10H1zM14 9h4l4 4v3h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
    </svg>
  );
}

export default function FleetView({ ids, demoSpeed, setDemoSpeed, onOpen, onNew, onAdd, onMissing }: Props) {
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [now, setNow] = useState(0);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const key = ids.join(",");
  const load = useCallback(async () => {
    if (!key) return setTrips([]);
    try {
      const res = await fetch(`/api/trips?ids=${key}`);
      if (!res.ok) return;
      const data = await res.json();
      setTrips(data.trips);
      if (data.missing?.length) onMissing(data.missing);
    } catch {
      // Offline for a moment: keep the list we already have.
    }
  }, [key, onMissing]);

  useEffect(() => {
    const tick = () => { setNow(Date.now()); load(); };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 3000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [load]);

  function addByCode(e: React.FormEvent) {
    e.preventDefault();
    const id = parseTripCode(code);
    if (!id) return setCodeError("Paste the driver link or the 8-character trip code.");
    setCodeError("");
    setCode("");
    onAdd(id);
  }

  const speed = demoSpeed ? 60 : 1;
  const sorted = [...(trips ?? [])].sort((a, b) => {
    const rank = (t: TripSummary) => (openCount(t.events) > 0 ? 0 : stageIndex(t.events) >= 3 ? 2 : 1);
    const lastAt = (t: TripSummary) => t.events[t.events.length - 1]?.at ?? t.createdAt;
    return rank(a) - rank(b) || lastAt(b) - lastAt(a);
  });
  const needDecision = sorted.filter((t) => openCount(t.events) > 0).length;
  const onRoad = sorted.filter((t) => { const s = stageIndex(t.events); return s >= 2 && s < 3; }).length;

  return (
    <main>
      <Brand />

      <div className="row" style={{ marginBottom: 12 }}>
        <button className="wide" onClick={onNew}>+ New trip</button>
        <select value={demoSpeed ? "demo" : "real"} onChange={(e) => setDemoSpeed(e.target.value === "demo")} aria-label="Lorry speed">
          <option value="demo">Demo speed (60x)</option>
          <option value="real">Real time</option>
        </select>
      </div>

      <div className="stats">
        <div className="stat"><b>{trips ? sorted.length : "…"}</b><span>Trucks</span></div>
        <div className={`stat ${needDecision > 0 ? "alert" : ""}`}><b>{trips ? needDecision : "…"}</b><span>Need you</span></div>
        <div className="stat"><b>{trips ? onRoad : "…"}</b><span>On the road</span></div>
      </div>

      {trips && sorted.length === 0 && <p className="muted">None of your trucks could be loaded yet. They may have expired.</p>}

      {sorted.map((t) => {
        const open = openCount(t.events);
        const stage = stageIndex(t.events);
        const last = t.events[t.events.length - 1];
        const progress = t.route ? routeProgress(t.events, t.route.durationMin, speed, now) : 0;
        const status =
          stage < 0 ? "Not started"
          : stage >= 3 ? "Delivered"
          : stage === 2 ? `On the road${t.route ? `, ${Math.round(progress * 100)}%` : ""}`
          : stage === 1 ? "Loaded" : "Reached pickup";
        return (
          <button key={t.id} className="fleetcard" onClick={() => onOpen(t.id)}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{t.truck}</strong>
              {open > 0
                ? <span className="badge flag" style={{ flex: "none" }}>{open} NEED{open === 1 ? "S" : ""} YOU</span>
                : stage >= 3 ? <span className="badge ok" style={{ flex: "none" }}>DONE</span> : null}
            </div>
            <div className="muted">{t.driver} · {t.material}{t.route ? ` · ${t.route.from} → ${t.route.to}` : ""}</div>
            <div className="steps mini">
              {STATUSES.map((s, i) => <div key={s} className={`step ${i <= stage ? "done" : ""}`}><i /></div>)}
            </div>
            {t.route && stage >= 2 && stage < 3 && (
              <div className="roadbar"><div className="roadfill" style={{ width: `${Math.round(progress * 100)}%` }} /><span className="roadlorry" style={{ left: `${Math.round(progress * 100)}%` }}><LorryMini /></span></div>
            )}
            <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
              <span className="muted"><b>{status}</b></span>
              <span className="muted" style={{ textAlign: "right" }}>{last ? ago(last.at, now) : "no update yet"}</span>
            </div>
          </button>
        );
      })}

      <form className="card" onSubmit={addByCode} style={{ marginTop: 16 }}>
        <strong>Add a truck by code</strong>
        <div className="hint">Paste a driver link or the 8-character trip code to follow a trip made on another device.</div>
        <div className="row" style={{ marginTop: 8 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 8e95dc1b" style={{ flex: 3 }} />
          <button className="secondary" type="submit" style={{ flex: 1 }}>Add</button>
        </div>
        {codeError && <p className="error">{codeError}</p>}
      </form>
    </main>
  );
}
