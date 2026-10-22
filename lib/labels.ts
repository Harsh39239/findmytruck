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
  },
};
