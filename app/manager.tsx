"use client";

import { useCallback, useEffect, useState } from "react";
import { readDemoSpeed, readIds, readSendMode, readSilentMin, writeDemoSpeed, writeIds, writeSendMode, writeSilentMin, type SendMode } from "@/lib/fleet";
import FleetView from "./fleet-view";
import NewTripForm, { type Created } from "./new-trip-form";
import TripDetail from "./trip-detail";
import { Brand } from "./ui";

// Three screens, chosen by the part of the address after "#":  "#/" = all trucks,
// "#/new" = new trip form, "#/trip/<code>" = one truck. That also makes every truck linkable.
function screenFromHash() {
  const h = window.location.hash;
  const m = h.match(/^#\/trip\/([a-z0-9]+)$/i);
  if (m) return `trip:${m[1].toLowerCase()}`;
  return h === "#/new" ? "new" : "fleet";
}

export default function ManagerPage() {
  const [screen, setScreen] = useState<string | null>(null); // null until we have read the address and saved list
  const [ids, setIds] = useState<string[]>([]);
  const [demoSpeed, setDemo] = useState(true);
  const [silentMin, setSilent] = useState(30);
  const [sendMode, setSend] = useState<SendMode>("demo");
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    const start = setTimeout(() => {
      setIds(readIds());
      setDemo(readDemoSpeed());
      setSilent(readSilentMin());
      setSend(readSendMode());
      setScreen(screenFromHash());
    }, 0);
    const onHash = () => setScreen(screenFromHash());
    window.addEventListener("hashchange", onHash);
    return () => { clearTimeout(start); window.removeEventListener("hashchange", onHash); };
  }, []);

  const go = (hash: string) => { window.location.hash = hash; };

  const addId = useCallback((id: string) => {
    setIds((cur) => {
      if (cur.includes(id)) return cur;
      const next = [...cur, id];
      writeIds(next);
      return next;
    });
  }, []);

  const removeIds = useCallback((drop: string[]) => {
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

  // First visit (no trucks yet) goes straight to the form.
  if (screen === "new" || ids.length === 0) {
    return (
      <NewTripForm
        onCancel={ids.length > 0 ? () => go("#/") : undefined}
        onCreated={(c) => { setCreated(c); addId(c.trip.id); go(`#/trip/${c.trip.id}`); }}
      />
    );
  }

  return (
    <FleetView
      ids={ids}
      demoSpeed={demoSpeed}
      setDemoSpeed={setDemoSpeed}
      silentMin={silentMin}
      setSilentMin={setSilentMin}
      sendMode={sendMode}
      setSendMode={setSendMode}
      onOpen={(id) => go(`#/trip/${id}`)}
      onNew={() => go("#/new")}
      onAdd={(id) => { addId(id); go(`#/trip/${id}`); }}
      onMissing={removeIds}
    />
  );
}
