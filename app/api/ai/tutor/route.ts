import { NextRequest, NextResponse } from "next/server";

import { getAiApiKeyFromCookie } from "@/lib/ai-session";
import { buildTutorPrompt } from "@/lib/ai-context";
import { persistAiExchange, makeConversationTitle } from "@/lib/ai-persistence";
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
    currentIndex?: number;
    message?: string;
    mode?: "chat" | "explain";
    questionId?: string;
    sessionId?: string;
  } | null;

  if (!body?.questionId || !body.sessionId) {
    return NextResponse.json(
      { ok: false, message: "현재 문제 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const session = await prisma.studySession.findUnique({
    where: { id: body.sessionId },
    include: {
      items: {
        where: Number.isInteger(body.currentIndex)
          ? { position: body.currentIndex }
          : { questionId: body.questionId },
        include: {
          question: true
        },
        take: 1
      }
    }
  });

  const item = session?.items[0];
  if (!session || !item || item.questionId !== body.questionId) {
    return NextResponse.json(
      { ok: false, message: "현재 세션의 문제만 AI에게 물어볼 수 있습니다." },
      { status: 404 }
    );
  }

  const [wrongNotes, recentLogs] = await Promise.all([
    prisma.wrongNote.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
      take: 8,
      include: {
        question: {
          select: { category: true }
        }
      }
    }),
    prisma.studyReviewLog.findMany({
      orderBy: { reviewedAt: "desc" },
      take: 10,
      include: {
        question: {
          select: { category: true }
        }
      }
    })
  ]);
  const partCounts = new Map<string, number>();
  wrongNotes.forEach((note) => {
    const category = note.question.category ?? "미분류";
    partCounts.set(category, (partCounts.get(category) ?? 0) + note.wrongCount);
  });

  try {
    const settings = await getAiSettings();
    const userPrompt = buildTutorPrompt({
      context: {
        category: item.question.category,
        choices: {
          A: item.question.choiceA,
          B: item.question.choiceB,
          C: item.question.choiceC,
          D: item.question.choiceD
        },
        correct: item.question.correct,
        explanation: item.question.explanation,
        prompt: item.question.prompt,
        selected: item.selected,
        tag: item.question.tag
      },
      message: body.message,
      mode: body.mode ?? "explain",
      weakness: {
        activeWrongNotes: wrongNotes.length,
        frequentParts: Array.from(partCounts.entries()).map(([category, count]) => ({
          category,
          count
        })),
        recentRatings: recentLogs.map((log) => ({
          category: log.question.category ?? "미분류",
          rating: log.rating
        }))
      }
    });
    const answer = await createAiText({
      apiKey,
      instructions: composeInstructions(
        "당신은 한국어로 설명하는 개인 학습 튜터입니다. 사용자가 외우기보다 이해하도록 돕고, 답을 과장하거나 지어내지 마세요.",
        settings
      ),
      model: settings.model,
      prompt: userPrompt,
      reasoningEffort: settings.reasoningEffort
    });
    const conversation = await persistAiExchange({
      assistant: answer,
      conversationId: body.conversationId,
      model: settings.model,
      scope: "TUTOR",
      sourceQuestionId: item.question.id,
      sourceSessionId: session.id,
      title: makeConversationTitle("문제 해설", item.question.prompt),
      user: body.message?.trim() || "자세한 해설 요청"
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
