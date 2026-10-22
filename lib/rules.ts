// Plain-code rules. The AI only reads and translates; these rules decide OK / review / flag.

export type Level = "ok" | "review" | "flag";

export const TOLERANCE_PCT = 2; // assumption: weight may differ from expected by up to 2%
export const MIN_CONFIDENCE = 0.7; // assumption: below this, a human reviews it

export const STATUSES = ["Reached", "Loaded", "Left", "Delivered"] as const;

const kg = (n: number) => n.toLocaleString("en-US");

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
  if (status === "Unknown") return { level: "review", note: "Could not tell the status. Check the original text." };
  if (confidence < MIN_CONFIDENCE) return { level: "review", note: "Low confidence. Check the original text." };
  if (status === "Loaded" && !hasPhoto) return { level: "review", note: "Loaded, but no slip photo yet." };
  return { level: "ok", note: "" };
}
