import type { Choice } from "@/lib/study-logic";
import { isChoice } from "@/lib/study-logic";
import { shuffleWithRng, type Rng } from "@/lib/study-session-logic";

export const choiceLetters = ["A", "B", "C", "D"] as const;

export type ChoiceOrder = `${Choice}${Choice}${Choice}${Choice}`;

export function isChoiceOrder(value: unknown): value is ChoiceOrder {
  if (typeof value !== "string" || value.length !== choiceLetters.length) {
    return false;
  }

  const values = value.split("");
  return (
    values.every(isChoice) && new Set(values).size === choiceLetters.length
  );
}

export function normalizeChoiceOrder(value: unknown): ChoiceOrder {
  return isChoiceOrder(value) ? value : "ABCD";
}

export function shuffleChoiceOrder(rng?: Rng): ChoiceOrder {
  return shuffleWithRng([...choiceLetters], rng).join("") as ChoiceOrder;
}

export function toOriginalChoice(choiceOrder: string, displayChoice: Choice) {
  const normalized = normalizeChoiceOrder(choiceOrder);
  const displayIndex = choiceLetters.indexOf(displayChoice);
  return normalized[displayIndex] as Choice;
}

export function toDisplayChoice(choiceOrder: string, originalChoice: Choice) {
  const normalized = normalizeChoiceOrder(choiceOrder);
  const originalIndex = normalized.indexOf(originalChoice);
  return choiceLetters[originalIndex] ?? originalChoice;
}

export function toDisplayedChoices(
  choiceOrder: string,
  originalChoices: Record<Choice, string>
) {
  const normalized = normalizeChoiceOrder(choiceOrder);

  return Object.fromEntries(
    choiceLetters.map((displayChoice, index) => [
      displayChoice,
      originalChoices[normalized[index] as Choice]
    ])
  ) as Record<Choice, string>;
}
