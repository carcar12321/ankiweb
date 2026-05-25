import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { normalizeCategoryFilters } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import {
  selectStudyQuestionIds,
  selectWeightedReviewQuestionIds
} from "@/lib/study-session-logic";

const FIXED_CHOICE_ORDER = "ABCD" as const;

export const runtime = "nodejs";

function categoryWhere(
  categories: Array<string | null> | null
): Prisma.QuestionWhereInput {
  if (!categories) {
    return {};
  }

  const values = categories.filter((category): category is string =>
    Boolean(category)
  );
  const includeUncategorized = categories.some((category) => category === null);
  const filters: Prisma.QuestionWhereInput[] = [];

  if (values.length > 0) {
    filters.push({ category: { in: values } });
  }

  if (includeUncategorized) {
    filters.push({ category: null });
  }

  return filters.length > 0 ? { OR: filters } : { id: "__NO_MATCH__" };
}

function uniqueStrings(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    mode?: string;
    setId?: string;
    setIds?: string[];
    categories?: Array<string | null>;
    questionCount?: number;
    selection?: string;
  } | null;
  const mode =
    body?.mode === "RANDOM" || body?.mode === "REVIEW" ? body.mode : "SET";
  const categories = normalizeCategoryFilters(body?.categories);
  const selection =
    body?.selection === "DUE" || body?.selection === "NEW" ? body.selection : "ALL";

  if (!body) {
    return NextResponse.json(
      { ok: false, message: "학습 세션 정보를 확인할 수 없습니다." },
      { status: 400 }
    );
  }

  const questionCount = Number(body.questionCount);

  if (!Number.isInteger(questionCount)) {
    return NextResponse.json(
      { ok: false, message: "풀 문제 개수를 숫자로 입력해주세요." },
      { status: 400 }
    );
  }

  if (categories && categories.length === 0) {
    return NextResponse.json(
      { ok: false, message: "최소 1개 이상의 part를 선택해주세요." },
      { status: 400 }
    );
  }

  if (mode === "SET") {
    if (!body.setId) {
      return NextResponse.json(
        { ok: false, message: "문제집을 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    const set = await prisma.questionSet.findUnique({
      where: { id: body.setId },
      include: {
        questions: {
          where: categoryWhere(categories),
          orderBy: { order: "asc" },
          include: { studyState: true }
        }
      }
    });

    if (!set) {
      return NextResponse.json(
        { ok: false, message: "문제집을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const totalQuestions = set.questions.length;

    if (totalQuestions === 0) {
      return NextResponse.json(
        { ok: false, message: "선택한 범위에 문제가 없습니다." },
        { status: 400 }
      );
    }

    if (questionCount < 1 || questionCount > totalQuestions) {
      return NextResponse.json(
        {
          ok: false,
          message: `풀 문제 개수는 1개부터 ${totalQuestions}개까지 가능합니다.`
        },
        { status: 400 }
      );
    }

    const selectedQuestionIds = selectStudyQuestionIds(
      set.questions.map((question) => ({
        id: question.id,
        order: question.order,
        dueAt: question.studyState?.dueAt ?? null,
        hasStudyState: Boolean(question.studyState)
      })),
      questionCount
    );

    const now = new Date();
    const session = await prisma.$transaction(async (transaction) => {
      await transaction.studySession.updateMany({
        where: {
          mode: "SET",
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
          mode: "SET",
          algorithm: "SM2",
          totalQuestions: selectedQuestionIds.length,
          items: {
            create: selectedQuestionIds.map((questionId, position) => ({
              choiceOrder: FIXED_CHOICE_ORDER,
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
      mode,
      sessionId: session.id
    });
  }

  const setIds = uniqueStrings(body.setIds);

  if (setIds.length === 0) {
    return NextResponse.json(
      { ok: false, message: "랜덤학습에 사용할 문제집을 선택해주세요." },
      { status: 400 }
    );
  }

  const sets = await prisma.questionSet.findMany({
    where: { id: { in: setIds } },
    select: { id: true }
  });

  if (sets.length !== setIds.length) {
    return NextResponse.json(
      { ok: false, message: "선택한 문제집 중 찾을 수 없는 항목이 있습니다." },
      { status: 404 }
    );
  }

  if (mode === "REVIEW") {
    const reviewedQuestions = await prisma.question.findMany({
      where: {
        setId: { in: setIds },
        attempts: { some: {} },
        ...categoryWhere(categories)
      },
      orderBy: [{ setId: "asc" }, { order: "asc" }],
      include: {
        attempts: {
          orderBy: { answeredAt: "desc" },
          select: { isCorrect: true },
          take: 1
        },
        reviewLogs: {
          orderBy: { reviewedAt: "desc" },
          select: { rating: true },
          take: 1
        },
        studyState: true,
        wrongNote: {
          select: { status: true }
        }
      }
    });
    const totalQuestions = reviewedQuestions.length;

    if (totalQuestions === 0) {
      return NextResponse.json(
        { ok: false, message: "복습할 풀이 이력이 있는 문제가 없습니다." },
        { status: 400 }
      );
    }

    if (questionCount < 1 || questionCount > totalQuestions) {
      return NextResponse.json(
        {
          ok: false,
          message: `총 문제 개수는 1개부터 ${totalQuestions}개까지 가능합니다.`
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const selectedQuestionIds = selectWeightedReviewQuestionIds(
      reviewedQuestions.map((question, index) => ({
        id: question.id,
        order: index + 1,
        dueAt: question.studyState?.dueAt ?? null,
        hasActiveWrongNote: question.wrongNote?.status === "ACTIVE",
        hasAttempt: question.attempts.length > 0,
        lastAttemptWasCorrect: question.attempts[0]?.isCorrect ?? null,
        lastRating: question.reviewLogs[0]?.rating ?? null
      })),
      questionCount,
      { now }
    );
    const session = await prisma.$transaction(async (transaction) => {
      await transaction.studySession.updateMany({
        where: {
          mode: "REVIEW",
          status: "ACTIVE"
        },
        data: {
          status: "ABANDONED",
          abandonedAt: now
        }
      });

      return transaction.studySession.create({
        data: {
          setId: null,
          mode: "REVIEW",
          algorithm: "SM2",
          totalQuestions: selectedQuestionIds.length,
          sourceSets: {
            create: setIds.map((setId) => ({ setId }))
          },
          items: {
            create: selectedQuestionIds.map((questionId, position) => ({
              choiceOrder: FIXED_CHOICE_ORDER,
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
      mode,
      sessionId: session.id
    });
  }

  const allQuestions = await prisma.question.findMany({
    where: {
      setId: { in: setIds },
      ...categoryWhere(categories)
    },
    orderBy: [{ setId: "asc" }, { order: "asc" }],
    include: { studyState: true }
  });
  const now = new Date();
  const questions = allQuestions.filter((question) => {
    if (selection === "DUE") {
      return question.studyState && question.studyState.dueAt <= now;
    }

    if (selection === "NEW") {
      return !question.studyState;
    }

    return true;
  });
  const totalQuestions = questions.length;

  if (totalQuestions === 0) {
    return NextResponse.json(
      { ok: false, message: "선택한 범위에 문제가 없습니다." },
      { status: 400 }
    );
  }

  if (questionCount < 1 || questionCount > totalQuestions) {
    return NextResponse.json(
      {
        ok: false,
        message: `풀 문제 개수는 1개부터 ${totalQuestions}개까지 가능합니다.`
      },
      { status: 400 }
    );
  }

  const selectedQuestionIds = selectStudyQuestionIds(
    questions.map((question, index) => ({
      id: question.id,
      order: index + 1,
      dueAt: question.studyState?.dueAt ?? null,
      hasStudyState: Boolean(question.studyState)
    })),
    questionCount
  );
  const session = await prisma.$transaction(async (transaction) => {
    await transaction.studySession.updateMany({
      where: {
        mode: "RANDOM",
        status: "ACTIVE"
      },
      data: {
        status: "ABANDONED",
        abandonedAt: now
      }
    });

    return transaction.studySession.create({
      data: {
        setId: null,
        mode: "RANDOM",
        algorithm: "SM2",
        totalQuestions: selectedQuestionIds.length,
        sourceSets: {
          create: setIds.map((setId) => ({ setId }))
        },
        items: {
          create: selectedQuestionIds.map((questionId, position) => ({
            choiceOrder: FIXED_CHOICE_ORDER,
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
    mode,
    sessionId: session.id
  });
}
