import { NextRequest, NextResponse } from "next/server";

import { toDisplayChoice, toOriginalChoice } from "@/lib/choice-order";
import { prisma } from "@/lib/prisma";
import { normalizeChoice, scoreAnswer } from "@/lib/study-logic";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    questionId?: string;
    selected?: string;
  } | null;
  const selected = normalizeChoice(body?.selected);

  if (!body?.questionId || !selected) {
    return NextResponse.json(
      { ok: false, message: "questionId와 selected가 필요합니다." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const session = await transaction.studySession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: { question: true },
          orderBy: { position: "asc" }
        }
      }
    });

    if (!session) {
      return {
        body: { ok: false, message: "학습 세션을 찾을 수 없습니다." },
        status: 404
      };
    }

    if (session.status !== "ACTIVE") {
      return {
        body: { ok: false, message: "이미 종료된 학습 세션입니다." },
        status: 409
      };
    }

    const currentItem = session.items.find(
      (item) => item.position === session.currentIndex
    );

    if (!currentItem) {
      await transaction.studySession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          currentIndex: session.totalQuestions
        }
      });

      return {
        body: { ok: false, message: "이미 마지막 문제까지 완료했습니다." },
        status: 409
      };
    }

    if (currentItem.questionId !== body.questionId) {
      return {
        body: { ok: false, message: "현재 순서의 문제만 채점할 수 있습니다." },
        status: 409
      };
    }

    if (currentItem.ratedAt) {
      return {
        body: { ok: false, message: "이미 평가가 끝난 문제입니다." },
        status: 409
      };
    }

    if (currentItem.answeredAt && currentItem.selected && currentItem.isCorrect !== null) {
      return {
        body: {
          ok: true,
          isCorrect: currentItem.isCorrect,
          correctChoice: toDisplayChoice(
            currentItem.choiceOrder,
            currentItem.question.correct
          ),
          selectedChoice: toDisplayChoice(
            currentItem.choiceOrder,
            currentItem.selected
          ),
          explanation: currentItem.question.explanation,
          currentIndex: session.currentIndex,
          totalQuestions: session.totalQuestions
        },
        status: 200
      };
    }

    const originalSelected = toOriginalChoice(currentItem.choiceOrder, selected);
    const outcome = scoreAnswer(currentItem.question.correct, originalSelected);
    const now = new Date();

    await transaction.attempt.create({
      data: {
        questionId: currentItem.question.id,
        setId: currentItem.question.setId,
        sessionId: session.id,
        selected: originalSelected,
        isCorrect: outcome.isCorrect
      }
    });

    await transaction.studySessionItem.update({
      where: { id: currentItem.id },
      data: {
        selected: originalSelected,
        isCorrect: outcome.isCorrect,
        answeredAt: now
      }
    });

    return {
      body: {
        ok: true,
        isCorrect: outcome.isCorrect,
        correctChoice: toDisplayChoice(
          currentItem.choiceOrder,
          outcome.correctChoice
        ),
        selectedChoice: selected,
        explanation: currentItem.question.explanation,
        currentIndex: session.currentIndex,
        totalQuestions: session.totalQuestions
      },
      status: 200
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
