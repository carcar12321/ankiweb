import { NextRequest, NextResponse } from "next/server";

import {
  buildWrongNotesMarkdown,
  makeMarkdownFileName,
  markdownDownloadHeaders
} from "@/lib/markdown-export";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
  const body = (await request.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = uniqueStrings(body?.ids);

  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Export할 오답노트를 선택해주세요." },
      { status: 400 }
    );
  }

  const notes = await prisma.wrongNote.findMany({
    where: {
      id: { in: ids },
      status: "ACTIVE"
    },
    orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
    include: {
      question: {
        include: {
          set: {
            select: { title: true }
          }
        }
      }
    }
  });

  if (notes.length === 0) {
    return NextResponse.json(
      { ok: false, message: "선택한 활성 오답노트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const exportedAt = new Date();
  await prisma.wrongNote.updateMany({
    where: { id: { in: notes.map((note) => note.id) } },
    data: { exportedAt }
  });

  const fileName = makeMarkdownFileName("wrong-notes-selected");
  const markdown = buildWrongNotesMarkdown(
    notes.map((note) => ({
      lastWrongAt: note.lastWrongAt,
      manuallyAddedAt: note.manuallyAddedAt,
      question: {
        category: note.question.category,
        choiceA: note.question.choiceA,
        choiceB: note.question.choiceB,
        choiceC: note.question.choiceC,
        choiceD: note.question.choiceD,
        correct: note.question.correct,
        explanation: note.question.explanation,
        prompt: note.question.prompt,
        set: note.question.set,
        tag: note.question.tag
      },
      wrongCount: note.wrongCount
    })),
    exportedAt
  );

  return new NextResponse(markdown, {
    headers: markdownDownloadHeaders(fileName)
  });
}
