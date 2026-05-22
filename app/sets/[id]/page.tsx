import { notFound } from "next/navigation";
import Link from "next/link";

import { SetManagementPanel } from "@/components/set-management-panel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function SetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const set = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { attempts: true } }
    }
  });

  if (!set) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">QUESTION SET</p>
          <h1>{set.title}</h1>
          <p className="muted">
            {set.questions.length}문제 · 풀이 {set._count.attempts}회
          </p>
        </div>
        <Link className="button" href={`/study/${set.id}`}>
          이 세트 풀기
        </Link>
      </section>

      {set.description ? <p className="panel">{set.description}</p> : null}

      <SetManagementPanel
        description={set.description}
        exportFileName={set.exportFileName}
        setId={set.id}
        title={set.title}
      />

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>문제</th>
              <th>정답</th>
              <th>해설</th>
            </tr>
          </thead>
          <tbody>
            {set.questions.map((question, index) => (
              <tr key={question.id}>
                <td data-label="#">{index + 1}</td>
                <td data-label="문제">
                  <strong>{question.prompt}</strong>
                  <div className="pill-row" style={{ marginTop: 8 }}>
                    {question.category ? (
                      <span className="pill">{question.category}</span>
                    ) : null}
                    {question.tag ? <span className="pill">{question.tag}</span> : null}
                  </div>
                </td>
                <td data-label="정답">{question.correct}</td>
                <td data-label="해설">{question.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
