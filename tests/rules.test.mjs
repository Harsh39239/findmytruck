// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { decideSlip, decideText } from "../lib/rules.ts";

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
