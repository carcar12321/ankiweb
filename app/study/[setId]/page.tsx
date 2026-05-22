import { notFound, redirect } from "next/navigation";

import { StudyStartPanel } from "@/components/study-start-panel";
import { StudySession } from "@/components/study-session";
import { toDisplayedChoices, toDisplayChoice } from "@/lib/choice-order";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ setId: string }> | { setId: string };
  searchParams:
    | Promise<{ sessionId?: string | string[] }>
    | { sessionId?: string | string[] };
};

function buildPartOptions(questions: Array<{ category: string | null }>) {
  const counts = new Map<string, { category: string | null; count: number }>();

  questions.forEach((question) => {
    const key = question.category ?? "__UNCATEGORIZED__";
    const current = counts.get(key);
    counts.set(key, {
      category: question.category,
      count: (current?.count ?? 0) + 1
    });
  });

  return Array.from(counts.values()).sort((left, right) =>
    (left.category ?? "미분류").localeCompare(right.category ?? "미분류")
  );
}

export default async function StudyPage({ params, searchParams }: PageProps) {
  const { setId } = await params;
  const resolvedSearchParams = await searchParams;
  const requestedSessionId = Array.isArray(resolvedSearchParams.sessionId)
    ? resolvedSearchParams.sessionId[0]
    : resolvedSearchParams.sessionId;

  const set = await prisma.questionSet.findUnique({
    where: { id: setId },
    select: {
      id: true,
      title: true,
      questions: {
        select: { category: true }
      },
      _count: {
        select: { questions: true }
      }
    }
  });

  if (!set) {
    notFound();
  }

  if (!requestedSessionId) {
    const activeSession = await prisma.studySession.findFirst({
      where: {
        mode: "SET",
        setId: set.id,
        status: "ACTIVE"
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        totalQuestions: true,
        currentIndex: true,
        correctCount: true,
        updatedAt: true
      }
    });

    return (
      <main className="page page-narrow">
        <StudyStartPanel
          activeSession={
            activeSession
              ? {
                  ...activeSession,
                  updatedAt: activeSession.updatedAt.toISOString()
                }
              : null
          }
          partOptions={buildPartOptions(set.questions)}
          setId={set.id}
          setTitle={set.title}
          totalQuestions={set._count.questions}
        />
      </main>
    );
  }

  const session = await prisma.studySession.findUnique({
    where: { id: requestedSessionId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          question: {
            include: { studyState: true }
          }
        }
      }
    }
  });

  if (!session || session.setId !== set.id || session.mode !== "SET") {
    notFound();
  }

  if (session.status === "ABANDONED") {
    redirect(`/study/${set.id}`);
  }

  const questions = session.items.map((item) => ({
    id: item.question.id,
    prompt: item.question.prompt,
    choiceOrder: item.choiceOrder,
    choices: toDisplayedChoices(item.choiceOrder, {
      A: item.question.choiceA,
      B: item.question.choiceB,
      C: item.question.choiceC,
      D: item.question.choiceD
    }),
    correctChoice: item.answeredAt
      ? toDisplayChoice(item.choiceOrder, item.question.correct)
      : null,
    explanation: item.answeredAt ? item.question.explanation : null,
    selected: item.selected ? toDisplayChoice(item.choiceOrder, item.selected) : null,
    isCorrect: item.isCorrect,
    answeredAt: item.answeredAt?.toISOString() ?? null,
    rating: item.rating,
    nextDueAt: item.question.studyState?.dueAt.toISOString() ?? null,
    tag: item.question.tag,
    category: item.question.category
  }));

  return (
    <main className="page page-narrow">
      <StudySession
        initialCorrectCount={session.correctCount}
        initialIndex={Math.min(session.currentIndex, questions.length)}
        questions={questions}
        sessionId={session.id}
        setupHref={`/study/${set.id}`}
        setTitle={set.title}
      />
    </main>
  );
}
