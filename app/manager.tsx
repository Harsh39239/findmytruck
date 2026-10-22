"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readAutoMin, readDemoSpeed, readIds, readSendMode, readSilentMin,
  writeAutoMin, writeDemoSpeed, writeIds, writeSendMode, writeSilentMin, type SendMode,
} from "@/lib/fleet";
import { autoRemindDue, stageIndex } from "@/lib/rules";
import type { TripSummary } from "@/lib/store";
import FleetView from "./fleet-view";
import NewTripForm, { type Created } from "./new-trip-form";
import SettingsView from "./settings-view";
import TripDetail from "./trip-detail";
import { Brand } from "./ui";

// Screens, chosen by the part of the address after "#":  "#/" = all trucks, "#/new" = new trip form,
// "#/settings" = settings, "#/trip/<code>" = one truck. That also makes every truck linkable.
function screenFromHash() {
  const h = window.location.hash;
  const m = h.match(/^#\/trip\/([a-z0-9]+)$/i);
  if (m) return `trip:${m[1].toLowerCase()}`;
  if (h === "#/settings") return "settings";
  return h === "#/new" ? "new" : "fleet";
}

export default function ManagerPage() {
  const [screen, setScreen] = useState<string | null>(null); // null until we have read the address and saved list
  const [ids, setIds] = useState<string[]>([]);
  const [demoSpeed, setDemo] = useState(true);
  const [silentMin, setSilent] = useState(60);
  const [autoMin, setAuto] = useState(60);
  const [sendMode, setSend] = useState<SendMode>("demo");
  const [created, setCreated] = useState<Created | null>(null);
  const removed = useRef(new Set<string>()); // trucks the manager removed in this visit: a page still loading must not re-add them

  useEffect(() => {
    const start = setTimeout(() => {
      setIds(readIds());
      setDemo(readDemoSpeed());
      setSilent(readSilentMin());
      setAuto(readAutoMin());
      setSend(readSendMode());
      setScreen(screenFromHash());
    }, 0);
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener("hashchange", onHash);
    return () => { clearTimeout(start); window.removeEventListener("hashchange", onHash); };
  }, []);

  // Automatic reminders: while the app is open, a driver who has been quiet for the chosen time is reminded on
  // WhatsApp, and again each time that time passes. The server double-checks that a reminder is really due.
  useEffect(() => {
    if (!autoMin || ids.length === 0) return;
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        const res = await fetch(`/api/trips?ids=${ids.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          for (const t of data.trips as TripSummary[]) {
            if (!autoRemindDue(t.events, t.createdAt, stageIndex(t.events), Date.now(), autoMin)) continue;
            await fetch("/api/remind", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId: t.id, auto: true, afterMin: autoMin, demo: sendMode === "demo" }),
            });
          }
        }
      } catch {
        // Offline for a moment: try again next minute.
      }
      running = false;
    };
    const first = setTimeout(run, 5000);
    const timer = setInterval(run, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [ids, autoMin, sendMode]);

  const go = (hash: string) => { window.location.hash = hash; };

  // `chosen` is true when the manager adds the truck on purpose (new trip, or by code). Otherwise it is the app
  // noticing a truck it has just loaded, which must not bring back one that was just removed.
  const addId = useCallback((id: string, chosen = false) => {
    if (chosen) removed.current.delete(id);
    else if (removed.current.has(id)) return;
    setIds((cur) => {
      if (cur.includes(id)) return cur;
      const next = [...cur, id];
      writeIds(next);
      return next;
    });
  }, []);

  const removeIds = useCallback((drop: string[]) => {
    drop.forEach((id) => removed.current.add(id));
    setIds((cur) => {
      const next = cur.filter((id) => !drop.includes(id));
      writeIds(next);
      return next;
    });
  }, []);

  function setDemoSpeed(on: boolean) {
    setDemo(on);
    writeDemoSpeed(on);
  }

  function setSendMode(mode: SendMode) {
    setSend(mode);
    writeSendMode(mode);
  }

  function setSilentMin(min: number) {
    setSilent(min);
    writeSilentMin(min);
  }

  function setAutoMin(min: number) {
    setAuto(min);
    writeAutoMin(min);
  }

  if (screen === null) return <main><Brand /><p className="muted">Loading...</p></main>;

  if (screen.startsWith("trip:")) {
    const id = screen.slice(5);
    return (
      <TripDetail
        key={id}
        tripId={id}
        created={created}
        demoSpeed={demoSpeed}
        setDemoSpeed={setDemoSpeed}
        silentMin={silentMin}
        sendMode={sendMode}
        onBack={() => go("#/")}
        onRemove={() => { removeIds([id]); go("#/"); }}
        onFound={() => addId(id)}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsView
        autoMin={autoMin}
        setAutoMin={setAutoMin}
        silentMin={silentMin}
        setSilentMin={setSilentMin}
        sendMode={sendMode}
        setSendMode={setSendMode}
        demoSpeed={demoSpeed}
        setDemoSpeed={setDemoSpeed}
        onBack={() => go("#/")}
      />
    );
  }

  // First visit (no trucks yet) goes straight to the form.
  if (screen === "new" || ids.length === 0) {
    return (
      <NewTripForm
        onCancel={ids.length > 0 ? () => go("#/") : undefined}
        onCreated={(c) => { setCreated(c); addId(c.trip.id, true); go(`#/trip/${c.trip.id}`); }}
      />
    );
  }

  return (
    <FleetView
      ids={ids}
      demoSpeed={demoSpeed}
      silentMin={silentMin}
      sendMode={sendMode}
      onSettings={() => go("#/settings")}
      onOpen={(id) => go(`#/trip/${id}`)}
      onNew={() => go("#/new")}
      onAdd={(id) => { addId(id, true); go(`#/trip/${id}`); }}
      onMissing={removeIds}
    />
  );
}
