// The driver's side of the conversation on WhatsApp or SMS. Plain text only, nothing to install.
// This file is pure (no network, no AI) so the rules can be tested on their own.

export type Lang = "hi" | "ta" | "ml" | "en";
export type ChatStatus = "Reached" | "Loaded" | "Left" | "Delivered";

export const CHAT_STATUSES: ChatStatus[] = ["Reached", "Loaded", "Left", "Delivered"];
const LANG_BY_NUMBER: Record<string, Lang> = { "1": "hi", "2": "ta", "3": "ml", "4": "en" };

// Words in every language the driver might type to pick a language, instead of a number.
const LANG_WORDS: [Lang, string[]][] = [
  ["hi", ["hindi", "हिंदी", "हिन्दी"]],
  ["ta", ["tamil", "தமிழ்", "தமிழ"]],
  ["ml", ["malayalam", "മലയാളം"]],
  ["en", ["english", "इंग्लिश", "अंग्रेजी", "अंग्रेज़ी", "ஆங்கிலம்", "ഇംഗ്ലീഷ്"]],
];

const clean = (text: string) => text.trim().toLowerCase().replace(/[.!?,।]+$/u, "");

export function parseLanguageChoice(text: string): Lang | null {
  const t = clean(text);
  if (LANG_BY_NUMBER[t]) return LANG_BY_NUMBER[t];
  for (const [lang, words] of LANG_WORDS) if (words.some((w) => t === w || t.startsWith(w))) return lang;
  return null;
}

export type Command =
  | { type: "status"; status: ChatStatus }
  | { type: "language" }
  | { type: "menu" }
  | { type: "text" };

// Once a language is chosen: 1-4 are the four statuses, 0 changes the language, "menu" shows the choices again.
export function parseCommand(text: string): Command {
  const t = clean(text);
  if (t === "0") return { type: "language" };
  if (/^[1-4]$/.test(t)) return { type: "status", status: CHAT_STATUSES[Number(t) - 1] };
  if (["menu", "help", "?", "मेनू", "மெனு", "മെനു"].includes(t)) return { type: "menu" };
  return { type: "text" };
}

const WORDS: Record<Lang, { name: string; statuses: Record<ChatStatus, string>; reply: string; extra: string; change: string; noted: string; photoOk: string; retake: string; textOk: string }> = {
  hi: {
    name: "हिंदी",
    statuses: { Reached: "पहुँच गया", Loaded: "लोड हो गया", Left: "निकल गया", Delivered: "डिलीवर हो गया" },
    reply: "जवाब में नंबर भेजें:",
    extra: "या स्लिप की फोटो भेजें, या अपना संदेश लिखें।",
    change: "0 = भाषा बदलें",
    noted: "ठीक है ✓",
    photoOk: "फोटो मिल गई ✓",
    retake: "फोटो साफ़ नहीं है। कृपया स्लिप की साफ़ फोटो दोबारा भेजें।",
    textOk: "संदेश मिल गया ✓",
  },
  ta: {
    name: "தமிழ்",
    statuses: { Reached: "வந்துவிட்டேன்", Loaded: "லோடு ஏற்றியாச்சு", Left: "புறப்பட்டேன்", Delivered: "டெலிவரி செய்தேன்" },
    reply: "பதிலாக எண்ணை அனுப்பவும்:",
    extra: "அல்லது எடைச் சீட்டின் படத்தை அனுப்பவும், அல்லது உங்கள் செய்தியை எழுதவும்.",
    change: "0 = மொழியை மாற்று",
    noted: "சரி ✓",
    photoOk: "படம் கிடைத்தது ✓",
    retake: "படம் தெளிவாக இல்லை. எடைச் சீட்டின் தெளிவான படத்தை மீண்டும் அனுப்பவும்.",
    textOk: "செய்தி கிடைத்தது ✓",
  },
  ml: {
    name: "മലയാളം",
    statuses: { Reached: "എത്തി", Loaded: "ലോഡ് കയറ്റി", Left: "പുറപ്പെട്ടു", Delivered: "ഡെലിവറി ചെയ്തു" },
    reply: "മറുപടിയായി നമ്പർ അയയ്ക്കുക:",
    extra: "അല്ലെങ്കിൽ സ്ലിപ്പിന്റെ ഫോട്ടോ അയയ്ക്കുക, അല്ലെങ്കിൽ സന്ദേശം എഴുതുക.",
    change: "0 = ഭാഷ മാറ്റുക",
    noted: "ശരി ✓",
    photoOk: "ഫോട്ടോ ലഭിച്ചു ✓",
    retake: "ഫോട്ടോ വ്യക്തമല്ല. സ്ലിപ്പിന്റെ വ്യക്തമായ ഫോട്ടോ വീണ്ടും അയയ്ക്കുക.",
    textOk: "സന്ദേശം ലഭിച്ചു ✓",
  },
  en: {
    name: "English",
    statuses: { Reached: "Reached", Loaded: "Loaded", Left: "Left", Delivered: "Delivered" },
    reply: "Reply with a number:",
    extra: "Or send a photo of the weighment slip, or type your message.",
    change: "0 = change language",
    noted: "Noted ✓",
    photoOk: "Photo received ✓",
    retake: "The photo is not clear. Please send a clear photo of the slip again.",
    textOk: "Message received ✓",
  },
};

export const languageName = (lang: Lang) => WORDS[lang].name;

// First message to the driver: every language at once, pick one by number.
export function languageMenu(truck: string): string {
  return [
    `FindMyTruck | ${truck}`,
    "हिंदी के लिए 1 भेजें",
    "தமிழுக்கு 2 அனுப்பவும்",
    "മലയാളത്തിന് 3 അയയ്ക്കുക",
    "For English send 4",
  ].join("\n");
}

// What the driver sees after choosing a language: how to report each step.
export function activeMenu(lang: Lang, truck: string): string {
  const w = WORDS[lang];
  return [
    `FindMyTruck | ${truck} | ${w.name} ✓`,
    w.reply,
    ...CHAT_STATUSES.map((s, i) => `${i + 1} ${w.statuses[s]}`),
    w.extra,
    w.change,
  ].join("\n");
}

export const ackStatus = (lang: Lang, status: ChatStatus) => `${WORDS[lang].noted} ${WORDS[lang].statuses[status]}`;
export const ackPhoto = (lang: Lang) => WORDS[lang].photoOk;
export const ackText = (lang: Lang) => WORDS[lang].textOk;
export const askRetake = (lang: Lang) => WORDS[lang].retake;

// ---------- Reminders from the manager ----------
const ASK_SLIP: Record<Lang, string> = {
  hi: "कृपया स्लिप की साफ़ फोटो भेजें।",
  ta: "தயவுசெய்து எடைச் சீட்டின் தெளிவான படத்தை அனுப்பவும்.",
  ml: "ദയവായി സ്ലിപ്പിന്റെ വ്യക്തമായ ഫോട്ടോ അയയ്ക്കുക.",
  en: "Please send a clear photo of the weighment slip.",
};

const REMIND_UPDATE: Record<Lang, string> = {
  hi: "कृपया अपनी ट्रिप का हाल बताएं।",
  ta: "தயவுசெய்து உங்கள் பயண நிலையைத் தெரிவிக்கவும்.",
  ml: "ദയവായി നിങ്ങളുടെ യാത്രയുടെ വിവരം അറിയിക്കുക.",
  en: "Please update your trip status.",
};

// The text sent to a driver when the manager taps "Remind driver".
//  - the driver never picked a language: show the language menu again
//  - the problem is the slip: ask for a clear photo
//  - otherwise: ask for an update and show the reply numbers
export function reminderMessage(opts: { lang: Lang; truck: string; stage: "awaiting_language" | "active"; reason?: "slip" | "update" }): string {
  if (opts.stage === "awaiting_language") return languageMenu(opts.truck);
  if (opts.reason === "slip") return `FindMyTruck | ${opts.truck}\n${ASK_SLIP[opts.lang]}`;
  return `${REMIND_UPDATE[opts.lang]}\n${activeMenu(opts.lang, opts.truck)}`;
}
