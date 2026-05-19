import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getWrongNoteAction,
  normalizeChoice,
  scoreAnswer
} from "@/lib/study-logic";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
    where: { id: body.questionId }
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

  await prisma.$transaction(async (transaction) => {
    await transaction.attempt.create({
      data: {
        questionId: question.id,
        setId: question.setId,
        selected,
        isCorrect: outcome.isCorrect
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
