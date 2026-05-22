import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { scheduleSm2Review } from "@/lib/scheduler";
import {
  getWrongNoteAction,
  normalizeChoice,
  scoreAnswer
} from "@/lib/study-logic";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    questionId?: string;
    selected?: string;
    reviewMode?: boolean;
  } | null;
  const selected = normalizeChoice(body?.selected);

  if (!body?.questionId || !selected) {
    return NextResponse.json(
      { ok: false, message: "questionId와 selected가 필요합니다." },
      { status: 400 }
    );
  }

  const question = await prisma.question.findUnique({
    where: { id: body.questionId },
    include: { studyState: true }
  });

  if (!question) {
    return NextResponse.json(
      { ok: false, message: "문제를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const outcome = scoreAnswer(question.correct, selected);
  const action = getWrongNoteAction({
    isCorrect: outcome.isCorrect,
    reviewMode: Boolean(body.reviewMode)
  });
  const now = new Date();
  const rating = outcome.isCorrect ? "GOOD" : "AGAIN";
  const scheduled = scheduleSm2Review({
    rating,
    reviewedAt: now,
    state: question.studyState
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.attempt.create({
      data: {
        questionId: question.id,
        setId: question.setId,
        selected,
        isCorrect: outcome.isCorrect
      }
    });

    await transaction.questionStudyState.upsert({
      where: { questionId: question.id },
      create: {
        questionId: question.id,
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
        questionId: question.id,
        algorithm: scheduled.algorithm,
        rating,
        quality: scheduled.quality,
        selected,
        wasCorrect: outcome.isCorrect,
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

    if (action === "increment") {
      await transaction.wrongNote.upsert({
        where: { questionId: question.id },
        create: {
          questionId: question.id,
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

    if (action === "resolve") {
      await transaction.wrongNote.updateMany({
        where: {
          questionId: question.id,
          status: "ACTIVE"
        },
        data: {
          status: "RESOLVED",
          reviewedAt: now,
          dueAt: null
        }
      });
    }
  });

  return NextResponse.json({
    isCorrect: outcome.isCorrect,
    correctChoice: outcome.correctChoice,
    explanation: question.explanation
  });
}
