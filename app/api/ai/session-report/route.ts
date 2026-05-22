import { NextRequest, NextResponse } from "next/server";

import { getAiApiKeyFromCookie } from "@/lib/ai-session";
import { buildSessionReportPrompt } from "@/lib/ai-context";
import { persistAiExchange } from "@/lib/ai-persistence";
import { composeInstructions, getAiSettings } from "@/lib/ai-settings";
import { AiAuthError, createAiText } from "@/lib/openai-api";
import { prisma } from "@/lib/prisma";
import { buildSessionReport } from "@/lib/study-insights";

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
    request?: string;
    sessionId?: string;
  } | null;

  if (!body?.sessionId) {
    return NextResponse.json(
      { ok: false, message: "학습 세션이 필요합니다." },
      { status: 400 }
    );
  }

  const session = await prisma.studySession.findUnique({
    where: { id: body.sessionId },
    include: {
      aiConversations: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 30
          }
        },
        orderBy: { updatedAt: "asc" }
      },
      items: {
        include: {
          question: true
        },
        orderBy: { position: "asc" }
      }
    }
  });

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "학습 세션을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const report = buildSessionReport(
    session.items.map((item) => ({
      category: item.question.category,
      isCorrect: item.isCorrect,
      nextDueAt: null,
      rating: item.rating
    }))
  );
  const aiMessages = session.aiConversations.flatMap((conversation) =>
    conversation.messages.map((message) => ({
      content: message.content,
      role: message.role
    }))
  );
  const prompt = buildSessionReportPrompt({
    messages: aiMessages,
    request: body.request,
    session: {
      accuracy: report.accuracy,
      correctCount: report.correctCount,
      questionCount: report.answeredCount,
      ratingCounts: report.ratingCounts,
      weakParts: report.partStats
    }
  });

  try {
    const settings = await getAiSettings();
    const content = await createAiText({
      apiKey,
      instructions: composeInstructions(
        "당신은 학습 세션을 분석하는 한국어 학습 코치입니다. 사용자의 질문 기록과 세션 결과를 연결해 실행 가능한 보고서를 작성하세요.",
        settings
      ),
      model: settings.model,
      prompt,
      reasoningEffort: settings.reasoningEffort
    });
    const conversation = await persistAiExchange({
      assistant: content,
      model: settings.model,
      scope: "SESSION_REPORT",
      sourceSessionId: session.id,
      title: "세션 완료 보고서",
      user: body.request?.trim() || "이번 세션 보고서 생성"
    });
    const savedReport = await prisma.aiSessionReport.create({
      data: {
        content,
        conversationId: conversation.id,
        model: settings.model,
        prompt: body.request?.trim() || null,
        sessionId: session.id,
        title: "세션 완료 보고서"
      }
    });

    return NextResponse.json({
      ok: true,
      conversationId: conversation.id,
      model: settings.model,
      report: {
        id: savedReport.id,
        content: savedReport.content
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof AiAuthError
            ? "API 키를 다시 입력해주세요."
            : "보고서를 생성하지 못했습니다."
      },
      { status: error instanceof AiAuthError ? 401 : 502 }
    );
  }
}
