import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { selectStudyQuestionIds } from "@/lib/study-session-logic";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    setId?: string;
    questionCount?: number;
  } | null;

  if (!body?.setId) {
    return NextResponse.json(
      { ok: false, message: "문제 세트를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const questionCount = Number(body.questionCount);

  if (!Number.isInteger(questionCount)) {
    return NextResponse.json(
      { ok: false, message: "공부할 문제 개수를 숫자로 입력해주세요." },
      { status: 400 }
    );
  }

  const set = await prisma.questionSet.findUnique({
    where: { id: body.setId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          attempts: {
            orderBy: { answeredAt: "desc" },
            select: { answeredAt: true },
            take: 1
          }
        }
      }
    }
  });

  if (!set) {
    return NextResponse.json(
      { ok: false, message: "문제 세트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const totalQuestions = set.questions.length;

  if (totalQuestions === 0) {
    return NextResponse.json(
      { ok: false, message: "이 세트에는 아직 문제가 없습니다." },
      { status: 400 }
    );
  }

  if (questionCount < 1 || questionCount > totalQuestions) {
    return NextResponse.json(
      {
        ok: false,
        message: `공부할 문제 개수는 1개부터 ${totalQuestions}개까지 가능합니다.`
      },
      { status: 400 }
    );
  }

  const selectedQuestionIds = selectStudyQuestionIds(
    set.questions.map((question) => ({
      id: question.id,
      order: question.order,
      lastAnsweredAt: question.attempts[0]?.answeredAt ?? null
    })),
    questionCount
  );

  const now = new Date();
  const session = await prisma.$transaction(async (transaction) => {
    await transaction.studySession.updateMany({
      where: {
        setId: set.id,
        status: "ACTIVE"
      },
      data: {
        status: "ABANDONED",
        abandonedAt: now
      }
    });

    return transaction.studySession.create({
      data: {
        setId: set.id,
        totalQuestions: selectedQuestionIds.length,
        items: {
          create: selectedQuestionIds.map((questionId, position) => ({
            questionId,
            position
          }))
        }
      },
      select: { id: true }
    });
  });

  return NextResponse.json({
    ok: true,
    sessionId: session.id
  });
}
