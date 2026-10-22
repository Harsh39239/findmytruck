import { REPLY_PROMPT, SLIP_PROMPT } from "./prompts";

// The only file that talks to the AI: a Gemini model, reached through OpenRouter.
// The key comes from OPENROUTER_API_KEY in .env.local.
const MODEL = process.env.AI_MODEL ?? "google/gemini-2.5-flash";
const STATUS_WORDS = ["Reached", "Loaded", "Left", "Delivered", "Unknown"];

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

async function ask(system: string, content: Part[]): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith("PASTE")) throw new Error("OPENROUTER_API_KEY is not set in .env.local");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`AI service returned ${res.status}`);

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return JSON");
  return JSON.parse(match[0]);
}

const num01 = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 1 ? v : 0);

export async function translateReply(text: string) {
  const json = await ask(REPLY_PROMPT, [{ type: "text", text }]);
  const status = typeof json.status === "string" && STATUS_WORDS.includes(json.status) ? json.status : "Unknown";
  return {
    translation: typeof json.translation === "string" ? json.translation : "",
    status,
    confidence: num01(json.confidence),
  };
}

export async function readSlip(photoDataUrl: string) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photoDataUrl)) throw new Error("Photo is not a supported image");
  const json = await ask(SLIP_PROMPT, [
    { type: "image_url", image_url: { url: photoDataUrl } },
    { type: "text", text: "Read the weight from this slip." },
  ]);
  const weight = typeof json.weight_kg === "number" && json.weight_kg > 0 ? json.weight_kg : null;
  return { weightKg: weight, readable: json.readable === true && weight !== null, confidence: num01(json.confidence) };
}
