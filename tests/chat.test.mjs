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

import { reminderMessage } from "../lib/chat.ts";
import { lastDriverEvent, silentFor } from "../lib/rules.ts";

test("reminders ask for the right thing, in the driver's language", () => {
  // driver never chose a language: the menu is sent again
  assert.equal(reminderMessage({ lang: "en", truck: "T1", stage: "awaiting_language" }), languageMenu("T1"));
  // slip trouble: ask for a clear photo
  assert.ok(reminderMessage({ lang: "ta", truck: "T1", stage: "active", reason: "slip" }).includes("எடைச் சீட்டின்"));
  assert.ok(reminderMessage({ lang: "en", truck: "T1", stage: "active", reason: "slip" }).includes("clear photo"));
  // otherwise: ask for an update and show the reply numbers
  const update = reminderMessage({ lang: "hi", truck: "T1", stage: "active" });
  assert.ok(update.includes("कृपया अपनी ट्रिप का हाल बताएं") && update.includes("1 पहुँच गया"));
});

test("a reminder from the manager does not count as the driver being active", () => {
  const min = 60000;
  const t0 = 50_000_000;
  const events = [{ at: t0, status: "Reached" }, { at: t0 + 40 * min, status: "Reminder" }];
  assert.equal(lastDriverEvent(events).status, "Reached");
  // 45 minutes after the driver's last message, a reminder at minute 40 must not reset the clock
  assert.equal(silentFor(events, t0 - 1, 0, t0 + 45 * min, 30), 45);
  assert.equal(lastDriverEvent([{ at: 1, status: "Reminder" }]), undefined);
});

import { sendToDriver } from "../lib/sms.ts";

test("with Twilio connected, a reminder goes out on WhatsApp only, never SMS", async () => {
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { sent.push(Object.fromEntries(init.body)); return { ok: true, status: 201 }; };
  const saved = { ...process.env };
  Object.assign(process.env, { TWILIO_ACCOUNT_SID: "ACtest", TWILIO_AUTH_TOKEN: "tok", TWILIO_FROM_WHATSAPP: "whatsapp:+14155238886", TWILIO_FROM_SMS: "+15005550006" });
  try {
    const onlyWa = await sendToDriver("+919876543210", "reminder", "WhatsApp");
    assert.deepEqual(onlyWa, [{ via: "WhatsApp", sent: true }]);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].To, "whatsapp:+919876543210");
    assert.equal(sent[0].From, "whatsapp:+14155238886");
    // the first message to a new driver still goes on both channels
    sent.length = 0;
    const both = await sendToDriver("+919876543210", "hello");
    assert.deepEqual(both.map((r) => r.via).sort(), ["SMS", "WhatsApp"]);
    // without keys nothing is sent at all
    delete process.env.TWILIO_ACCOUNT_SID;
    assert.deepEqual(await sendToDriver("+919876543210", "x", "WhatsApp"), []);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});

import { autoRemindDue } from "../lib/rules.ts";

test("automatic reminders: after the chosen silence, then again each time that passes, until the driver replies", () => {
  const min = 60000;
  const t0 = 90_000_000;
  const heard = [{ at: t0, status: "Reached" }];
  // chosen: remind after 2 hours
  assert.equal(autoRemindDue(heard, t0, 0, t0 + 119 * min, 120), false); // 1 h 59 min: not yet
  assert.equal(autoRemindDue(heard, t0, 0, t0 + 121 * min, 120), true); // past 2 hours: remind
  // reminded at 2 h: nothing more until another 2 hours have passed
  const reminded = [...heard, { at: t0 + 121 * min, status: "Reminder" }];
  assert.equal(autoRemindDue(reminded, t0, 0, t0 + 200 * min, 120), false);
  assert.equal(autoRemindDue(reminded, t0, 0, t0 + 242 * min, 120), true);
  // the driver answers: the clock starts again from their message
  const replied = [...reminded, { at: t0 + 250 * min, status: "Left" }];
  assert.equal(autoRemindDue(replied, t0, 2, t0 + 300 * min, 120), false);
  assert.equal(autoRemindDue(replied, t0, 2, t0 + 371 * min, 120), true);
  // a trip nobody has touched counts from when it was created; delivered trips and "Off" never remind
  assert.equal(autoRemindDue([], t0, -1, t0 + 61 * min, 60), true);
  assert.equal(autoRemindDue(heard, t0, 3, t0 + 900 * min, 60), false);
  assert.equal(autoRemindDue(heard, t0, 0, t0 + 900 * min, 0), false);
});
