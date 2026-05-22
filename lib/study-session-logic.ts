export type StudyQuestionCandidate = {
  id: string;
  order: number;
  dueAt?: Date | string | null;
  hasStudyState?: boolean;
};

export type Rng = () => number;

function toTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

export function shuffleWithRng<T>(items: T[], rng: Rng = Math.random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index]
    ];
  }

  return shuffled;
}

export function selectStudyQuestionIds(
  candidates: StudyQuestionCandidate[],
  count: number,
  options: { now?: Date; rng?: Rng } = {}
) {
  if (count <= 0) {
    return [];
  }

  const nowTime = (options.now ?? new Date()).getTime();
  const normalized = candidates.map((candidate) => ({
    ...candidate,
    dueTime: toTime(candidate.dueAt)
  }));

  const ready = normalized.filter(
    (candidate) =>
      !candidate.hasStudyState ||
      candidate.dueTime === null ||
      candidate.dueTime <= nowTime
  );

  const future = normalized
    .filter(
      (candidate) =>
        candidate.hasStudyState &&
        candidate.dueTime !== null &&
        candidate.dueTime > nowTime
    )
    .sort((left, right) => {
      const timeDiff = left.dueTime! - right.dueTime!;
      return timeDiff === 0 ? left.order - right.order : timeDiff;
    });

  return [...shuffleWithRng(ready, options.rng), ...future]
    .slice(0, count)
    .map((candidate) => candidate.id);
}
