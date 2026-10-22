import { createHmac, timingSafeEqual } from "node:crypto";

// Twilio signs every message it sends to us. We check that signature so nobody else can post fake replies.
// Rule (from Twilio's documentation): sign the full URL followed by every form field name and value,
// sorted by name, using HMAC-SHA1 with the account's auth token, then base64.
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, given: string | null): boolean {
  if (!given) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// The reply Twilio sends back to the driver on the same channel (WhatsApp or SMS).
export function twiml(text: string): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(text)}</Message></Response>`;
  return new Response(body, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
}
