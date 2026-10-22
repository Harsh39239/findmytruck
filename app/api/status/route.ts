import { NextResponse } from "next/server";
import { messagingConfigured } from "@/lib/sms";

// Lets the Settings screen say whether real WhatsApp / SMS sending is connected.
export async function GET() {
  return NextResponse.json({ messaging: messagingConfigured() });
}
