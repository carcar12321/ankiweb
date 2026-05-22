import type { AiConversationScope, AiMessageRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function truncate(value: string, length = 72) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length - 1)}…` : compact;
}

export function makeConversationTitle(prefix: string, text: string) {
  return `${prefix}: ${truncate(text)}`;
}

export async function createAiConversation(input: {
  model?: string;
  scope: AiConversationScope;
  sourceQuestionId?: string | null;
  sourceSessionId?: string | null;
  title: string;
}) {
  return prisma.aiConversation.create({
    data: {
      model: input.model,
      scope: input.scope,
      sourceQuestionId: input.sourceQuestionId ?? null,
      sourceSessionId: input.sourceSessionId ?? null,
      title: input.title
    }
  });
}

export async function appendAiMessage(input: {
  content: string;
  conversationId: string;
  model?: string | null;
  role: AiMessageRole;
}) {
  return prisma.aiMessage.create({
    data: {
      content: input.content,
      conversationId: input.conversationId,
      model: input.model ?? null,
      role: input.role
    }
  });
}

export async function touchAiConversation(id: string, model?: string) {
  return prisma.aiConversation.update({
    where: { id },
    data: {
      model,
      updatedAt: new Date()
    }
  });
}

export async function persistAiExchange(input: {
  assistant: string;
  conversationId?: string | null;
  model: string;
  scope: AiConversationScope;
  sourceQuestionId?: string | null;
  sourceSessionId?: string | null;
  title: string;
  user: string;
}) {
  const conversation = input.conversationId
    ? await touchAiConversation(input.conversationId, input.model)
    : await createAiConversation({
        model: input.model,
        scope: input.scope,
        sourceQuestionId: input.sourceQuestionId,
        sourceSessionId: input.sourceSessionId,
        title: input.title
      });

  await prisma.aiMessage.createMany({
    data: [
      {
        content: input.user,
        conversationId: conversation.id,
        role: "USER"
      },
      {
        content: input.assistant,
        conversationId: conversation.id,
        model: input.model,
        role: "ASSISTANT"
      }
    ]
  });

  return conversation;
}
