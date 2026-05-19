import { describe, expect, it } from "vitest";

import {
  getWrongNoteAction,
  normalizeChoice,
  scoreAnswer
} from "../lib/study-logic";

describe("study logic", () => {
  it("normalizes answer choices", () => {
    expect(normalizeChoice(" c ")).toBe("C");
    expect(normalizeChoice("x")).toBeNull();
  });

  it("scores answers", () => {
    expect(scoreAnswer("A", "A")).toMatchObject({ isCorrect: true });
    expect(scoreAnswer("A", "D")).toMatchObject({ isCorrect: false });
  });

  it("updates wrong-note intent", () => {
    expect(getWrongNoteAction({ isCorrect: false, reviewMode: false })).toBe(
      "increment"
    );
    expect(getWrongNoteAction({ isCorrect: true, reviewMode: true })).toBe(
      "resolve"
    );
    expect(getWrongNoteAction({ isCorrect: true, reviewMode: false })).toBe(
      "none"
    );
  });
});
