import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  getWrongNoteAction,
  normalizeChoice,
  scoreAnswer
} from "@/lib/study-logic";

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
        body: { ok: false, message: "풀이 세션을 찾을 수 없습니다." },
        status: 404
      };
    }

    if (session.status !== "ACTIVE") {
      return {
        body: { ok: false, message: "이미 종료된 풀이 세션입니다." },
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

    if (currentItem.questionId !== body.questionId || currentItem.answeredAt) {
      return {
        body: { ok: false, message: "현재 순서의 문제만 채점할 수 있습니다." },
        status: 409
      };
    }

    const outcome = scoreAnswer(currentItem.question.correct, selected);
    const action = getWrongNoteAction({
      isCorrect: outcome.isCorrect,
      reviewMode: false
    });
    const now = new Date();
    const nextIndex = session.currentIndex + 1;
    const complete = nextIndex >= session.totalQuestions;
    const correctCount = session.correctCount + (outcome.isCorrect ? 1 : 0);

    await transaction.attempt.create({
      data: {
        questionId: currentItem.question.id,
        setId: session.setId,
        sessionId: session.id,
        selected,
        isCorrect: outcome.isCorrect
      }
    });

    await transaction.studySessionItem.update({
      where: { id: currentItem.id },
      data: {
        selected,
        isCorrect: outcome.isCorrect,
        answeredAt: now
      }
    });

    await transaction.studySession.update({
      where: { id: session.id },
      data: {
        currentIndex: nextIndex,
        correctCount,
        status: complete ? "COMPLETED" : "ACTIVE",
        completedAt: complete ? now : undefined
      }
    });

    if (action === "increment") {
      await transaction.wrongNote.upsert({
        where: { questionId: currentItem.question.id },
        create: {
          questionId: currentItem.question.id,
          wrongCount: 1,
          lastWrongAt: now,
          status: "ACTIVE",
          dueAt: now,
          intervalDays: 0,
          easeFactor: 2.5
        },
        update: {
          wrongCount: { increment: 1 },
          lastWrongAt: now,
          status: "ACTIVE",
          dueAt: now
        }
      });
    }

    return {
      body: {
        isCorrect: outcome.isCorrect,
        correctChoice: outcome.correctChoice,
        explanation: currentItem.question.explanation,
        currentIndex: nextIndex,
        totalQuestions: session.totalQuestions,
        complete,
        correctCount
      },
      status: 200
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
