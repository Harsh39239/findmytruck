// Plain-code rules. The AI only reads and translates; these rules decide OK / review / flag.

export type Level = "ok" | "review" | "flag";

export const TOLERANCE_PCT = 2; // assumption: weight may differ from expected by up to 2%
export const MIN_CONFIDENCE = 0.7; // assumption: below this, a human reviews it

export const STATUSES = ["Reached", "Loaded", "Left", "Delivered"] as const;

const kg = (n: number) => n.toLocaleString("en-US");

type Stamped = { status: string; level: Level; at: number; handled?: boolean };

// An event counts once it is OK, or the manager has handled it.
const confirmed = (events: Stamped[], status: string) =>
  events.filter((e) => e.status === status && (e.level === "ok" || e.handled));

// How far along the stepper the trip is: -1 = nothing yet, 0 = Reached ... 3 = Delivered.
export function stageIndex(events: Stamped[]) {
  let stage = -1;
  STATUSES.forEach((s, i) => { if (confirmed(events, s).length) stage = i; });
  return stage;
}

// Review and flag items the manager has not dealt with yet.
export const openCount = (events: Stamped[]) => events.filter((e) => e.level !== "ok" && !e.handled).length;

// Minutes of silence from the driver, or 0 when all is well. A trip counts as silent when it is not
// delivered yet and nothing has come in for `thresholdMin` minutes. A trip nobody has opened is measured
// from the moment it was created.
export function silentFor(events: { at: number }[], createdAt: number, stage: number, now: number, thresholdMin: number) {
  if (stage >= 3) return 0;
  const lastAt = events.length ? events[events.length - 1].at : createdAt;
  const mins = Math.floor(Math.max(0, now - lastAt) / 60000);
  return mins >= thresholdMin ? mins : 0;
}

// Estimated share of the road covered (0 to 1). There is no live GPS: once the driver taps "Left",
// the lorry moves along the route at the road's estimated driving time. `speed` > 1 fast-forwards for demos.
export function routeProgress(events: Stamped[], durationMin: number, speed: number, now: number) {
  if (confirmed(events, "Delivered").length) return 1;
  const left = confirmed(events, "Left");
  if (!left.length) return 0;
  const startedAt = left[left.length - 1].at;
  const travelMs = (Math.max(durationMin, 1) * 60000) / Math.max(speed, 1);
  return Math.min(0.98, Math.max(0, (now - startedAt) / travelMs));
}

// Cleans a phone number to +<country code><number>. A bare 10-digit number is treated as Indian (+91).
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (input.trim().startsWith("+") && /^\d{11,15}$/.test(digits)) return `+${digits}`;
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

// A message with no letters in any language (for example "????" or "...") can't be a status.
export const hasReadableText = (text: string) => /\p{L}/u.test(text);

export function withinTolerance(weightKg: number, expectedKg: number) {
  return Math.abs(weightKg - expectedKg) <= (expectedKg * TOLERANCE_PCT) / 100;
}

export type SlipReading = { weightKg: number | null; readable: boolean; confidence: number };

export function decideSlip(slip: SlipReading, expectedKg: number): { level: Level; status: string; note: string } {
  if (!slip.readable || slip.weightKg === null) {
    return { level: "flag", status: "Slip check", note: "Can't read the slip. Ask the driver to retake the photo." };
  }
  const compare = `${kg(slip.weightKg)} kg (expected ${kg(expectedKg)})`;
  if (!withinTolerance(slip.weightKg, expectedKg)) {
    return { level: "flag", status: "Slip check", note: `Weight outside ${TOLERANCE_PCT}%: ${compare}. Manager decides.` };
  }
  if (slip.confidence < MIN_CONFIDENCE) {
    return { level: "review", status: "Slip check", note: `Low confidence reading: ${compare}. Check the photo.` };
  }
  return { level: "ok", status: "Loaded", note: `Loaded, ${compare}: OK` };
}

export function decideText(status: string, confidence: number, hasPhoto: boolean): { level: Level; note: string } {
  if (status === "Unknown") return { level: "review", note: "Not a standard status update. Read the translation, or check the original text." };
  if (confidence < MIN_CONFIDENCE) return { level: "review", note: "Low confidence. Check the original text." };
  if (status === "Loaded" && !hasPhoto) return { level: "review", note: "Loaded, but no slip photo yet." };
  return { level: "ok", note: "" };
}
