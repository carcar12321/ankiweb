import { describe, expect, it } from "vitest";

import {
  normalizeChoiceOrder,
  shuffleChoiceOrder,
  toDisplayedChoices,
  toDisplayChoice,
  toOriginalChoice
} from "@/lib/choice-order";

function sequenceRng(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("choice order", () => {
  it("creates a shuffled choice order with injectable rng", () => {
    expect(shuffleChoiceOrder(sequenceRng([0, 0, 0]))).toBe("BCDA");
  });

  it("maps displayed choices back to original choices", () => {
    expect(toOriginalChoice("BDAC", "A")).toBe("B");
    expect(toOriginalChoice("BDAC", "C")).toBe("A");
    expect(toDisplayChoice("BDAC", "A")).toBe("C");
  });

  it("builds displayed choices without mutating original question data", () => {
    expect(
      toDisplayedChoices("BDAC", {
        A: "2",
        B: "3",
        C: "4",
        D: "5"
      })
    ).toEqual({
      A: "3",
      B: "5",
      C: "2",
      D: "4"
    });
  });

  it("falls back to original order for malformed data", () => {
    expect(normalizeChoiceOrder("AAAA")).toBe("ABCD");
    expect(toOriginalChoice("bad", "D")).toBe("D");
  });
});
