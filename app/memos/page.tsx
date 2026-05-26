import { MemoList } from "@/components/memo-list";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MemosPage() {
  const memos = await prisma.studyMemo.findMany({
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

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">MEMOS</p>
          <h1>메모장</h1>
          <p className="muted">
            화면에서 텍스트를 선택하고 오른쪽 클릭하면 바로 메모에 추가할 수
            있습니다.
          </p>
        </div>
      </section>
      <MemoList
        memos={memos.map((memo) => ({
          content: memo.content,
          createdAt: memo.createdAt.toISOString(),
          exportedAt: memo.exportedAt?.toISOString() ?? null,
          id: memo.id,
          sourceConversationTitle: memo.sourceConversation?.title ?? null,
          sourceQuestionPrompt: memo.sourceQuestion?.prompt ?? null,
          sourceText: memo.sourceText,
          sourceUrl: memo.sourceUrl,
          title: memo.title
        }))}
      />
    </main>
  );
}
