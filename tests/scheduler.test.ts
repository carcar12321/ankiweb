import { describe, expect, it } from "vitest";

import { scheduleSm2Review } from "../lib/scheduler";

describe("SM-2 scheduler", () => {
  it("schedules the first good review for tomorrow", () => {
    const reviewedAt = new Date("2026-01-01T00:00:00.000Z");
    const result = scheduleSm2Review({ rating: "GOOD", reviewedAt });

    expect(result.quality).toBe(4);
    expect(result.nextRepetitions).toBe(1);
    expect(result.nextIntervalDays).toBe(1);
    expect(result.nextDueAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
    expect(result.nextEaseFactor).toBeCloseTo(2.5);
  });

  it("resets repetitions and makes again due immediately", () => {
    const reviewedAt = new Date("2026-01-01T00:00:00.000Z");
    const result = scheduleSm2Review({
      rating: "AGAIN",
      reviewedAt,
      state: {
        dueAt: "2026-01-10T00:00:00.000Z",
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2
      }
    });

    expect(result.quality).toBe(0);
    expect(result.nextRepetitions).toBe(0);
    expect(result.nextIntervalDays).toBe(0);
    expect(result.nextDueAt).toBe(reviewedAt);
    expect(result.nextEaseFactor).toBeCloseTo(1.7);
  });

  it("keeps ease factor at the SM-2 floor", () => {
    const result = scheduleSm2Review({
      rating: "AGAIN",
      reviewedAt: new Date("2026-01-01T00:00:00.000Z"),
      state: {
        easeFactor: 1.31,
        intervalDays: 10,
        repetitions: 5
      }
    });

    expect(result.nextEaseFactor).toBe(1.3);
  });

  it("makes hard, good, and easy diverge through quality and ease factor", () => {
    const reviewedAt = new Date("2026-01-01T00:00:00.000Z");
    const state = {
      easeFactor: 2.5,
      intervalDays: 7,
      repetitions: 2
    };

    const hard = scheduleSm2Review({ rating: "HARD", reviewedAt, state });
    const good = scheduleSm2Review({ rating: "GOOD", reviewedAt, state });
    const easy = scheduleSm2Review({ rating: "EASY", reviewedAt, state });

    expect(hard.quality).toBe(3);
    expect(good.quality).toBe(4);
    expect(easy.quality).toBe(5);
    expect(hard.nextEaseFactor).toBeLessThan(good.nextEaseFactor);
    expect(easy.nextEaseFactor).toBeGreaterThan(good.nextEaseFactor);
    expect(hard.nextIntervalDays).toBeLessThan(good.nextIntervalDays);
    expect(good.nextIntervalDays).toBeLessThan(easy.nextIntervalDays);
  });
});
