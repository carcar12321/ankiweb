import { describe, expect, it } from "vitest";

import { selectStudyQuestionIds } from "../lib/study-session-logic";

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
});
