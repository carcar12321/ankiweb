import { describe, expect, it } from "vitest";

import {
  getWeightedReviewQuestionWeight,
  selectStudyQuestionIds,
  selectWeightedReviewQuestionIds
} from "../lib/study-session-logic";

function sequenceRng(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("study session logic", () => {
  it("shuffles due and new questions with an injectable rng", () => {
    const ids = selectStudyQuestionIds(
      [
        { id: "q1", order: 1, dueAt: null, hasStudyState: false },
        { id: "q2", order: 2, dueAt: "2026-01-01T00:00:00.000Z", hasStudyState: true },
        { id: "q3", order: 3, dueAt: "2026-01-10T00:00:00.000Z", hasStudyState: true }
      ],
      3,
      {
        now: new Date("2026-01-02T00:00:00.000Z"),
        rng: sequenceRng([0])
      }
    );

    expect(ids).toEqual(["q2", "q1", "q3"]);
  });

  it("fills with the nearest future due questions when ready questions run short", () => {
    const ids = selectStudyQuestionIds(
      [
        { id: "q1", order: 1, dueAt: null, hasStudyState: false },
        { id: "q2", order: 2, dueAt: "2026-01-01T00:00:00.000Z", hasStudyState: true },
        { id: "q3", order: 3, dueAt: "2026-01-07T00:00:00.000Z", hasStudyState: true },
        { id: "q4", order: 4, dueAt: "2026-01-05T00:00:00.000Z", hasStudyState: true }
      ],
      3,
      {
        now: new Date("2026-01-02T00:00:00.000Z"),
        rng: sequenceRng([0])
      }
    );

    expect(ids).toEqual(["q2", "q1", "q4"]);
  });

  it("does not select more questions than requested", () => {
    const ids = selectStudyQuestionIds(
      [
        { id: "q1", order: 1, dueAt: null, hasStudyState: false },
        { id: "q2", order: 2, dueAt: null, hasStudyState: false }
      ],
      1,
      { rng: sequenceRng([0]) }
    );

    expect(ids).toEqual(["q2"]);
  });

  it("gives higher review weight to again, hard, due, active wrong, and incorrect questions", () => {
    const weight = getWeightedReviewQuestionWeight(
      {
        id: "q1",
        order: 1,
        dueAt: "2026-01-01T00:00:00.000Z",
        hasActiveWrongNote: true,
        lastAttemptWasCorrect: false,
        lastRating: "AGAIN"
      },
      new Date("2026-01-02T00:00:00.000Z")
    );

    expect(weight).toBe(16);
  });

  it("prioritizes again and hard review candidates in weighted random selection", () => {
    const ids = selectWeightedReviewQuestionIds(
      [
        {
          id: "good",
          order: 1,
          hasAttempt: true,
          lastAttemptWasCorrect: true,
          lastRating: "GOOD"
        },
        {
          id: "again",
          order: 2,
          hasAttempt: true,
          lastAttemptWasCorrect: true,
          lastRating: "AGAIN"
        },
        {
          id: "hard",
          order: 3,
          hasAttempt: true,
          lastAttemptWasCorrect: true,
          lastRating: "HARD"
        }
      ],
      2,
      { rng: sequenceRng([0.95, 0.8]) }
    );

    expect(ids).toEqual(["hard", "again"]);
  });

  it("selects weighted review questions without duplicates and stops at available candidates", () => {
    const ids = selectWeightedReviewQuestionIds(
      [
        { id: "q1", order: 1, hasAttempt: true },
        { id: "q2", order: 2, hasAttempt: true }
      ],
      5,
      { rng: sequenceRng([0, 0]) }
    );

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("excludes questions without attempt history from weighted review selection", () => {
    const ids = selectWeightedReviewQuestionIds(
      [
        {
          id: "untried",
          order: 1,
          hasAttempt: false,
          lastRating: "AGAIN"
        },
        { id: "reviewed", order: 2, hasAttempt: true }
      ],
      2,
      { rng: sequenceRng([0]) }
    );

    expect(ids).toEqual(["reviewed"]);
  });
});
