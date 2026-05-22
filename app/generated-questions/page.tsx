import { GeneratedQuestionReview } from "@/components/generated-question-review";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GeneratedQuestionsPage() {
  const drafts = await prisma.generatedQuestionDraft.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      set: {
        select: { title: true }
      }
    }
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">AI GENERATED QUESTIONS</p>
          <h1>AI 생성 문제 검토</h1>
          <p className="muted">
            AI가 만든 유사 문제는 승인한 뒤에만 실제 문제집에 추가됩니다.
          </p>
        </div>
      </section>
      <GeneratedQuestionReview
        drafts={drafts.map((draft) => ({
          category: draft.category,
          choiceA: draft.choiceA,
          choiceB: draft.choiceB,
          choiceC: draft.choiceC,
          choiceD: draft.choiceD,
          correct: draft.correct,
          explanation: draft.explanation,
          id: draft.id,
          prompt: draft.prompt,
          rationale: draft.rationale,
          setTitle: draft.set.title,
          tag: draft.tag
        }))}
      />
    </main>
  );
}
