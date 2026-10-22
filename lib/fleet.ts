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

// A trip id can arrive from a link or be typed in: take just the 8-character code.
export function parseTripCode(input: string): string | null {
  const m = input.trim().match(/([a-z0-9]{8})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}
