export const aiModelOptions = [
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "학습용 질의응답에 쓰기 좋은 비용/속도 균형 모델"
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    description: "더 깊은 설명과 안정적인 추론이 필요할 때"
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    description: "최신 고성능 모델, 복잡한 보고서와 긴 맥락에 적합"
  },
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    description: "가장 어려운 분석용, 응답 시간이 길고 비용이 큼"
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    description: "이전 기본값과의 호환용"
  },
  {
    id: "gpt-5.2-chat-latest",
    label: "GPT-5.2 Chat Latest",
    description: "대화형 답변 테스트용"
  }
] as const;

export const aiReasoningEfforts = ["none", "low", "medium", "high", "xhigh"] as const;

export type AiReasoningEffort = (typeof aiReasoningEfforts)[number];

export const defaultAiModel = "gpt-5.4-mini";
export const defaultAiReasoningEffort: AiReasoningEffort = "medium";
export const defaultAiTone = "학업을 위한 친절한 한국어 튜터. 쉽게, 중복 없이, 단계적으로 설명.";

export function isSupportedAiModel(value: unknown): value is string {
  return (
    typeof value === "string" &&
    aiModelOptions.some((option) => option.id === value)
  );
}

export function isAiReasoningEffort(value: unknown): value is AiReasoningEffort {
  return (
    typeof value === "string" &&
    aiReasoningEfforts.includes(value as AiReasoningEffort)
  );
}
