import { describe, expect, it } from "vitest";

import { selectStudyQuestionIds } from "../lib/study-session-logic";

describe("study session logic", () => {
  it("selects unattempted questions by upload order first", () => {
    const ids = selectStudyQuestionIds(
      [
        { id: "q3", order: 3, lastAnsweredAt: null },
        { id: "q1", order: 1, lastAnsweredAt: "2026-01-03T00:00:00.000Z" },
        { id: "q2", order: 2, lastAnsweredAt: null }
      ],
      2
    );

    expect(ids).toEqual(["q2", "q3"]);
  });

  it("fills with oldest attempted questions when needed", () => {
    const ids = selectStudyQuestionIds(
      [
        { id: "q1", order: 1, lastAnsweredAt: "2026-01-03T00:00:00.000Z" },
        { id: "q2", order: 2, lastAnsweredAt: null },
        { id: "q3", order: 3, lastAnsweredAt: "2026-01-01T00:00:00.000Z" },
        { id: "q4", order: 4, lastAnsweredAt: "2026-01-02T00:00:00.000Z" }
      ],
      3
    );

    expect(ids).toEqual(["q2", "q3", "q4"]);
  });

  it("does not select more questions than requested", () => {
    const ids = selectStudyQuestionIds(
      [
        { id: "q1", order: 1, lastAnsweredAt: null },
        { id: "q2", order: 2, lastAnsweredAt: null }
      ],
      1
    );

    expect(ids).toEqual(["q1"]);
  });
});
