import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const memos = await prisma.studyMemo.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      sourceQuestion: {
        select: { prompt: true }
      },
      sourceConversation: {
        select: { title: true }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    memos: memos.map((memo) => ({
      content: memo.content,
      createdAt: memo.createdAt.toISOString(),
      exportedAt: memo.exportedAt?.toISOString() ?? null,
      id: memo.id,
      sourceConversationTitle: memo.sourceConversation?.title ?? null,
      sourceQuestionPrompt: memo.sourceQuestion?.prompt ?? null,
      sourceText: memo.sourceText,
      sourceUrl: memo.sourceUrl,
      title: memo.title
    }))
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    content?: string;
    sourceConversationId?: string | null;
    sourceQuestionId?: string | null;
    sourceSessionId?: string | null;
    sourceText?: string | null;
    sourceUrl?: string | null;
    title?: string | null;
  } | null;
  const content = body?.content?.trim();
  const sourceConversationId = body?.sourceConversationId?.trim() || null;
  const sourceQuestionId = body?.sourceQuestionId?.trim() || null;
  const sourceSessionId = body?.sourceSessionId?.trim() || null;
  const sourceText = body?.sourceText?.trim() || null;
  const sourceUrl = body?.sourceUrl?.trim() || null;
  const title = body?.title?.trim() || content?.slice(0, 48);

  if (!content) {
    return NextResponse.json(
      { ok: false, message: "메모 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  const memo = await prisma.studyMemo.create({
    data: {
      content,
      sourceConversationId,
      sourceQuestionId,
      sourceSessionId,
      sourceText,
      sourceUrl,
      title
    }
  });

  return NextResponse.json({
    ok: true,
    memo: {
      createdAt: memo.createdAt.toISOString(),
      id: memo.id,
      title: memo.title
    }
  });
}
