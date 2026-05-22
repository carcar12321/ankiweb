import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function AiConversationPage({ params }: PageProps) {
  const { id } = await params;
  const conversation = await prisma.aiConversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!conversation) {
    notFound();
  }

  return (
    <main className="page page-narrow">
      <section className="page-header">
        <div>
          <p className="eyebrow">AI HISTORY</p>
          <h1>{conversation.title}</h1>
          <div className="pill-row">
            <span className="pill">{conversation.scope}</span>
            {conversation.model ? <span className="pill">{conversation.model}</span> : null}
            <span className="pill">
              {new Date(conversation.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
        <Link className="button-ghost" href="/ai-study">
          AI 학습실
        </Link>
      </section>

      <section className="panel ai-messages">
        {conversation.messages.map((message) => (
          <div
            className={`ai-message ${message.role === "ASSISTANT" ? "assistant" : "user"}`}
            key={message.id}
          >
            <strong>{message.role === "ASSISTANT" ? "AI" : "나"}</strong>
            <p>{message.content}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
