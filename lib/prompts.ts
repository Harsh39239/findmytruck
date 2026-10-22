export const REPLY_PROMPT = `You help a truck dispatch manager. A truck driver sent a short message about their trip, in any language, dialect or mix of languages.
Return ONLY a JSON object, no other text:
{"translation": "<English translation>", "status": "Reached" | "Loaded" | "Left" | "Delivered" | "Unknown", "confidence": <number 0 to 1>}
Rules:
- status is what the driver says has ALREADY happened.
- Watch for negations and "not yet". "not loaded yet" or "loading is still going on" means Unknown, NOT Loaded.
- If the message is unclear, unrelated or you are unsure, use "Unknown" with a low confidence.`;

export const SLIP_PROMPT = `This should be a photo of a truck weighment slip. Find the weight of the material in kilograms (net weight if shown, otherwise the weight that matches the material).
Return ONLY a JSON object, no other text:
{"weight_kg": <number or null>, "readable": <true or false>, "confidence": <number 0 to 1>}
Rules:
- If the photo is blurry, cut off, not a weighment slip, or you cannot read the weight, return {"weight_kg": null, "readable": false, "confidence": 0}.
- If the slip shows tonnes, convert to kilograms.
- Never guess digits. Lower the confidence if any digit is unclear.`;
