import { NextRequest, NextResponse } from "next/server";

import { getAiApiKeyFromCookie } from "@/lib/ai-session";
import { buildGeneralStudyPrompt } from "@/lib/ai-context";
import { makeConversationTitle, persistAiExchange } from "@/lib/ai-persistence";
import { composeInstructions, getAiSettings } from "@/lib/ai-settings";
import { AiAuthError, createAiText } from "@/lib/openai-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiKey = await getAiApiKeyFromCookie();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "AI 기능을 사용하려면 API 키를 입력해주세요." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    conversationId?: string;
    message?: string;
  } | null;
  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json(
      { ok: false, message: "질문이나 요청을 입력해주세요." },
      { status: 400 }
    );
  }

  const conversationId = body?.conversationId?.trim() || null;
  const previousMessages = conversationId
    ? await prisma.aiMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    : [];
  const recentSummary = previousMessages
    .reverse()
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");

  try {
    const settings = await getAiSettings();
    const prompt = buildGeneralStudyPrompt({
      message,
      recentSummary
    });
    const answer = await createAiText({
      apiKey,
      instructions: composeInstructions(
        "당신은 개인 학습을 돕는 한국어 AI 튜터입니다. 사용자의 요청을 학업 목적에 맞춰 정확하고 실용적으로 돕습니다.",
        settings
      ),
      model: settings.model,
      prompt,
      reasoningEffort: settings.reasoningEffort
    });
    const conversation = await persistAiExchange({
      assistant: answer,
      conversationId,
      model: settings.model,
      scope: "GENERAL",
      title: makeConversationTitle("AI 학습", message),
      user: message
    });

    return NextResponse.json({
      ok: true,
      answer,
      conversationId: conversation.id,
      model: settings.model
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof AiAuthError
            ? "API 키를 다시 입력해주세요."
            : "AI 답변을 가져오지 못했습니다."
      },
      { status: error instanceof AiAuthError ? 401 : 502 }
    );
  }
}
