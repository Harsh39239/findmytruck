"use client";

import { useCallback, useEffect, useState } from "react";
import { STATUSES, openCount, routeProgress, silentFor, stageIndex } from "@/lib/rules";
import { SILENT_OPTIONS, parseTripCode } from "@/lib/fleet";
import type { TripSummary } from "@/lib/store";
import { Brand, Icon, Skeleton, ago, duration } from "./ui";

type Props = {
  ids: string[];
  demoSpeed: boolean;
  setDemoSpeed: (on: boolean) => void;
  silentMin: number;
  setSilentMin: (min: number) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onAdd: (id: string) => void;
  onMissing: (ids: string[]) => void;
};

type Filter = "all" | "need" | "road" | "done";

export default function FleetView({ ids, demoSpeed, setDemoSpeed, silentMin, setSilentMin, onOpen, onNew, onAdd, onMissing }: Props) {
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [now, setNow] = useState(0);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [settings, setSettings] = useState(false);

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
  const silentOf = (t: TripSummary) => silentFor(t.events, t.createdAt, stageIndex(t.events), now, silentMin);
  const needs = (t: TripSummary) => openCount(t.events) > 0 || silentOf(t) > 0;
  const stageOf = (t: TripSummary) => stageIndex(t.events);

  // Trucks that need you (a decision to make, or a driver gone quiet) come first, delivered ones last.
  const sorted = [...(trips ?? [])].sort((a, b) => {
    const rank = (t: TripSummary) => (needs(t) ? 0 : stageOf(t) >= 3 ? 2 : 1);
    const lastAt = (t: TripSummary) => t.events[t.events.length - 1]?.at ?? t.createdAt;
    return rank(a) - rank(b) || lastAt(b) - lastAt(a);
  });
  const counts = {
    all: sorted.length,
    need: sorted.filter(needs).length,
    road: sorted.filter((t) => stageOf(t) >= 2 && stageOf(t) < 3).length,
    done: sorted.filter((t) => stageOf(t) >= 3).length,
  };
  const shown = sorted.filter((t) =>
    filter === "all" ? true : filter === "need" ? needs(t) : filter === "road" ? stageOf(t) >= 2 && stageOf(t) < 3 : stageOf(t) >= 3,
  );
  const tabs: [Filter, string][] = [["all", "All"], ["need", "Need you"], ["road", "On the road"], ["done", "Done"]];

  return (
    <main>
      <Brand
        right={
          <button className="iconbtn" type="button" onClick={() => setSettings((s) => !s)} aria-label="Settings" aria-expanded={settings}>
            <Icon name="clock" size={18} />
          </button>
        }
      />

      {settings && (
        <div className="card settings">
          <div className="row">
            <span className="muted" style={{ flex: 2 }}>Mark a driver silent after</span>
            <select value={silentMin} onChange={(e) => setSilentMin(Number(e.target.value))} aria-label="Silent driver time" style={{ flex: 1.4 }}>
              {SILENT_OPTIONS.map((o) => <option key={o.min} value={o.min}>{o.label}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted" style={{ flex: 2 }}>Lorry speed on maps</span>
            <select value={demoSpeed ? "demo" : "real"} onChange={(e) => setDemoSpeed(e.target.value === "demo")} aria-label="Lorry speed" style={{ flex: 1.4 }}>
              <option value="demo">Demo (60x)</option>
              <option value="real">Real time</option>
            </select>
          </div>
        </div>
      )}

      <button className="wide newtrip" onClick={onNew}>+ New trip</button>

      <div className="stats">
        <div className="stat"><b>{trips ? counts.all : "…"}</b><span>Trucks</span></div>
        <div className={`stat ${counts.need > 0 ? "alert" : ""}`}><b>{trips ? counts.need : "…"}</b><span>Need you</span></div>
        <div className="stat good"><b>{trips ? counts.road : "…"}</b><span>On the road</span></div>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter trucks">
        {tabs.map(([f, label]) => (
          <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {label} <span>{counts[f]}</span>
          </button>
        ))}
      </div>

      {!trips && <Skeleton rows={3} />}
      {trips && sorted.length === 0 && <p className="muted">None of your trucks could be loaded yet. They may have expired.</p>}
      {trips && sorted.length > 0 && shown.length === 0 && <div className="empty"><Icon name="check" size={28} /><b>Nothing here</b><span>No trucks match this filter.</span></div>}

      {shown.map((t) => {
        const open = openCount(t.events);
        const stage = stageOf(t);
        const last = t.events[t.events.length - 1];
        const progress = t.route ? routeProgress(t.events, t.route.durationMin, speed, now) : 0;
        const silent = silentOf(t);
        const onRoad = stage === 2;
        const status =
          stage < 0 ? "Not started"
          : stage >= 3 ? "Delivered"
          : onRoad ? `On the road${t.route ? `, ${Math.round(progress * 100)}%` : ""}`
          : stage === 1 ? "Loaded" : "At pickup";
        const chip = stage >= 3 ? "done" : onRoad ? "onroad" : stage < 0 ? "idle" : "start";
        return (
          <button key={t.id} className={`fleetcard ${silent > 0 ? "silent" : open > 0 ? "attn" : ""}`} onClick={() => onOpen(t.id)}>
            <div className="fc-top">
              <span className={`avatar ${chip}`}>{(t.driver || t.truck).trim().charAt(0).toUpperCase()}</span>
              <div className="fc-title">
                <strong>{t.truck}</strong>
                <span className="muted">{t.driver} · {t.material}</span>
              </div>
              <span className="fc-badges">
                {silent > 0 && <span className="badge flag pulse">SILENT</span>}
                {open > 0 && <span className="badge flag">{open} NEED{open === 1 ? "S" : ""} YOU</span>}
              </span>
            </div>
            {t.route && (
              <div className="fc-route"><Icon name="pin" size={14} /> {t.route.from} → {t.route.to} <span className="muted">· {t.route.distanceKm} km · {duration(t.route.durationMin)}</span></div>
            )}
            <div className="steps mini">
              {STATUSES.map((s, i) => <div key={s} className={`step ${i <= stage ? "done" : ""}`}><i /></div>)}
            </div>
            {t.route && onRoad && (
              <div className="roadbar"><div className="roadfill" style={{ width: `${Math.round(progress * 100)}%` }} /><span className="roadlorry" style={{ left: `${Math.round(progress * 100)}%` }}><Icon name="truck" size={18} /></span></div>
            )}
            <div className="fc-foot">
              <span className={`chip ${chip}`}>{status}</span>
              <span className={silent > 0 ? "silenttext" : "muted"}>
                {silent > 0 ? `No news for ${duration(silent)}` : last ? ago(last.at, now) : "no update yet"}
              </span>
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
