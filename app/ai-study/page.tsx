import { AiSettingsForm } from "@/components/ai-settings-form";
import { AiStudyWorkspace } from "@/components/ai-study-workspace";
import { aiModelOptions, aiReasoningEfforts } from "@/lib/ai-models";
import { getAiSettings } from "@/lib/ai-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiStudyPage() {
  const [settings, sets, conversations, reports] = await Promise.all([
    getAiSettings(),
    prisma.questionSet.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true }
    }),
    prisma.aiConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.aiSessionReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        content: true,
        createdAt: true,
        id: true,
        model: true,
        title: true
      }
    })
  ]);

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">AI STUDY</p>
          <h1>AI 학습실</h1>
          <p className="muted">
            API 키는 저장하지 않고, 질문 기록과 보고서만 Postgres에 남깁니다.
          </p>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginBottom: 18 }}>
        <AiSettingsForm
          modelOptions={[...aiModelOptions]}
          reasoningEfforts={aiReasoningEfforts}
          settings={settings}
        />
        <section className="panel">
          <p className="eyebrow">STORAGE</p>
          <h2>저장 정책</h2>
          <p className="muted">
            AI 질문/답변, 보고서, 메모, 생성 문제 초안은 Railway Postgres에
            저장됩니다. API 키 원문은 저장하지 않습니다.
          </p>
        </section>
      </section>

      <AiStudyWorkspace
        conversations={conversations.map((conversation) => ({
          createdAt: conversation.createdAt.toISOString(),
          id: conversation.id,
          latestMessage: conversation.messages[0]?.content ?? "",
          messageCount: conversation._count.messages,
          model: conversation.model,
          scope: conversation.scope,
          title: conversation.title,
          updatedAt: conversation.updatedAt.toISOString()
        }))}
        reports={reports.map((report) => ({
          content: report.content,
          createdAt: report.createdAt.toISOString(),
          id: report.id,
          model: report.model,
          title: report.title
        }))}
        sets={sets}
      />
    </main>
  );
}
