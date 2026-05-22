import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const conversation = await prisma.aiConversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!conversation) {
    return NextResponse.json(
      { ok: false, message: "AI 기록을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    conversation: {
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      messages: conversation.messages.map((message) => ({
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        id: message.id,
        model: message.model,
        role: message.role
      })),
      model: conversation.model,
      scope: conversation.scope,
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString()
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.aiConversation.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
