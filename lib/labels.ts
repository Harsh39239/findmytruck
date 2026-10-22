import type { Language } from "./store";

// Fixed driver-page words, translated once. Have a native speaker check them before real use.
export const LANGUAGES: { code: Language; name: string }[] = [
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "ml", name: "Malayalam" },
  { code: "en", name: "English" },
];

export const LABELS: Record<Language, Record<string, string>> = {
  hi: {
    Reached: "पहुँच गया",
    Loaded: "लोड हो गया",
    Left: "निकल गया",
    Delivered: "डिलीवर हो गया",
    camera: "स्लिप की फोटो लें",
    placeholder: "यहाँ लिखें...",
    send: "भेजें",
    sent: "भेज दिया ✓",
    invite: "FindMyTruck: अपनी ट्रिप का हाल बताने के लिए यह लिंक खोलें: {url}",
    nudge: "FindMyTruck: कृपया अपनी ट्रिप का हाल बताएं: {url}",
  },
  ta: {
    Reached: "வந்துவிட்டேன்",
    Loaded: "லோடு ஏற்றியாச்சு",
    Left: "புறப்பட்டேன்",
    Delivered: "டெலிவரி செய்தேன்",
    camera: "எடைச் சீட்டை படம் எடுக்கவும்",
    placeholder: "இங்கே எழுதவும்...",
    send: "அனுப்பு",
    sent: "அனுப்பப்பட்டது ✓",
    invite: "FindMyTruck: உங்கள் பயண நிலையைத் தெரிவிக்க இந்த இணைப்பைத் திறக்கவும்: {url}",
    nudge: "FindMyTruck: தயவுசெய்து உங்கள் பயண நிலையைத் தெரிவிக்கவும்: {url}",
  },
  ml: {
    Reached: "എത്തി",
    Loaded: "ലോഡ് കയറ്റി",
    Left: "പുറപ്പെട്ടു",
    Delivered: "ഡെലിവറി ചെയ്തു",
    camera: "സ്ലിപ്പിന്റെ ഫോട്ടോ എടുക്കുക",
    placeholder: "ഇവിടെ എഴുതുക...",
    send: "അയയ്ക്കുക",
    sent: "അയച്ചു ✓",
    invite: "FindMyTruck: നിങ്ങളുടെ യാത്രയുടെ വിവരം അറിയിക്കാൻ ഈ ലിങ്ക് തുറക്കുക: {url}",
    nudge: "FindMyTruck: ദയവായി നിങ്ങളുടെ യാത്രയുടെ വിവരം അറിയിക്കുക: {url}",
  },
  en: {
    Reached: "Reached",
    Loaded: "Loaded",
    Left: "Left",
    Delivered: "Delivered",
    camera: "Take photo of slip",
    placeholder: "Type here...",
    send: "Send",
    sent: "Sent ✓",
    invite: "FindMyTruck: open this link to update your trip: {url}",
    nudge: "FindMyTruck: please update your trip status: {url}",
  },
};
