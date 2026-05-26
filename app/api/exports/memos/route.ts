import { NextRequest, NextResponse } from "next/server";

import {
  buildMemosMarkdown,
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
      { ok: false, message: "Export할 메모를 선택해주세요." },
      { status: 400 }
    );
  }

  const memos = await prisma.studyMemo.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "desc" },
    include: {
      sourceConversation: {
        select: { title: true }
      },
      sourceQuestion: {
        select: { prompt: true }
      }
    }
  });

  if (memos.length === 0) {
    return NextResponse.json(
      { ok: false, message: "선택한 메모를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const exportedAt = new Date();
  await prisma.studyMemo.updateMany({
    where: { id: { in: memos.map((memo) => memo.id) } },
    data: { exportedAt }
  });

  const fileName = makeMarkdownFileName("memos-selected");
  const markdown = buildMemosMarkdown(
    memos.map((memo) => ({
      content: memo.content,
      createdAt: memo.createdAt,
      sourceConversationTitle: memo.sourceConversation?.title ?? null,
      sourceQuestionPrompt: memo.sourceQuestion?.prompt ?? null,
      sourceText: memo.sourceText,
      sourceUrl: memo.sourceUrl,
      title: memo.title
    })),
    exportedAt
  );

  return new NextResponse(markdown, {
    headers: markdownDownloadHeaders(fileName)
  });
}
