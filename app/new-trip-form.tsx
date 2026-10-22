"use client";

import { useState } from "react";
import { buildRoute } from "@/lib/geo";
import { normalizePhone } from "@/lib/rules";
import type { RouteInfo, Trip } from "@/lib/store";
import { Brand } from "./ui";

export type Invite = { configured: boolean; sent: boolean; results: { via: string; sent: boolean; error?: string }[] };
export type Created = { trip: Trip; invite: Invite | null; phone: string; routeNote: string };

export default function NewTripForm({ onCreated, onCancel }: { onCreated: (c: Created) => void; onCancel?: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function createTrip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form) as Record<string, string>;
    const from = (values.from ?? "").trim();
    const to = (values.to ?? "").trim();
    if ((from && !to) || (!from && to)) return setError("Enter both the pickup place and the drop place, or leave both empty.");
    if (values.phone?.trim() && !normalizePhone(values.phone)) return setError("Enter a valid phone number, for example 98765 43210");

    let route: RouteInfo | undefined;
    let routeNote = "";
    if (from && to) {
      setBusy("Finding the road route...");
      try {
        route = await buildRoute(from, to);
      } catch (err) {
        routeNote = `${(err as Error).message}. The trip was created without a map.`;
      }
    }
    setBusy("Creating trip...");
    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, language: "auto", route }), // the driver picks their language by replying
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) return setError(data.error ?? "Something went wrong");
    onCreated({ trip: data, invite: data.invite ?? null, phone: values.phone ?? "", routeNote });
  }

  return (
    <main>
      <Brand />
      {onCancel && <p><button className="secondary" type="button" onClick={onCancel}>← All trucks</button></p>}
      <form className="card" onSubmit={createTrip}>
        <strong>New trip</strong>
        <p className="muted" style={{ margin: "2px 0 0" }}>The driver is messaged on their phone as soon as you create it. Their replies update this screen.</p>

        <div className="grid2">
          <div><label>Truck number</label><input name="truck" placeholder="MH12 AB 1234" /></div>
          <div><label>Driver name</label><input name="driver" placeholder="Ramesh" /></div>
        </div>
        <label>Driver&apos;s mobile number (WhatsApp and SMS)</label>
        <input name="phone" type="tel" inputMode="tel" placeholder="98765 43210" />
        <div className="hint">
          10-digit Indian number, or +country code. The driver is messaged on WhatsApp and SMS in all four languages and
          picks theirs by replying. The number is used only to message this driver.
        </div>
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
        <p><button className="wide" type="submit" disabled={!!busy}>{busy || "Create trip and message the driver"}</button></p>
      </form>
    </main>
  );
}
