import { NextRequest, NextResponse } from "next/server";

import { validateQuestionCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, errors: [{ row: 1, message: "CSV 파일이 필요합니다." }] },
      { status: 400 }
    );
  }

  const titleInput = String(formData.get("title") || "").trim();
  const descriptionInput = String(formData.get("description") || "").trim();
  const title = titleInput || file.name.replace(/\.csv$/i, "") || "새 문제 세트";
  const csvText = await file.text();
  const { questions, errors } = validateQuestionCsv(csvText);

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const set = await prisma.questionSet.create({
    data: {
      title,
      description: descriptionInput || null,
      questions: {
        create: questions.map((question, index) => ({
          prompt: question.question,
          choiceA: question.choiceA,
          choiceB: question.choiceB,
          choiceC: question.choiceC,
          choiceD: question.choiceD,
          correct: question.correct,
          explanation: question.explanation,
          tag: question.tag ?? null,
          category: question.category ?? null,
          order: index + 1
        }))
      }
    },
    include: {
      _count: { select: { questions: true } }
    }
  });

  return NextResponse.json({
    ok: true,
    setId: set.id,
    title: set.title,
    count: set._count.questions
  });
}
