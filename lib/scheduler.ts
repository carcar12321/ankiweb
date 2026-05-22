export const reviewRatings = ["AGAIN", "HARD", "GOOD", "EASY"] as const;

export type ReviewRating = (typeof reviewRatings)[number];

export type Sm2State = {
  dueAt?: Date | string | null;
  easeFactor?: number | null;
  intervalDays?: number | null;
  repetitions?: number | null;
};

const ratingQuality: Record<ReviewRating, number> = {
  AGAIN: 0,
  HARD: 3,
  GOOD: 4,
  EASY: 5
};

export function isReviewRating(value: unknown): value is ReviewRating {
  return (
    typeof value === "string" && reviewRatings.includes(value as ReviewRating)
  );
}

export function getReviewQuality(rating: ReviewRating) {
  return ratingQuality[rating];
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function scheduleSm2Review(input: {
  rating: ReviewRating;
  reviewedAt?: Date;
  state?: Sm2State | null;
}) {
  const reviewedAt = input.reviewedAt ?? new Date();
  const previousIntervalDays = input.state?.intervalDays ?? 0;
  const previousEaseFactor = input.state?.easeFactor ?? 2.5;
  const previousRepetitions = input.state?.repetitions ?? 0;
  const previousDueAt = input.state?.dueAt ? new Date(input.state.dueAt) : null;
  const quality = getReviewQuality(input.rating);
  const nextEaseFactor = Math.max(
    1.3,
    previousEaseFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    return {
      algorithm: "SM2" as const,
      quality,
      previousDueAt,
      previousEaseFactor,
      previousIntervalDays,
      previousRepetitions,
      nextDueAt: reviewedAt,
      nextEaseFactor,
      nextIntervalDays: 0,
      nextRepetitions: 0
    };
  }

  const nextRepetitions = previousRepetitions + 1;
  const nextIntervalDays =
    nextRepetitions === 1
      ? 1
      : nextRepetitions === 2
        ? 6
        : Math.ceil(Math.max(1, previousIntervalDays) * nextEaseFactor);

  return {
    algorithm: "SM2" as const,
    quality,
    previousDueAt,
    previousEaseFactor,
    previousIntervalDays,
    previousRepetitions,
    nextDueAt: addDays(reviewedAt, nextIntervalDays),
    nextEaseFactor,
    nextIntervalDays,
    nextRepetitions
  };
}
