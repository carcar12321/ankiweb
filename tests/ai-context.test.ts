import { describe, expect, it } from "vitest";

import {
  buildSimilarQuestionPrompt,
  buildTutorPrompt,
  buildWeaknessPrompt
} from "@/lib/ai-context";

const question = {
  category: "network",
  choices: {
    A: "요청 성공",
    B: "권한 없음",
    C: "찾을 수 없음",
    D: "서버 오류"
  },
  correct: "C" as const,
  explanation: "404는 요청한 리소스를 찾을 수 없을 때 반환됩니다.",
  prompt: "HTTP 404의 의미는?",
  selected: "B" as const,
  tag: "http"
};

describe("AI prompt builders", () => {
  it("builds a tutor prompt from only the current question and compact weakness summary", () => {
    const prompt = buildTutorPrompt({
      context: question,
      message: "왜 B가 아니야?",
      mode: "chat",
      weakness: {
        activeWrongNotes: 2,
        frequentParts: [{ category: "network", count: 3 }],
        recentRatings: [{ category: "network", rating: "AGAIN" }]
      }
    });

    expect(prompt).toContain("HTTP 404의 의미는?");
    expect(prompt).toContain("사용자 선택: B");
    expect(prompt).toContain("자주 틀린 part: network: 3회");
    expect(prompt).toContain("사용자 질문: 왜 B가 아니야?");
  });

  it("builds a weakness report prompt from wrong notes and recent ratings", () => {
    const prompt = buildWeaknessPrompt({
      activeWrongNotes: [
        {
          category: null,
          prompt: "문제 1",
          setTitle: "세트",
          tag: null,
          wrongCount: 4
        }
      ],
      recentRatings: [
        {
          category: "web",
          prompt: "문제 2",
          rating: "HARD",
          tag: "http"
        }
      ]
    });

    expect(prompt).toContain("활성 오답노트");
    expect(prompt).toContain("part=미분류");
    expect(prompt).toContain("평가=HARD");
  });

  it("builds a similar question prompt with the requested count", () => {
    const prompt = buildSimilarQuestionPrompt({ count: 3, question });

    expect(prompt).toContain("3개의 유사 문제");
    expect(prompt).toContain("원본 정답: C");
  });
});
