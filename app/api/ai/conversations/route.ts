import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const conversations = await prisma.aiConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  return NextResponse.json({
    ok: true,
    conversations: conversations.map((conversation) => ({
      createdAt: conversation.createdAt.toISOString(),
      id: conversation.id,
      latestMessage: conversation.messages[0]?.content ?? "",
      messageCount: conversation._count.messages,
      model: conversation.model,
      scope: conversation.scope,
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString()
    }))
  });
}
