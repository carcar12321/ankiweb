import { notFound, redirect } from "next/navigation";

import { ReviewStartPanel } from "@/components/review-start-panel";
import { StudySession } from "@/components/study-session";
import { getCategoryKey, getCategoryLabel } from "@/lib/categories";
import { toDisplayedChoices, toDisplayChoice } from "@/lib/choice-order";
import { prisma } from "@/lib/prisma";
import { getWeakPartRecommendations } from "@/lib/study-insights";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams:
    | Promise<{ sessionId?: string | string[] }>
    | { sessionId?: string | string[] };
};

type ReviewQuestionSummary = {
  category: string | null;
  reviewLogs: Array<{ rating: "AGAIN" | "HARD" | "GOOD" | "EASY" }>;
  studyState: { dueAt: Date } | null;
  wrongNote: { status: string } | null;
};

function buildReviewParts(questions: ReviewQuestionSummary[], now: Date) {
  const counts = new Map<
    string,
    {
      activeWrongCount: number;
      againCount: number;
      category: string | null;
      count: number;
      dueCount: number;
      hardCount: number;
    }
  >();

  questions.forEach((question) => {
    const key = getCategoryKey(question.category);
    const current = counts.get(key) ?? {
      activeWrongCount: 0,
      againCount: 0,
      category: question.category,
      count: 0,
      dueCount: 0,
      hardCount: 0
    };
    const lastRating = question.reviewLogs[0]?.rating;

    current.count += 1;
    current.againCount += lastRating === "AGAIN" ? 1 : 0;
    current.hardCount += lastRating === "HARD" ? 1 : 0;
    current.dueCount +=
      question.studyState && question.studyState.dueAt <= now ? 1 : 0;
    current.activeWrongCount += question.wrongNote?.status === "ACTIVE" ? 1 : 0;
    counts.set(key, current);
  });

  return Array.from(counts.values()).sort((left, right) =>
    getCategoryLabel(left.category).localeCompare(getCategoryLabel(right.category))
  );
}

export default async function ReviewPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedSessionId = Array.isArray(resolvedSearchParams.sessionId)
    ? resolvedSearchParams.sessionId[0]
    : resolvedSearchParams.sessionId;

  if (!requestedSessionId) {
    const now = new Date();
    const [sets, activeSession, recentReviewLogs] = await Promise.all([
      prisma.questionSet.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          questions: {
            where: {
              attempts: { some: {} }
            },
            select: {
              category: true,
              reviewLogs: {
                orderBy: { reviewedAt: "desc" },
                select: { rating: true },
                take: 1
              },
              studyState: {
                select: { dueAt: true }
              },
              wrongNote: {
                select: { status: true }
              }
            }
          }
        }
      }),
      prisma.studySession.findFirst({
        where: {
          mode: "REVIEW",
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
      }),
      prisma.studyReviewLog.findMany({
        orderBy: { reviewedAt: "desc" },
        take: 100,
        include: {
          question: {
            select: { category: true }
          }
        }
      })
    ]);
    const reviewSets = sets
      .map((set) => ({
        id: set.id,
        parts: buildReviewParts(set.questions, now),
        title: set.title,
        totalReviewed: set.questions.length
      }))
      .filter((set) => set.totalReviewed > 0);
    const recommendations = getWeakPartRecommendations(
      recentReviewLogs.map((log) => ({
        category: log.question.category,
        rating: log.rating
      }))
    );

    return (
      <main className="page page-narrow">
        <ReviewStartPanel
          activeSession={
            activeSession
              ? {
                  ...activeSession,
                  updatedAt: activeSession.updatedAt.toISOString()
                }
              : null
          }
          recommendations={recommendations}
          sets={reviewSets}
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

  if (!session || session.mode !== "REVIEW") {
    notFound();
  }

  if (session.status === "ABANDONED") {
    redirect("/review");
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
        setupHref="/review"
        setTitle="복습하기"
      />
    </main>
  );
}
