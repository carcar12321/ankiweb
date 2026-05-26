import { describe, expect, it } from "vitest";

import {
  buildSessionReport,
  getWeakPartRecommendations,
  shouldAppendAgainReplay,
  summarizeReviewLoad
} from "../lib/study-insights";

describe("study insights", () => {
  it("summarizes due, overdue, and new questions", () => {
    const summary = summarizeReviewLoad(
      [
        { hasStudyState: false, dueAt: null },
        { hasStudyState: true, dueAt: "2026-01-01T10:00:00.000Z" },
        { hasStudyState: true, dueAt: "2026-01-02T08:00:00.000Z" },
        { hasStudyState: true, dueAt: "2026-01-03T00:00:00.000Z" }
      ],
      new Date("2026-01-02T12:00:00.000Z")
    );

    expect(summary).toEqual({
      dueCount: 2,
      newCount: 1,
      overdueCount: 1
    });
  });

  it("limits again replay to once per session", () => {
    expect(
      shouldAppendAgainReplay([{ questionId: "q1" }], "q1", "AGAIN")
    ).toBe(true);
    expect(
      shouldAppendAgainReplay(
        [{ questionId: "q1" }, { questionId: "q1" }],
        "q1",
        "AGAIN"
      )
    ).toBe(false);
    expect(shouldAppendAgainReplay([{ questionId: "q1" }], "q1", "HARD")).toBe(
      false
    );
  });

  it("recommends weak parts by again and hard rate", () => {
    const recommendations = getWeakPartRecommendations([
      { category: "part 1", rating: "GOOD" },
      { category: "part 1", rating: "HARD" },
      { category: "part 2", rating: "AGAIN" },
      { category: "part 2", rating: "GOOD" },
      { category: "part 3", rating: "EASY" }
    ]);

    expect(recommendations.map((item) => item.part)).toEqual([
      "part 2",
      "part 1"
    ]);
    expect(recommendations[0]).toMatchObject({
      again: 1,
      hard: 0,
      weak: 1,
      total: 2
    });
  });

  it("keeps the source category on weak part recommendations", () => {
    const [recommendation] = getWeakPartRecommendations([
      { category: "네트워크", rating: "AGAIN" },
      { category: "네트워크", rating: "GOOD" }
    ]);

    expect(recommendation).toMatchObject({
      again: 1,
      category: "네트워크",
      hard: 0,
      part: "네트워크",
      total: 2,
      weak: 1,
      weakRate: 0.5
    });
  });

  it("uses null category for uncategorized recommendations", () => {
    const [recommendation] = getWeakPartRecommendations([
      { category: null, rating: "HARD" }
    ]);

    expect(recommendation.category).toBeNull();
    expect(recommendation.part).toBe("미분류");
  });

  it("builds a session report with rating and part summaries", () => {
    const report = buildSessionReport(
      [
        {
          category: "part 1",
          isCorrect: false,
          rating: "AGAIN",
          nextDueAt: "2026-01-01T12:00:00.000Z"
        },
        {
          category: "part 1",
          isCorrect: true,
          rating: "GOOD",
          nextDueAt: "2026-01-03T00:00:00.000Z"
        },
        {
          category: "part 2",
          isCorrect: true,
          rating: "EASY",
          nextDueAt: "2026-01-04T00:00:00.000Z"
        }
      ],
      new Date("2026-01-01T13:00:00.000Z")
    );

    expect(report.answeredCount).toBe(3);
    expect(report.correctCount).toBe(2);
    expect(report.ratingCounts.AGAIN).toBe(1);
    expect(report.partStats[0]).toMatchObject({
      part: "part 1",
      total: 2,
      correct: 1,
      weak: 1
    });
    expect(report.nextReview.dueTodayCount).toBe(1);
    expect(report.nextReview.futureDueCount).toBe(2);
  });
});
