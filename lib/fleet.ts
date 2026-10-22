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
    return SILENT_OPTIONS.some((o) => o.min === n) ? n : 30;
  } catch {
    return 30;
  }
}

export function writeSilentMin(min: number) {
  try { localStorage.setItem(SILENT, String(min)); } catch {}
}

// A trip id can arrive from a link or be typed in: take just the 8-character code.
export function parseTripCode(input: string): string | null {
  const m = input.trim().match(/([a-z0-9]{8})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}
