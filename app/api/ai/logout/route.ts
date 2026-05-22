import { NextResponse } from "next/server";

import { clearAiApiKeyCookie } from "@/lib/ai-session";

export const runtime = "nodejs";

export async function POST() {
  await clearAiApiKeyCookie();
  return NextResponse.json({ ok: true });
}
