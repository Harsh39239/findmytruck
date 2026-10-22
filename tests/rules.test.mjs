// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { decideSlip, decideText, hasReadableText, normalizePhone, openCount, routeProgress, silentFor, stageIndex } from "../lib/rules.ts";

test("phone numbers are cleaned, bad ones rejected", () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
  assert.equal(normalizePhone("098765-43210"), "+919876543210");
  assert.equal(normalizePhone("+1 415 555 2671"), "+14155552671");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("abc"), null);
});

test("lorry stays at the start until the driver leaves, then moves, and ends when delivered", () => {
  const ev = (status, at, level = "ok") => ({ status, at, level });
  const t0 = 1_000_000;
  assert.equal(routeProgress([], 120, 1, t0), 0);
  assert.equal(routeProgress([ev("Reached", t0), ev("Loaded", t0)], 120, 1, t0 + 1e6), 0);
  const left = [ev("Left", t0)];
  assert.equal(routeProgress(left, 120, 1, t0 + 60 * 60000), 0.5); // 1 h of a 2 h trip
  assert.equal(routeProgress(left, 120, 60, t0 + 60000), 0.5); // demo speed: 1 min = 1 h
  assert.equal(routeProgress(left, 120, 1, t0 + 10 * 3600000), 0.98); // never "arrives" by itself
  assert.equal(routeProgress([...left, ev("Delivered", t0 + 1)], 120, 1, t0 + 5), 1);
  assert.equal(routeProgress([ev("Left", t0, "review")], 120, 1, t0 + 60000), 0); // unconfirmed does not count
});

test("trip codes are picked out of links or typed codes", async () => {
  const { parseTripCode } = await import("../lib/fleet.ts");
  assert.equal(parseTripCode("8e95dc1b"), "8e95dc1b");
  assert.equal(parseTripCode("https://findmytruck-plum.vercel.app/driver/8E95DC1B"), "8e95dc1b");
  assert.equal(parseTripCode("  https://x.app/#/trip/8e95dc1b/ "), "8e95dc1b");
  assert.equal(parseTripCode("hello"), null);
  assert.equal(parseTripCode(""), null);
});

test("a driver is silent after the chosen time, never once delivered", () => {
  const min = 60000;
  const t0 = 10_000_000;
  // started, last message 45 minutes ago, limit 30 -> silent for 45
  assert.equal(silentFor([{ at: t0 }], t0 - 99, 0, t0 + 45 * min, 30), 45);
  // 29 minutes is still fine
  assert.equal(silentFor([{ at: t0 }], t0 - 99, 0, t0 + 29 * min, 30), 0);
  // the newest message counts, not the first
  assert.equal(silentFor([{ at: t0 }, { at: t0 + 40 * min }], t0 - 99, 1, t0 + 45 * min, 30), 0);
  // a trip nobody has touched is measured from when it was created
  assert.equal(silentFor([], t0, -1, t0 + 31 * min, 30), 31);
  // delivered trips are never silent
  assert.equal(silentFor([{ at: t0 }], t0, 3, t0 + 999 * min, 30), 0);
  // clock not started yet (now = 0) must not flag anything
  assert.equal(silentFor([{ at: t0 }], t0, 0, 0, 30), 0);
});

test("open items count review and flag that are not handled", () => {
  const ev = (level, handled = false) => ({ status: "Loaded", at: 1, level, handled });
  assert.equal(openCount([ev("ok"), ev("review"), ev("flag"), ev("flag", true)]), 2);
});

test("stepper counts only confirmed statuses", () => {
  const ev = (status, level = "ok", handled = false) => ({ status, at: 1, level, handled });
  assert.equal(stageIndex([]), -1);
  assert.equal(stageIndex([ev("Reached"), ev("Loaded", "review")]), 0);
  assert.equal(stageIndex([ev("Reached"), ev("Loaded", "review", true)]), 1);
  assert.equal(stageIndex([ev("Delivered")]), 3);
});

test("text with no letters is rejected, real words in any script pass (Test 3)", () => {
  assert.equal(hasReadableText("???? ????"), false);
  assert.equal(hasReadableText("..."), false);
  assert.equal(hasReadableText("पहुँच गया"), true);
  assert.equal(hasReadableText("லோடு ஏற்றியாச்சு"), true);
  assert.equal(hasReadableText("ലോഡ് കയറ്റി"), true);
});

test("clear slip within 2% is OK (Test 1)", () => {
  const r = decideSlip({ weightKg: 18450, readable: true, confidence: 0.95 }, 18500);
  assert.equal(r.level, "ok");
  assert.equal(r.note, "Loaded, 18,450 kg (expected 18,500): OK");
});

test("weight far from expected is flagged (Test 3)", () => {
  assert.equal(decideSlip({ weightKg: 15000, readable: true, confidence: 0.95 }, 18500).level, "flag");
});

test("blurry slip is flagged, never OK (Test 3)", () => {
  assert.equal(decideSlip({ weightKg: null, readable: false, confidence: 0 }, 18500).level, "flag");
});

test("low confidence slip needs review", () => {
  assert.equal(decideSlip({ weightKg: 18500, readable: true, confidence: 0.4 }, 18500).level, "review");
});

test("'Loaded' text without a photo needs review (Test 3)", () => {
  assert.equal(decideText("Loaded", 0.95, false).level, "review");
  assert.equal(decideText("Loaded", 0.95, true).level, "ok");
});

test("unknown status (e.g. 'not loaded yet') needs review (Test 3)", () => {
  assert.equal(decideText("Unknown", 0.9, true).level, "review");
});
