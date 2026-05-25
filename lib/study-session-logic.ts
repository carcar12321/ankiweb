export type StudyQuestionCandidate = {
  id: string;
  order: number;
  dueAt?: Date | string | null;
  hasStudyState?: boolean;
};

export type WeightedReviewQuestionCandidate = {
  id: string;
  order: number;
  dueAt?: Date | string | null;
  hasActiveWrongNote?: boolean;
  hasAttempt?: boolean;
  lastAttemptWasCorrect?: boolean | null;
  lastRating?: "AGAIN" | "HARD" | "GOOD" | "EASY" | null;
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

export function getWeightedReviewQuestionWeight(
  candidate: WeightedReviewQuestionCandidate,
  now = new Date()
) {
  const dueTime = toTime(candidate.dueAt);
  let weight = 1;

  if (candidate.lastRating === "AGAIN") {
    weight += 7;
  } else if (candidate.lastRating === "HARD") {
    weight += 4;
  }

  if (candidate.hasActiveWrongNote) {
    weight += 4;
  }

  if (dueTime !== null && dueTime <= now.getTime()) {
    weight += 2;
  }

  if (candidate.lastAttemptWasCorrect === false) {
    weight += 2;
  }

  return weight;
}

export function selectWeightedReviewQuestionIds(
  candidates: WeightedReviewQuestionCandidate[],
  count: number,
  options: { now?: Date; rng?: Rng } = {}
) {
  if (count <= 0) {
    return [];
  }

  const now = options.now ?? new Date();
  const rng = options.rng ?? Math.random;
  const pool = candidates
    .filter((candidate) => candidate.hasAttempt !== false)
    .map((candidate) => ({
      ...candidate,
      weight: getWeightedReviewQuestionWeight(candidate, now)
    }))
    .sort((left, right) => left.order - right.order);
  const selected: string[] = [];

  while (pool.length > 0 && selected.length < count) {
    const totalWeight = pool.reduce((sum, candidate) => sum + candidate.weight, 0);
    let cursor = rng() * totalWeight;
    let selectedIndex = pool.length - 1;

    for (let index = 0; index < pool.length; index += 1) {
      cursor -= pool[index].weight;

      if (cursor < 0) {
        selectedIndex = index;
        break;
      }
    }

    const [candidate] = pool.splice(selectedIndex, 1);
    selected.push(candidate.id);
  }

  return selected;
}
