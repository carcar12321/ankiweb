import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    content?: string;
    title?: string | null;
  } | null;
  const content = body?.content?.trim();
  const title = body?.title?.trim() || content?.slice(0, 48);

  if (!content) {
    return NextResponse.json(
      { ok: false, message: "메모 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  const memo = await prisma.studyMemo
    .update({
      where: { id },
      data: {
        content,
        title
      }
    })
    .catch(() => null);

  if (!memo) {
    return NextResponse.json(
      { ok: false, message: "메모를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.studyMemo.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
