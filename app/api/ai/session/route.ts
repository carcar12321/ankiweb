import { NextRequest, NextResponse } from "next/server";

import {
  getAiApiKeyFromCookie,
  looksLikeOpenAiApiKey,
  setAiApiKeyCookie
} from "@/lib/ai-session";
import { validateOpenAiApiKey } from "@/lib/openai-api";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = await getAiApiKeyFromCookie();
  return NextResponse.json({ authenticated: Boolean(apiKey) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    apiKey?: string;
  } | null;
  const apiKey = body?.apiKey?.trim();

  if (!apiKey || !looksLikeOpenAiApiKey(apiKey)) {
    return NextResponse.json(
      { ok: false, message: "올바른 OpenAI API 키 형식이 아닙니다." },
      { status: 400 }
    );
  }

  const valid = await validateOpenAiApiKey(apiKey).catch(() => false);
  if (!valid) {
    return NextResponse.json(
      { ok: false, message: "API 키를 확인하지 못했습니다." },
      { status: 401 }
    );
  }

  await setAiApiKeyCookie(apiKey);
  return NextResponse.json({ ok: true });
}
