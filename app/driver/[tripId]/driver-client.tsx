"use client";

import { useEffect, useState } from "react";
import { LABELS } from "@/lib/labels";
import { STATUSES } from "@/lib/rules";
import type { Trip } from "@/lib/store";

// Shrink the photo on the phone so it uploads fast and fits the size limit.
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Could not open this photo"));
    img.src = url;
  });
}

export default function DriverClient({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [missing, setMissing] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/trip?id=${tripId}`).then(async (res) => {
      if (res.ok) setTrip(await res.json());
      else setMissing(true);
    });
  }, [tripId]);

  if (missing) return <main><h1>Trip not found</h1><p className="muted">Ask your manager for a new link.</p></main>;
  if (!trip) return <main><p className="muted">Loading...</p></main>;

  const t = LABELS[trip.language];

  async function send(body: object) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, ...body }),
      });
      const data = await res.json();
      setMessage(res.ok ? t.sent : data.error ?? "Something went wrong");
      if (res.ok) setText("");
    } catch {
      setMessage("No connection. Try again.");
    }
    setBusy(false);
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await send({ kind: "slip", photo: await shrink(file) });
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <main>
      <h1>{trip.truck}</h1>
      <p className="muted">{trip.material}</p>

      <div className="bigbtns">
        {STATUSES.map((s) => (
          <button key={s} disabled={busy} onClick={() => send({ kind: "tap", status: s })}>{t[s]}</button>
        ))}
      </div>

      <p>
        <label className="camera">
          <span style={{ display: "block", textAlign: "center", padding: 18, borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>
            📷 {t.camera}
          </span>
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} disabled={busy} style={{ display: "none" }} />
        </label>
      </p>

      <div className="card">
        <textarea rows={3} value={text} placeholder={t.placeholder} onChange={(e) => setText(e.target.value)} />
        <p><button disabled={busy || !text.trim()} onClick={() => send({ kind: "text", text })}>{t.send}</button></p>
      </div>

      {busy && <p className="muted">...</p>}
      {message && <p><strong>{message}</strong></p>}
    </main>
  );
}
