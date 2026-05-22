import { NextRequest, NextResponse } from "next/server";

import { aiModelOptions, aiReasoningEfforts } from "@/lib/ai-models";
import { getAiSettings, normalizeAiSettings } from "@/lib/ai-settings";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getAiSettings();

  return NextResponse.json({
    ok: true,
    modelOptions: aiModelOptions,
    reasoningEfforts: aiReasoningEfforts,
    settings
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    customInstructions?: string;
    model?: string;
    reasoningEffort?: string;
    tone?: string;
  } | null;
  const settings = normalizeAiSettings(body ?? {});
  const saved = await prisma.aiSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...settings
    },
    update: settings
  });

  return NextResponse.json({
    ok: true,
    settings: normalizeAiSettings(saved)
  });
}
