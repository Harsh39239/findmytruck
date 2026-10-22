"use client";

import { useEffect, useState } from "react";
import { AUTO_OPTIONS, SILENT_OPTIONS, type SendMode } from "@/lib/fleet";
import { Brand } from "./ui";

type Props = {
  autoMin: number;
  setAutoMin: (min: number) => void;
  silentMin: number;
  setSilentMin: (min: number) => void;
  sendMode: SendMode;
  setSendMode: (mode: SendMode) => void;
  demoSpeed: boolean;
  setDemoSpeed: (on: boolean) => void;
  onBack: () => void;
};

export default function SettingsView({ autoMin, setAutoMin, silentMin, setSilentMin, sendMode, setSendMode, demoSpeed, setDemoSpeed, onBack }: Props) {
  const [messaging, setMessaging] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then((d) => setMessaging(!!d.messaging)).catch(() => setMessaging(null));
  }, []);

  return (
    <main>
      <Brand />
      <p><button className="secondary" type="button" onClick={onBack}>← All trucks</button></p>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 12 }}>Settings</h1>

      <h2>Reminders</h2>
      <div className="card">
        <div className="setting">
          <label htmlFor="auto">Remind a quiet driver automatically</label>
          <select id="auto" value={autoMin} onChange={(e) => setAutoMin(Number(e.target.value))}>
            {AUTO_OPTIONS.map((o) => <option key={o.min} value={o.min}>{o.label}</option>)}
          </select>
          <p className="hint">
            If a driver does not reply for this long, they get a reminder on WhatsApp in their language. If they still do not reply,
            they get another one each time the same time passes. This works while the app is open in a browser.
          </p>
        </div>
        <div className="setting">
          <label htmlFor="silent">Show a driver as silent after</label>
          <select id="silent" value={silentMin} onChange={(e) => setSilentMin(Number(e.target.value))}>
            {SILENT_OPTIONS.map((o) => <option key={o.min} value={o.min}>{o.label}</option>)}
          </select>
          <p className="hint">The truck turns red with a SILENT badge and moves to the top of the list.</p>
        </div>
        <div className="setting">
          <label htmlFor="mode">When WhatsApp is not connected</label>
          <select id="mode" value={sendMode} onChange={(e) => setSendMode(e.target.value as SendMode)}>
            <option value="demo">Show reminders as sent (demo mode)</option>
            <option value="manual">Open WhatsApp so I can send by hand</option>
          </select>
          <p className="hint">Demo mode is for presentations. Reminders are marked as demo, and nothing is really delivered.</p>
        </div>
      </div>

      <h2>Messaging</h2>
      <div className="card">
        <div className="statusline">
          <span className={`dot ${messaging ? "on" : ""}`} />
          <strong>{messaging === null ? "Checking..." : messaging ? "WhatsApp and SMS are connected" : "WhatsApp and SMS are not connected"}</strong>
        </div>
        <p className="hint" style={{ marginBottom: 0 }}>
          {messaging
            ? "Reminders and the first message to a driver are really delivered."
            : "Connect a Twilio account to deliver real messages. Until then the app runs in demo mode. Setup steps are in MESSAGING.md in the project."}
        </p>
      </div>

      <h2>Maps</h2>
      <div className="card">
        <div className="setting">
          <label htmlFor="speed">Lorry speed</label>
          <select id="speed" value={demoSpeed ? "demo" : "real"} onChange={(e) => setDemoSpeed(e.target.value === "demo")}>
            <option value="demo">Demo speed (60 times faster)</option>
            <option value="real">Real time</option>
          </select>
          <p className="hint">Demo speed makes the lorry cross the map in a couple of minutes. Real time follows the estimated driving time of the road.</p>
        </div>
      </div>
    </main>
  );
}
