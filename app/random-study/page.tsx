import { notFound, redirect } from "next/navigation";

import { RandomStudyStartPanel } from "@/components/random-study-start-panel";
import { StudySession } from "@/components/study-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams:
    | Promise<{ sessionId?: string | string[] }>
    | { sessionId?: string | string[] };
};

function buildParts(questions: Array<{ category: string | null }>) {
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

export default async function RandomStudyPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedSessionId = Array.isArray(resolvedSearchParams.sessionId)
    ? resolvedSearchParams.sessionId[0]
    : resolvedSearchParams.sessionId;

  if (!requestedSessionId) {
    const [sets, activeSession] = await Promise.all([
      prisma.questionSet.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          questions: {
            select: { category: true }
          },
          _count: { select: { questions: true } }
        }
      }),
      prisma.studySession.findFirst({
        where: {
          mode: "RANDOM",
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
      })
    ]);

    return (
      <main className="page page-narrow">
        <RandomStudyStartPanel
          activeSession={
            activeSession
              ? {
                  ...activeSession,
                  updatedAt: activeSession.updatedAt.toISOString()
                }
              : null
          }
          sets={sets.map((set) => ({
            id: set.id,
            title: set.title,
            totalQuestions: set._count.questions,
            parts: buildParts(set.questions)
          }))}
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
            include: {
              set: true,
              studyState: true
            }
          }
        }
      }
    }
  });

  if (!session || session.mode !== "RANDOM") {
    notFound();
  }

  if (session.status === "ABANDONED") {
    redirect("/random-study");
  }

  const questions = session.items.map((item) => ({
    id: item.question.id,
    prompt: item.question.prompt,
    choices: {
      A: item.question.choiceA,
      B: item.question.choiceB,
      C: item.question.choiceC,
      D: item.question.choiceD
    },
    correctChoice: item.answeredAt ? item.question.correct : null,
    explanation: item.answeredAt ? item.question.explanation : null,
    selected: item.selected,
    isCorrect: item.isCorrect,
    answeredAt: item.answeredAt?.toISOString() ?? null,
    rating: item.rating,
    nextDueAt: item.question.studyState?.dueAt.toISOString() ?? null,
    setTitle: item.question.set.title,
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
        setupHref="/random-study"
        setTitle="랜덤학습"
      />
    </main>
  );
}
