import { notFound, redirect } from "next/navigation";

import { StudyStartPanel } from "@/components/study-start-panel";
import { StudySession } from "@/components/study-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ setId: string }> | { setId: string };
  searchParams:
    | Promise<{ sessionId?: string | string[] }>
    | { sessionId?: string | string[] };
};

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
        include: { question: true }
      }
    }
  });

  if (!session || session.setId !== set.id) {
    notFound();
  }

  if (session.status === "ABANDONED") {
    redirect(`/study/${set.id}`);
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
        setId={set.id}
        setTitle={set.title}
      />
    </main>
  );
}
