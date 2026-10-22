// The manager's list of trucks lives in this browser (there are no logins yet).
const IDS = "findmytruck-trips";
const OLD_SINGLE = "findmytruck-trip"; // from before the fleet screen
const SPEED = "findmytruck-demo-speed";

export function readIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(IDS) ?? "[]");
    const ids: string[] = Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
    const old = localStorage.getItem(OLD_SINGLE);
    if (old) {
      if (!ids.includes(old)) ids.push(old);
      localStorage.removeItem(OLD_SINGLE);
      localStorage.setItem(IDS, JSON.stringify(ids));
    }
    return ids;
  } catch {
    return [];
  }
}

export function writeIds(ids: string[]) {
  try { localStorage.setItem(IDS, JSON.stringify(ids)); } catch {}
}

export function readDemoSpeed(): boolean {
  try { return localStorage.getItem(SPEED) !== "off"; } catch { return true; }
}

export function writeDemoSpeed(on: boolean) {
  try { localStorage.setItem(SPEED, on ? "on" : "off"); } catch {}
}

// How long a driver can stay quiet before the truck turns red. Chosen by the manager, kept in this browser.
export const SILENT_OPTIONS = [
  { min: 1, label: "1 min (demo)" },
  { min: 15, label: "15 min" },
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hour" },
  { min: 120, label: "2 hours" },
];
const SILENT = "findmytruck-silent-min";

export function readSilentMin(): number {
  try {
    const n = Number(localStorage.getItem(SILENT));
    return SILENT_OPTIONS.some((o) => o.min === n) ? n : 60;
  } catch {
    return 60;
  }
}

export function writeSilentMin(min: number) {
  try { localStorage.setItem(SILENT, String(min)); } catch {}
}

// Automatic reminders: remind a quiet driver after this many minutes of silence, and again each time the same time
// passes, until they reply (0 = never). The app does this while it is open in a browser.
export const AUTO_OPTIONS = [
  { min: 0, label: "Off" },
  { min: 1, label: "After 1 minute (demo)" },
  { min: 60, label: "After 1 hour" },
  { min: 120, label: "After 2 hours" },
  { min: 180, label: "After 3 hours" },
  { min: 240, label: "After 4 hours" },
  { min: 360, label: "After 6 hours" },
];
const AUTO = "findmytruck-auto-remind-min";

export function readAutoMin(): number {
  try {
    const raw = localStorage.getItem(AUTO);
    if (raw === null) return 60;
    const n = Number(raw);
    return AUTO_OPTIONS.some((o) => o.min === n) ? n : 60;
  } catch {
    return 60;
  }
}

export function writeAutoMin(min: number) {
  try { localStorage.setItem(AUTO, String(min)); } catch {}
}

// What "Remind driver" does when messaging is not connected: show it as sent (for demos), or open WhatsApp to send by hand.
export type SendMode = "demo" | "manual";
const SEND_MODE = "findmytruck-send-mode";

export function readSendMode(): SendMode {
  try { return localStorage.getItem(SEND_MODE) === "manual" ? "manual" : "demo"; } catch { return "demo"; }
}

export function writeSendMode(mode: SendMode) {
  try { localStorage.setItem(SEND_MODE, mode); } catch {}
}

// A trip id can arrive from a link or be typed in: take just the 8-character code.
export function parseTripCode(input: string): string | null {
  const m = input.trim().match(/([a-z0-9]{8})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}
