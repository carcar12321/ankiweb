export const choices = ["A", "B", "C", "D"] as const;

export type Choice = (typeof choices)[number];
export type WrongNoteAction = "increment" | "manual" | "resolve" | "none";

export function isChoice(value: unknown): value is Choice {
  return typeof value === "string" && choices.includes(value as Choice);
}

export function normalizeChoice(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return isChoice(normalized) ? normalized : null;
}

export function scoreAnswer(correct: Choice, selected: Choice) {
  return {
    isCorrect: correct === selected,
    correctChoice: correct,
    selectedChoice: selected
  };
}

export function getWrongNoteAction(input: {
  isCorrect: boolean;
  keepInWrongNotes?: boolean;
  reviewMode: boolean;
}): WrongNoteAction {
  if (!input.isCorrect) {
    return "increment";
  }

  if (input.keepInWrongNotes) {
    return "manual";
  }

  return input.reviewMode ? "resolve" : "none";
}
