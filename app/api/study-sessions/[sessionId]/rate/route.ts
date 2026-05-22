import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isReviewRating,
  scheduleSm2Review,
  type ReviewRating
} from "@/lib/scheduler";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    questionId?: string;
    rating?: string;
  } | null;
  const rating = body?.rating;

  if (!body?.questionId || !isReviewRating(rating)) {
    return NextResponse.json(
      { ok: false, message: "questionId와 올바른 rating이 필요합니다." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const session = await transaction.studySession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            question: {
              include: { studyState: true }
            }
          },
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
      return {
        body: { ok: false, message: "평가할 문제가 없습니다." },
        status: 409
      };
    }

    if (currentItem.questionId !== body.questionId) {
      return {
        body: { ok: false, message: "현재 순서의 문제만 평가할 수 있습니다." },
        status: 409
      };
    }

    if (
      !currentItem.answeredAt ||
      !currentItem.selected ||
      currentItem.isCorrect === null
    ) {
      return {
        body: { ok: false, message: "정답 확인 후 자가평가를 선택해주세요." },
        status: 409
      };
    }

    if (currentItem.ratedAt) {
      return {
        body: { ok: false, message: "이미 평가가 끝난 문제입니다." },
        status: 409
      };
    }

    const now = new Date();
    const scheduled = scheduleSm2Review({
      rating: rating as ReviewRating,
      reviewedAt: now,
      state: currentItem.question.studyState
    });
    const nextIndex = session.currentIndex + 1;
    const complete = nextIndex >= session.totalQuestions;
    const correctCount = session.correctCount + (currentItem.isCorrect ? 1 : 0);

    await transaction.questionStudyState.upsert({
      where: { questionId: currentItem.question.id },
      create: {
        questionId: currentItem.question.id,
        algorithm: scheduled.algorithm,
        dueAt: scheduled.nextDueAt,
        intervalDays: scheduled.nextIntervalDays,
        easeFactor: scheduled.nextEaseFactor,
        repetitions: scheduled.nextRepetitions,
        lastReviewedAt: now
      },
      update: {
        algorithm: scheduled.algorithm,
        dueAt: scheduled.nextDueAt,
        intervalDays: scheduled.nextIntervalDays,
        easeFactor: scheduled.nextEaseFactor,
        repetitions: scheduled.nextRepetitions,
        lastReviewedAt: now
      }
    });

    await transaction.studyReviewLog.create({
      data: {
        questionId: currentItem.question.id,
        sessionId: session.id,
        algorithm: scheduled.algorithm,
        rating,
        quality: scheduled.quality,
        selected: currentItem.selected,
        wasCorrect: currentItem.isCorrect,
        previousDueAt: scheduled.previousDueAt,
        nextDueAt: scheduled.nextDueAt,
        previousIntervalDays: scheduled.previousIntervalDays,
        nextIntervalDays: scheduled.nextIntervalDays,
        previousEaseFactor: scheduled.previousEaseFactor,
        nextEaseFactor: scheduled.nextEaseFactor,
        previousRepetitions: scheduled.previousRepetitions,
        nextRepetitions: scheduled.nextRepetitions,
        reviewedAt: now
      }
    });

    await transaction.studySessionItem.update({
      where: { id: currentItem.id },
      data: {
        rating,
        ratedAt: now
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

    if (currentItem.isCorrect) {
      await transaction.wrongNote.updateMany({
        where: {
          questionId: currentItem.question.id,
          status: "ACTIVE"
        },
        data: {
          status: "RESOLVED",
          reviewedAt: now,
          dueAt: null
        }
      });
    } else {
      await transaction.wrongNote.upsert({
        where: { questionId: currentItem.question.id },
        create: {
          questionId: currentItem.question.id,
          wrongCount: 1,
          lastWrongAt: now,
          status: "ACTIVE",
          dueAt: scheduled.nextDueAt,
          intervalDays: scheduled.nextIntervalDays,
          easeFactor: scheduled.nextEaseFactor
        },
        update: {
          wrongCount: { increment: 1 },
          lastWrongAt: now,
          status: "ACTIVE",
          dueAt: scheduled.nextDueAt,
          intervalDays: scheduled.nextIntervalDays,
          easeFactor: scheduled.nextEaseFactor
        }
      });
    }

    return {
      body: {
        ok: true,
        currentIndex: nextIndex,
        totalQuestions: session.totalQuestions,
        complete,
        correctCount,
        nextDueAt: scheduled.nextDueAt.toISOString(),
        intervalDays: scheduled.nextIntervalDays,
        easeFactor: scheduled.nextEaseFactor
      },
      status: 200
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
