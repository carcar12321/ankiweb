import { NextResponse } from "next/server";

import { getAiApiKeyFromCookie } from "@/lib/ai-session";
import { buildWeaknessPrompt } from "@/lib/ai-context";
import { AiAuthError, createAiText } from "@/lib/openai-api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = await getAiApiKeyFromCookie();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "AI 기능을 사용하려면 API 키를 입력해주세요." },
      { status: 401 }
    );
  }

  const [wrongNotes, recentLogs] = await Promise.all([
    prisma.wrongNote.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
      take: 20,
      include: {
        question: {
          include: { set: true }
        }
      }
    }),
    prisma.studyReviewLog.findMany({
      orderBy: { reviewedAt: "desc" },
      take: 40,
      include: {
        question: {
          select: {
            category: true,
            prompt: true,
            tag: true
          }
        }
      }
    })
  ]);

  try {
    const report = await createAiText({
      apiKey,
      instructions:
        "당신은 학습 기록을 분석하는 한국어 학습 코치입니다. 근거가 있는 패턴만 말하고, 다음 행동을 짧고 구체적으로 제안하세요.",
      prompt: buildWeaknessPrompt({
        activeWrongNotes: wrongNotes.map((note) => ({
          category: note.question.category,
          prompt: note.question.prompt,
          setTitle: note.question.set.title,
          tag: note.question.tag,
          wrongCount: note.wrongCount
        })),
        recentRatings: recentLogs.map((log) => ({
          category: log.question.category,
          prompt: log.question.prompt,
          rating: log.rating,
          tag: log.question.tag
        }))
      })
    });

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof AiAuthError
            ? "API 키를 다시 입력해주세요."
            : "AI 분석을 가져오지 못했습니다."
      },
      { status: error instanceof AiAuthError ? 401 : 502 }
    );
  }
}
