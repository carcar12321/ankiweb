import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    description?: string | null;
    exportFileName?: string | null;
    title?: string;
  } | null;

  const title = body?.title?.trim();
  const description = body?.description?.trim() || null;
  const exportFileName = body?.exportFileName?.trim() || null;

  if (!title) {
    return NextResponse.json(
      { ok: false, message: "문제집명을 입력해주세요." },
      { status: 400 }
    );
  }

  const set = await prisma.questionSet
    .update({
      where: { id },
      data: {
        description,
        exportFileName,
        title
      },
      select: {
        description: true,
        exportFileName: true,
        id: true,
        title: true
      }
    })
    .catch(() => null);

  if (!set) {
    return NextResponse.json(
      { ok: false, message: "문제집을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, set });
}
