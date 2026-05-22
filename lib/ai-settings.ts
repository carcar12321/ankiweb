import { prisma } from "@/lib/prisma";
import {
  defaultAiModel,
  defaultAiReasoningEffort,
  defaultAiTone,
  isAiReasoningEffort,
  isSupportedAiModel
} from "@/lib/ai-models";

export type EffectiveAiSettings = {
  customInstructions: string;
  model: string;
  reasoningEffort: string;
  tone: string;
};

export const defaultAiSettings: EffectiveAiSettings = {
  customInstructions: "",
  model: defaultAiModel,
  reasoningEffort: defaultAiReasoningEffort,
  tone: defaultAiTone
};

export function normalizeAiSettings(input: Partial<EffectiveAiSettings>) {
  const model = isSupportedAiModel(input.model)
    ? input.model
    : defaultAiSettings.model;
  const reasoningEffort = isAiReasoningEffort(input.reasoningEffort)
    ? input.reasoningEffort
    : defaultAiSettings.reasoningEffort;

  return {
    customInstructions: input.customInstructions?.trim() ?? "",
    model,
    reasoningEffort,
    tone: input.tone?.trim() || defaultAiSettings.tone
  };
}

export async function getAiSettings() {
  const settings = await prisma.aiSettings.findUnique({
    where: { id: "default" }
  });

  if (!settings) {
    return defaultAiSettings;
  }

  return normalizeAiSettings(settings);
}

export function composeInstructions(baseInstructions: string, settings: EffectiveAiSettings) {
  return [
    baseInstructions,
    "",
    `사용자 선호 톤: ${settings.tone}`,
    settings.customInstructions
      ? `사용자 추가 지시사항:\n${settings.customInstructions}`
      : "",
    "추가 질문에 답할 때는 사용자가 묻지 않은 기존 문제 해설을 반복하지 말고, 필요한 경우에만 짧게 연결하세요."
  ]
    .filter(Boolean)
    .join("\n");
}
