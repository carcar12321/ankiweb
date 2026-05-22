import type { Choice, ReviewRating } from "@prisma/client";

export type TutorQuestionContext = {
  category?: string | null;
  choices: Record<Choice, string>;
  correct: Choice;
  explanation: string;
  prompt: string;
  selected?: Choice | null;
  tag?: string | null;
};

export type TutorWeaknessContext = {
  activeWrongNotes: number;
  frequentParts: Array<{
    category: string;
    count: number;
  }>;
  recentRatings: Array<{
    category: string;
    rating: ReviewRating;
  }>;
};

function formatChoices(choices: Record<Choice, string>) {
  return (["A", "B", "C", "D"] as Choice[])
    .map((choice) => `${choice}. ${choices[choice]}`)
    .join("\n");
}

export function buildTutorPrompt(input: {
  context: TutorQuestionContext;
  message?: string;
  mode: "chat" | "explain";
  weakness: TutorWeaknessContext;
}) {
  const question = input.context;
  const weakParts = input.weakness.frequentParts
    .map((part) => `${part.category}: ${part.count}회`)
    .join(", ");
  const recentRatings = input.weakness.recentRatings
    .map((rating) => `${rating.category}: ${rating.rating}`)
    .join(", ");

  return [
    "현재 문제를 한국어로 자세히 설명해 주세요.",
    "정답만 반복하지 말고, 오답 선지가 왜 틀렸는지도 설명해 주세요.",
    input.mode === "chat"
      ? "사용자의 추가 질문에 직접 답하되, 현재 문제 맥락을 우선하세요."
      : "처음 해설을 요청했습니다. 핵심 개념부터 단계적으로 설명하세요.",
    "",
    `문제: ${question.prompt}`,
    `보기:\n${formatChoices(question.choices)}`,
    `정답: ${question.correct}`,
    question.selected ? `사용자 선택: ${question.selected}` : "사용자 선택: 아직 없음",
    `기존 해설: ${question.explanation}`,
    question.category ? `Part: ${question.category}` : "Part: 미분류",
    question.tag ? `Tag: ${question.tag}` : "Tag: 없음",
    "",
    `활성 오답 수: ${input.weakness.activeWrongNotes}`,
    `자주 틀린 part: ${weakParts || "아직 충분한 데이터 없음"}`,
    `최근 자가평가: ${recentRatings || "아직 충분한 데이터 없음"}`,
    "",
    input.message ? `사용자 질문: ${input.message}` : ""
  ].join("\n");
}

export function buildWeaknessPrompt(input: {
  activeWrongNotes: Array<{
    category?: string | null;
    prompt: string;
    setTitle: string;
    tag?: string | null;
    wrongCount: number;
  }>;
  recentRatings: Array<{
    category?: string | null;
    prompt: string;
    rating: ReviewRating;
    tag?: string | null;
  }>;
}) {
  const wrongNotes = input.activeWrongNotes
    .map(
      (note) =>
        `- [${note.setTitle}] ${note.prompt} / part=${note.category ?? "미분류"} / tag=${note.tag ?? "없음"} / 오답=${note.wrongCount}회`
    )
    .join("\n");
  const ratings = input.recentRatings
    .map(
      (log) =>
        `- ${log.prompt} / part=${log.category ?? "미분류"} / tag=${log.tag ?? "없음"} / 평가=${log.rating}`
    )
    .join("\n");

  return [
    "아래 학습 기록만 근거로 부족한 개념과 다음 공부 순서를 분석해 주세요.",
    "확실하지 않은 내용은 추측이라고 표시하고, 너무 긴 보고서보다 실행 가능한 조언을 우선하세요.",
    "",
    "활성 오답노트:",
    wrongNotes || "없음",
    "",
    "최근 자가평가 기록:",
    ratings || "없음"
  ].join("\n");
}

export function buildSimilarQuestionPrompt(input: {
  count: number;
  question: TutorQuestionContext;
}) {
  return [
    `${input.count}개의 유사 문제를 생성해 주세요.`,
    "원본 문제와 같은 개념을 묻되 문장과 보기 구성을 바꾸세요.",
    "정답은 A-D 중 하나이며, 해설은 왜 정답인지와 핵심 개념을 포함해야 합니다.",
    "",
    `원본 문제: ${input.question.prompt}`,
    `원본 보기:\n${formatChoices(input.question.choices)}`,
    `원본 정답: ${input.question.correct}`,
    `원본 해설: ${input.question.explanation}`,
    `Part: ${input.question.category ?? "미분류"}`,
    `Tag: ${input.question.tag ?? "없음"}`
  ].join("\n");
}
