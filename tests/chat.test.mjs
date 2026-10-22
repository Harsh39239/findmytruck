// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { activeMenu, ackStatus, languageMenu, parseCommand, parseLanguageChoice } from "../lib/chat.ts";
import { twilioSignature, validTwilioSignature } from "../lib/twilio.ts";

test("driver picks a language by number or by name, in any script", () => {
  assert.equal(parseLanguageChoice("1"), "hi");
  assert.equal(parseLanguageChoice(" 2 "), "ta");
  assert.equal(parseLanguageChoice("3."), "ml");
  assert.equal(parseLanguageChoice("4"), "en");
  assert.equal(parseLanguageChoice("Tamil"), "ta");
  assert.equal(parseLanguageChoice("हिंदी"), "hi");
  assert.equal(parseLanguageChoice("தமிழ்"), "ta");
  assert.equal(parseLanguageChoice("മലയാളം"), "ml");
  assert.equal(parseLanguageChoice("ENGLISH please"), "en");
});

test("anything else is not a language choice, so the menu is shown again", () => {
  assert.equal(parseLanguageChoice("hello"), null);
  assert.equal(parseLanguageChoice("5"), null);
  assert.equal(parseLanguageChoice(""), null);
  assert.equal(parseLanguageChoice("???"), null);
});

test("after choosing a language, numbers 1-4 are the four statuses and 0 changes language", () => {
  assert.deepEqual(parseCommand("1"), { type: "status", status: "Reached" });
  assert.deepEqual(parseCommand("2"), { type: "status", status: "Loaded" });
  assert.deepEqual(parseCommand("3"), { type: "status", status: "Left" });
  assert.deepEqual(parseCommand("4"), { type: "status", status: "Delivered" });
  assert.deepEqual(parseCommand("0"), { type: "language" });
  assert.deepEqual(parseCommand("Menu"), { type: "menu" });
  assert.deepEqual(parseCommand("12"), { type: "text" }); // not a menu number: goes to the AI as free text
  assert.deepEqual(parseCommand("abhi load nahi hua"), { type: "text" });
});

test("the first message offers every language, and each reply menu is in its own language", () => {
  const first = languageMenu("MH12 AB 1234");
  for (const must of ["MH12 AB 1234", "हिंदी के लिए 1", "தமிழுக்கு 2", "മലയാളത്തിന് 3", "For English send 4"]) assert.ok(first.includes(must), must);
  assert.ok(activeMenu("ta", "T1").includes("1 வந்துவிட்டேன்"));
  assert.ok(activeMenu("ml", "T1").includes("4 ഡെലിവറി ചെയ്തു"));
  assert.ok(activeMenu("hi", "T1").includes("0 = भाषा बदलें"));
  assert.ok(ackStatus("en", "Left").includes("Left"));
});

test("a Twilio signature must match: wrong token, wrong URL or changed text are rejected", () => {
  const url = "https://example.com/api/inbound";
  const params = { From: "whatsapp:+919876543210", Body: "2", NumMedia: "0" };
  const sig = twilioSignature("secret-token", url, params);
  assert.equal(validTwilioSignature("secret-token", url, params, sig), true);
  assert.equal(validTwilioSignature("other-token", url, params, sig), false);
  assert.equal(validTwilioSignature("secret-token", "https://evil.com/api/inbound", params, sig), false);
  assert.equal(validTwilioSignature("secret-token", url, { ...params, Body: "4" }, sig), false);
  assert.equal(validTwilioSignature("secret-token", url, params, null), false);
  // field order must not matter
  assert.equal(validTwilioSignature("secret-token", url, { NumMedia: "0", Body: "2", From: "whatsapp:+919876543210" }, sig), true);
});
