import { reviewRatings, type ReviewRating } from "@/lib/scheduler";

export const uncategorizedPartLabel = "미분류";
const uncategorizedPartKey = "__UNCATEGORIZED__";

export type ReviewLoadCandidate = {
  dueAt?: Date | string | null;
  hasStudyState: boolean;
};

export type ReviewLogSummaryCandidate = {
  category?: string | null;
  rating: ReviewRating;
};

export type SessionReportItem = {
  category?: string | null;
  isCorrect?: boolean | null;
  rating?: ReviewRating | null;
  nextDueAt?: Date | string | null;
};

function toTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function partLabel(category: string | null | undefined) {
  return category && category.length > 0 ? category : uncategorizedPartLabel;
}

function partKey(category: string | null | undefined) {
  return category && category.length > 0 ? category : uncategorizedPartKey;
}

function normalizePartCategory(category: string | null | undefined) {
  return category && category.length > 0 ? category : null;
}

export function summarizeReviewLoad(
  candidates: ReviewLoadCandidate[],
  now = new Date()
) {
  const nowTime = now.getTime();
  const todayStartTime = startOfDay(now).getTime();

  return candidates.reduce(
    (summary, candidate) => {
      const dueTime = toTime(candidate.dueAt);

      if (!candidate.hasStudyState) {
        summary.newCount += 1;
      }

      if (candidate.hasStudyState && dueTime !== null && dueTime <= nowTime) {
        summary.dueCount += 1;
      }

      if (candidate.hasStudyState && dueTime !== null && dueTime < todayStartTime) {
        summary.overdueCount += 1;
      }

      return summary;
    },
    {
      dueCount: 0,
      newCount: 0,
      overdueCount: 0
    }
  );
}

export function shouldAppendAgainReplay(
  sessionItems: Array<{ questionId: string }>,
  questionId: string,
  rating: ReviewRating
) {
  if (rating !== "AGAIN") {
    return false;
  }

  return sessionItems.filter((item) => item.questionId === questionId).length === 1;
}

export function getWeakPartRecommendations(
  logs: ReviewLogSummaryCandidate[],
  limit = 3
) {
  const grouped = new Map<
    string,
    {
      category: string | null;
      part: string;
      total: number;
      weak: number;
      again: number;
      hard: number;
    }
  >();

  logs.forEach((log) => {
    const category = normalizePartCategory(log.category);
    const key = partKey(category);
    const current = grouped.get(key) ?? {
      category,
      part: partLabel(category),
      total: 0,
      weak: 0,
      again: 0,
      hard: 0
    };

    current.total += 1;

    if (log.rating === "AGAIN" || log.rating === "HARD") {
      current.weak += 1;
    }

    if (log.rating === "AGAIN") {
      current.again += 1;
    }

    if (log.rating === "HARD") {
      current.hard += 1;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .filter((item) => item.weak > 0)
    .map((item) => ({
      ...item,
      weakRate: item.total === 0 ? 0 : item.weak / item.total
    }))
    .sort((left, right) => {
      const rateDiff = right.weakRate - left.weakRate;
      if (rateDiff !== 0) {
        return rateDiff;
      }

      const weakDiff = right.weak - left.weak;
      if (weakDiff !== 0) {
        return weakDiff;
      }

      const againDiff = right.again - left.again;
      return againDiff === 0 ? right.total - left.total : againDiff;
    })
    .slice(0, limit);
}

export function buildSessionReport(items: SessionReportItem[], now = new Date()) {
  const ratingCounts = Object.fromEntries(
    reviewRatings.map((rating) => [rating, 0])
  ) as Record<ReviewRating, number>;
  const partStats = new Map<
    string,
    { part: string; total: number; correct: number; weak: number }
  >();
  let answeredCount = 0;
  let correctCount = 0;
  let dueTodayCount = 0;
  let futureDueCount = 0;
  let earliestNextDueAt: Date | null = null;
  const tomorrowStart = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  items.forEach((item) => {
    if (item.isCorrect === null || item.isCorrect === undefined) {
      return;
    }

    answeredCount += 1;

    if (item.isCorrect) {
      correctCount += 1;
    }

    if (item.rating) {
      ratingCounts[item.rating] += 1;
    }

    const part = partLabel(item.category);
    const current =
      partStats.get(part) ?? { part, total: 0, correct: 0, weak: 0 };
    current.total += 1;
    current.correct += item.isCorrect ? 1 : 0;
    current.weak += item.rating === "AGAIN" || item.rating === "HARD" ? 1 : 0;
    partStats.set(part, current);

    const dueTime = toTime(item.nextDueAt);
    if (dueTime !== null) {
      const dueAt = new Date(dueTime);

      if (dueTime < tomorrowStart.getTime()) {
        dueTodayCount += 1;
      } else {
        futureDueCount += 1;
      }

      if (!earliestNextDueAt || dueAt < earliestNextDueAt) {
        earliestNextDueAt = dueAt;
      }
    }
  });

  return {
    answeredCount,
    correctCount,
    accuracy: answeredCount === 0 ? 0 : correctCount / answeredCount,
    ratingCounts,
    partStats: Array.from(partStats.values()).sort((left, right) => {
      const weakDiff = right.weak - left.weak;
      return weakDiff === 0 ? right.total - left.total : weakDiff;
    }),
    nextReview: {
      dueTodayCount,
      futureDueCount,
      earliestNextDueAt
    }
  };
}
