import { describe, expect, it } from "vitest";

import {
  buildMemosMarkdown,
  buildSessionReportMarkdown,
  buildWrongNotesMarkdown,
  makeMarkdownFileName
} from "@/lib/markdown-export";

describe("markdown export", () => {
  it("sanitizes markdown file names", () => {
    expect(makeMarkdownFileName("bad:/name?.md")).toBe("bad name.md");
    expect(makeMarkdownFileName("")).toBe("export.md");
  });

  it("builds selected memo markdown", () => {
    const markdown = buildMemosMarkdown(
      [
        {
          content: "외워둘 내용",
          createdAt: "2026-05-26T00:00:00.000Z",
          sourceQuestionPrompt: "HTTP 404는?",
          title: "HTTP 메모"
        }
      ],
      new Date("2026-05-26T01:00:00.000Z")
    );

    expect(markdown).toContain("# 메모장 Export");
    expect(markdown).toContain("HTTP 메모");
    expect(markdown).toContain("원본 문제: HTTP 404는?");
    expect(markdown).toContain("외워둘 내용");
  });

  it("builds selected wrong-note markdown with manual labels", () => {
    const markdown = buildWrongNotesMarkdown(
      [
        {
          lastWrongAt: "2026-05-26T00:00:00.000Z",
          manuallyAddedAt: "2026-05-26T00:00:00.000Z",
          question: {
            category: "network",
            choiceA: "A",
            choiceB: "B",
            choiceC: "C",
            choiceD: "D",
            correct: "C",
            explanation: "해설",
            prompt: "문제",
            set: { title: "세트" },
            tag: null
          },
          wrongCount: 0
        }
      ],
      new Date("2026-05-26T01:00:00.000Z")
    );

    expect(markdown).toContain("# 오답노트 Export");
    expect(markdown).toContain("상태: 직접 추가");
    expect(markdown).toContain("정답: C");
    expect(markdown).toContain("해설");
  });

  it("builds session report markdown", () => {
    const markdown = buildSessionReportMarkdown({
      content: "보고서 본문",
      createdAt: "2026-05-26T00:00:00.000Z",
      model: "gpt-test",
      prompt: "예쁘게 정리",
      title: "세션 완료 보고서"
    });

    expect(markdown).toContain("# 세션 완료 보고서");
    expect(markdown).toContain("모델: gpt-test");
    expect(markdown).toContain("요청: 예쁘게 정리");
    expect(markdown).toContain("보고서 본문");
  });
});
