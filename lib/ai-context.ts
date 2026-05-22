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
    input.mode === "explain"
      ? "정답만 반복하지 말고, 오답 선지가 왜 틀렸는지도 설명해 주세요."
      : "이미 한 설명을 반복하지 말고, 사용자의 추가 질문에 필요한 범위만 답하세요.",
    input.mode === "chat"
      ? "사용자의 추가 질문에 직접 답하되, 답변은 학습용으로 간결하게 구성하세요."
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

export function buildGeneralStudyPrompt(input: {
  message: string;
  recentSummary?: string;
}) {
  return [
    "사용자의 학습 질문에 한국어로 답해 주세요.",
    "문제의 정답 해설을 반복하는 패턴보다, 사용자가 지금 묻는 목표에 맞춰 개념, 예시, 암기 포인트를 정리하세요.",
    input.recentSummary ? `최근 학습 요약:\n${input.recentSummary}` : "",
    "",
    `사용자 요청: ${input.message}`
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPromptQuestionGeneration(input: {
  count: number;
  prompt: string;
}) {
  return [
    `${input.count}개의 객관식 연습문제를 생성해 주세요.`,
    "보기는 A-D 네 개이고, 정답과 해설을 포함해야 합니다.",
    "사용자의 요청과 학습 목적을 우선하고, 문제는 원문을 그대로 복사하지 말고 새로 구성하세요.",
    "",
    `사용자 요청: ${input.prompt}`
  ].join("\n");
}

export function buildSessionReportPrompt(input: {
  messages: Array<{ content: string; role: string }>;
  request?: string;
  session: {
    accuracy: number;
    correctCount: number;
    questionCount: number;
    ratingCounts: Record<string, number>;
    weakParts: Array<{ part: string; total: number; weak: number }>;
  };
}) {
  const messageSummary = input.messages
    .slice(-20)
    .map((message) => `- ${message.role}: ${message.content}`)
    .join("\n");
  const weakParts = input.session.weakParts
    .map((part) => `${part.part} weak ${part.weak}/${part.total}`)
    .join(", ");

  return [
    "이번 학습 세션 결과와 사용자가 AI에게 질문한 내용을 바탕으로 학습 보고서를 작성해 주세요.",
    "보고서는 부족한 개념, 잘한 점, 다음 학습 순서, 추가로 풀면 좋은 문제 유형으로 나누세요.",
    input.request ? `사용자 추가 요청: ${input.request}` : "",
    "",
    `문제 수: ${input.session.questionCount}`,
    `정답 수: ${input.session.correctCount}`,
    `정답률: ${Math.round(input.session.accuracy * 100)}%`,
    `자가평가: ${JSON.stringify(input.session.ratingCounts)}`,
    `취약 part: ${weakParts || "충분한 데이터 없음"}`,
    "",
    "AI 질문 기록:",
    messageSummary || "없음"
  ]
    .filter(Boolean)
    .join("\n");
}
