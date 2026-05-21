export type StudyQuestionCandidate = {
  id: string;
  order: number;
  lastAnsweredAt?: Date | string | null;
};

function toAnsweredTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function selectStudyQuestionIds(
  candidates: StudyQuestionCandidate[],
  count: number
) {
  if (count <= 0) {
    return [];
  }

  const normalized = candidates.map((candidate) => ({
    ...candidate,
    lastAnsweredTime: toAnsweredTime(candidate.lastAnsweredAt)
  }));

  const unattempted = normalized
    .filter((candidate) => candidate.lastAnsweredTime === null)
    .sort((left, right) => left.order - right.order);

  const attempted = normalized
    .filter((candidate) => candidate.lastAnsweredTime !== null)
    .sort((left, right) => {
      const timeDiff = left.lastAnsweredTime! - right.lastAnsweredTime!;
      return timeDiff === 0 ? left.order - right.order : timeDiff;
    });

  return [...unattempted, ...attempted]
    .slice(0, count)
    .map((candidate) => candidate.id);
}
