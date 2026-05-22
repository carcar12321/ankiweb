import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizeChoice } from "@/lib/study-logic";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ draftId: string }> | { draftId: string };
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { draftId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: "approve" | "reject";
    category?: string | null;
    choiceA?: string;
    choiceB?: string;
    choiceC?: string;
    choiceD?: string;
    correct?: string;
    explanation?: string;
    prompt?: string;
    tag?: string | null;
  } | null;

  if (body?.action !== "approve" && body?.action !== "reject") {
    return NextResponse.json(
      { ok: false, message: "승인 또는 거절 작업이 필요합니다." },
      { status: 400 }
    );
  }

  if (body.action === "reject") {
    const draft = await prisma.generatedQuestionDraft
      .update({
        where: { id: draftId },
        data: { status: "REJECTED" }
      })
      .catch(() => null);

    if (!draft) {
      return NextResponse.json(
        { ok: false, message: "생성 문제 초안을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, status: draft.status });
  }

  const correct = normalizeChoice(body.correct);
  const requiredValues = [
    body.prompt,
    body.choiceA,
    body.choiceB,
    body.choiceC,
    body.choiceD,
    body.explanation
  ];

  if (!correct || requiredValues.some((value) => !value?.trim())) {
    return NextResponse.json(
      { ok: false, message: "문제, 보기, 정답, 해설을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const draft = await transaction.generatedQuestionDraft.findUnique({
      where: { id: draftId }
    });

    if (!draft) {
      return null;
    }

    if (draft.status !== "PENDING") {
      return { draft, question: null };
    }

    const lastQuestion = await transaction.question.findFirst({
      where: { setId: draft.setId },
      orderBy: { order: "desc" },
      select: { order: true }
    });
    const question = await transaction.question.create({
      data: {
        category: body.category?.trim() || null,
        choiceA: body.choiceA!.trim(),
        choiceB: body.choiceB!.trim(),
        choiceC: body.choiceC!.trim(),
        choiceD: body.choiceD!.trim(),
        correct,
        explanation: body.explanation!.trim(),
        order: (lastQuestion?.order ?? 0) + 1,
        prompt: body.prompt!.trim(),
        setId: draft.setId,
        tag: body.tag?.trim() || null
      }
    });
    const updatedDraft = await transaction.generatedQuestionDraft.update({
      where: { id: draft.id },
      data: {
        approvedAt: new Date(),
        approvedQuestionId: question.id,
        category: question.category,
        choiceA: question.choiceA,
        choiceB: question.choiceB,
        choiceC: question.choiceC,
        choiceD: question.choiceD,
        correct: question.correct,
        explanation: question.explanation,
        prompt: question.prompt,
        status: "APPROVED",
        tag: question.tag
      }
    });

    return { draft: updatedDraft, question };
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, message: "생성 문제 초안을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (!result.question) {
    return NextResponse.json(
      { ok: false, message: "이미 처리된 초안입니다." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    questionId: result.question.id,
    status: result.draft.status
  });
}
