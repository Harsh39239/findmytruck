"use client";

import { useState } from "react";
import { buildRoute } from "@/lib/geo";
import { LABELS, LANGUAGES } from "@/lib/labels";
import { normalizePhone } from "@/lib/rules";
import type { Language, RouteInfo, Trip } from "@/lib/store";
import { Brand } from "./ui";

export type Invite = { sent: boolean; via?: string; error?: string };
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

    // Open the WhatsApp tab right now (while the click still counts), and fill it in once the trip exists.
    const toPhone = normalizePhone(values.phone ?? "");
    const chat = toPhone ? window.open("", "_blank") : null;
    chat?.document.write("Opening WhatsApp...");

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
    onCreated({ trip: data, invite: data.invite ?? null, phone: values.phone ?? "", routeNote });
  }

  return (
    <main>
      <Brand />
      {onCancel && <p><button className="secondary" type="button" onClick={onCancel}>← All trucks</button></p>}
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
