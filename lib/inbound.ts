import {
  ackPhoto,
  ackStatus,
  ackText,
  activeMenu,
  askRetake,
  languageMenu,
  languageName,
  parseCommand,
  parseLanguageChoice,
  type Lang,
} from "./chat";
import { addEvent } from "./events";
import { saveTrip, type Trip, type Via } from "./store";

const ENGLISH_NAMES: Record<Lang, string> = { hi: "Hindi", ta: "Tamil", ml: "Malayalam", en: "English" };
const CHANNEL_NAMES: Record<Via, string> = { whatsapp: "WhatsApp", sms: "SMS", web: "the web page" };

// A message arrived from the driver (WhatsApp, SMS, or the demo panel). Record what it means,
// update the trip, and return the text to send back to them in their language.
export async function handleInbound(trip: Trip, msg: { text: string; photo?: string; via: Via }): Promise<string> {
  if (!trip.chat) trip.chat = { stage: "awaiting_language" };
  trip.chat.channel = msg.via;

  // Step 1: the driver picks a language by replying with a number (or the language's name).
  if (trip.chat.stage === "awaiting_language") {
    const choice = parseLanguageChoice(msg.text);
    if (!choice) {
      await saveTrip(trip);
      return languageMenu(trip.truck);
    }
    trip.language = choice;
    trip.chat.stage = "active";
    trip.events.push({
      id: crypto.randomUUID().slice(0, 8),
      at: Date.now(),
      kind: "system",
      via: msg.via,
      original: msg.text.trim().slice(0, 40),
      translation: languageName(choice),
      status: "Language",
      level: "ok",
      note: `Driver chose ${ENGLISH_NAMES[choice]} on ${CHANNEL_NAMES[msg.via]}.`,
    });
    await saveTrip(trip);
    return activeMenu(choice, trip.truck);
  }

  // Step 2: normal conversation, in the language they chose.
  const lang = trip.language as Lang;

  if (msg.photo) {
    const r = await addEvent(trip, { kind: "slip", photo: msg.photo }, msg.via);
    if (!r.event) return askRetake(lang);
    const unreadable = r.event.status === "Slip check" && r.event.weightKg === undefined;
    return unreadable ? askRetake(lang) : ackPhoto(lang);
  }

  const cmd = parseCommand(msg.text);
  if (cmd.type === "language") {
    trip.chat.stage = "awaiting_language";
    await saveTrip(trip);
    return languageMenu(trip.truck);
  }
  if (cmd.type === "menu") {
    await saveTrip(trip);
    return activeMenu(lang, trip.truck);
  }
  if (cmd.type === "status") {
    const r = await addEvent(trip, { kind: "tap", status: cmd.status }, msg.via);
    return r.error ? activeMenu(lang, trip.truck) : ackStatus(lang, cmd.status);
  }
  const r = await addEvent(trip, { kind: "text", text: msg.text }, msg.via);
  return r.error ? activeMenu(lang, trip.truck) : ackText(lang);
}
