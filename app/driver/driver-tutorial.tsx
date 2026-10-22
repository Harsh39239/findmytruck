"use client";
/* eslint-disable @next/next/no-img-element -- the practice photo is a local preview */

import Link from "next/link";
import { useState } from "react";

// A hands-on practice for the driver: three taps, a problem report and a photo, in their own language.
// Nothing is sent anywhere. It only teaches the replies the real WhatsApp or SMS chat understands.

type Lang = "hi" | "ta" | "ml" | "en";
type Words = {
  name: string; title: string; intro: string; start: string; tap: string; photo: string; photoHint: string;
  retake: string; good: string; done: string; again: string; sent: string; steps: string[];
  problem: string; problemReply: string;
};

const REPLIES = ["1", "", "3", "", "4"]; // the number the driver sends at each of the five steps

const T: Record<Lang, Words> = {
  hi: {
    name: "हिंदी", title: "ड्राइवर के लिए अभ्यास", start: "शुरू करें", tap: "यह भेजें",
    intro: "आपको कोई ऐप नहीं चाहिए। बस WhatsApp या SMS पर नंबर भेजें। चलिए अभ्यास करें, यहाँ कुछ असली नहीं जाता।",
    photo: "फोटो लें", photoHint: "तौल पर्ची (weighment slip) की साफ फोटो लें। पूरी पर्ची दिखे।", retake: "दोबारा फोटो लें",
    good: "बहुत बढ़िया! असली चैट में यह फोटो मैनेजर को जाएगी।", sent: "भेजा गया", again: "फिर से अभ्यास करें",
    done: "आप तैयार हैं! जब ट्रक का संदेश आए, ऐसे ही जवाब दें।",
    steps: ["ट्रक पिकअप पर पहुँच गया", "तौल पर्ची की फोटो भेजें", "ट्रक निकल गया", "कोई दिक्कत हो तो अपनी भाषा में लिखें", "माल पहुँचा दिया"],
    problem: "रास्ते में टायर पंक्चर हो गया", problemReply: "संदेश मिल गया ✓ मैनेजर को बता दिया गया",
  },
  ta: {
    name: "தமிழ்", title: "ஓட்டுநர் பயிற்சி", start: "தொடங்கு", tap: "இதை அனுப்பு",
    intro: "ஆப் தேவையில்லை. WhatsApp அல்லது SMS-ல் எண் அனுப்பினால் போதும். இது பயிற்சி மட்டுமே, எதுவும் உண்மையாக அனுப்பப்படாது.",
    photo: "புகைப்படம் எடு", photoHint: "எடை சீட்டின் தெளிவான புகைப்படம் எடுங்கள். முழு சீட்டும் தெரிய வேண்டும்.", retake: "மீண்டும் எடு",
    good: "அருமை! உண்மையான சாட்டில் இந்த படம் மேலாளருக்குச் செல்லும்.", sent: "அனுப்பப்பட்டது", again: "மீண்டும் பயிற்சி",
    done: "நீங்கள் தயார்! லாரிக்கான செய்தி வரும்போது இப்படியே பதில் அனுப்புங்கள்.",
    steps: ["லாரி ஏற்றும் இடத்திற்கு வந்துவிட்டது", "எடை சீட்டின் படம் அனுப்புங்கள்", "லாரி புறப்பட்டது", "பிரச்சனை இருந்தால் உங்கள் மொழியில் எழுதுங்கள்", "சரக்கு சேர்த்துவிட்டேன்"],
    problem: "வழியில் டயர் பஞ்சர் ஆகிவிட்டது", problemReply: "செய்தி கிடைத்தது ✓ மேலாளருக்குத் தெரிவிக்கப்பட்டது",
  },
  ml: {
    name: "മലയാളം", title: "ഡ്രൈവർ പരിശീലനം", start: "തുടങ്ങുക", tap: "ഇത് അയയ്ക്കുക",
    intro: "ആപ്പ് വേണ്ട. WhatsApp അല്ലെങ്കിൽ SMS-ൽ നമ്പർ അയച്ചാൽ മതി. ഇത് പരിശീലനം മാത്രം, ഒന്നും ശരിക്കും അയയ്ക്കില്ല.",
    photo: "ഫോട്ടോ എടുക്കുക", photoHint: "തൂക്ക സ്ലിപ്പിന്റെ വ്യക്തമായ ഫോട്ടോ എടുക്കുക. സ്ലിപ്പ് മുഴുവൻ കാണണം.", retake: "വീണ്ടും എടുക്കുക",
    good: "കൊള്ളാം! യഥാർത്ഥ ചാറ്റിൽ ഈ ഫോട്ടോ മാനേജർക്ക് പോകും.", sent: "അയച്ചു", again: "വീണ്ടും പരിശീലിക്കുക",
    done: "നിങ്ങൾ തയ്യാർ! ട്രക്കിന്റെ സന്ദേശം വരുമ്പോൾ ഇതുപോലെ മറുപടി നൽകുക.",
    steps: ["ട്രക്ക് പിക്കപ്പിൽ എത്തി", "തൂക്ക സ്ലിപ്പിന്റെ ഫോട്ടോ അയയ്ക്കുക", "ട്രക്ക് പുറപ്പെട്ടു", "പ്രശ്നമുണ്ടെങ്കിൽ നിങ്ങളുടെ ഭാഷയിൽ എഴുതുക", "ലോഡ് എത്തിച്ചു"],
    problem: "വഴിയിൽ ടയർ പഞ്ചറായി", problemReply: "സന്ദേശം കിട്ടി ✓ മാനേജരെ അറിയിച്ചു",
  },
  en: {
    name: "English", title: "Driver practice", start: "Start", tap: "Send this",
    intro: "You need no app. Just send a number on WhatsApp or SMS. This is only practice, nothing real is sent.",
    photo: "Take photo", photoHint: "Take a clear photo of the weighment slip. The whole slip should show.", retake: "Retake",
    good: "Well done! In the real chat this photo goes to the manager.", sent: "Sent", again: "Practise again",
    done: "You are ready! When the truck's message arrives, reply just like this.",
    steps: ["The truck reached the pickup", "Send a photo of the weighment slip", "The truck has left", "If something is wrong, write it in your language", "The load is delivered"],
    problem: "Tyre punctured on the way", problemReply: "Message received ✓ the manager has been told",
  },
};

type Msg = { from: "me" | "bot"; text?: string; photo?: string };

export default function DriverTutorial() {
  const [lang, setLang] = useState<Lang>("hi");
  const [step, setStep] = useState(-1); // -1 = intro, 0-4 = the five practice steps, 5 = finished
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const t = T[lang];

  const say = (text: string, bot: string) => {
    setMsgs((m) => [...m, { from: "me", text }, { from: "bot", text: bot }]);
    setStep((s) => s + 1);
  };

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto((old) => { if (old) URL.revokeObjectURL(old); return url; });
  }

  function sendPhoto() {
    if (!photo) return;
    setMsgs((m) => [...m, { from: "me", photo }, { from: "bot", text: t.good }]);
    setPhoto(null);
    setStep((s) => s + 1);
  }

  function restart() {
    setMsgs([]);
    setPhoto(null);
    setStep(-1);
  }

  const done = step >= t.steps.length;

  return (
    <main style={{ maxWidth: 480 }}>
      <Link href="/" className="hint">← FindMyTruck</Link>
      <h1 style={{ marginTop: 8 }}>{t.title}</h1>

      <div className="seg" role="group" aria-label="Language">
        {(Object.keys(T) as Lang[]).map((l) => (
          <button key={l} className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => setLang(l)}>{T[l].name}</button>
        ))}
      </div>

      {step === -1 && (
        <div className="card">
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6 }}>{t.intro}</p>
          <button style={{ width: "100%", fontSize: "1.1rem", padding: 16 }} onClick={() => setStep(0)}>{t.start}</button>
        </div>
      )}

      {step >= 0 && (
        <div className="wa">
          <div className="wa-top"><span className="wa-avatar">F</span><div><b>FindMyTruck</b><small>{t.name}</small></div></div>
          <div className="wa-log" style={{ height: 300 }}>
            {msgs.map((m, i) => (
              <div key={i} className={`wa-msg ${m.from === "me" ? "out" : "in"}`}>
                {m.photo && <img src={m.photo} alt="" />}
                {m.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {step >= 0 && !done && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: 0 }}>{step + 1} / {t.steps.length}</p>
          <p style={{ fontSize: "1.15rem", fontWeight: 700, margin: "6px 0 12px" }}>{t.steps[step]}</p>

          {step === 1 && (
            <>
              <p className="hint" style={{ marginBottom: 10 }}>{t.photoHint}</p>
              {photo && <img src={photo} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10 }} />}
              <label className="cta" style={{ display: "block", textAlign: "center", cursor: "pointer", marginBottom: 10 }}>
                {photo ? t.retake : t.photo}
                <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
              {photo && <button style={{ width: "100%", fontSize: "1.1rem", padding: 14 }} onClick={sendPhoto}>{t.tap}</button>}
            </>
          )}

          {step === 3 && (
            <button style={{ width: "100%", fontSize: "1.05rem", padding: 14 }} onClick={() => say(t.problem, t.problemReply)}>{t.problem}</button>
          )}

          {(step === 0 || step === 2 || step === 4) && (
            <button style={{ width: "100%", fontSize: "1.4rem", padding: 14 }} onClick={() => say(REPLIES[step], "✓ " + t.sent)}>{REPLIES[step]}</button>
          )}
        </div>
      )}

      {done && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="banner good">{t.done}</div>
          <button className="secondary" style={{ width: "100%" }} onClick={restart}>{t.again}</button>
        </div>
      )}
    </main>
  );
}
