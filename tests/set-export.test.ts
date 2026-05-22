import { describe, expect, it } from "vitest";

import {
  buildQuestionSetCsv,
  buildQuestionSetCsvRows,
  makeQuestionSetCsvFileName,
  sanitizeDownloadFileName
} from "@/lib/set-export";

const set = {
  exportFileName: "network-review",
  questions: [
    {
      category: "web",
      choiceA: "성공",
      choiceB: "권한 없음",
      choiceC: "찾을 수 없음",
      choiceD: "서버 오류",
      correct: "C" as const,
      explanation: "404는 리소스를 찾을 수 없다는 뜻입니다.",
      prompt: "HTTP 404는?",
      tag: "http"
    }
  ],
  title: "네트워크"
};

describe("question set export", () => {
  it("builds CSV rows using the upload template columns", () => {
    expect(buildQuestionSetCsvRows(set)).toEqual([
      [
        "question",
        "choice_a",
        "choice_b",
        "choice_c",
        "choice_d",
        "correct",
        "explanation",
        "tag",
        "category"
      ],
      [
        "HTTP 404는?",
        "성공",
        "권한 없음",
        "찾을 수 없음",
        "서버 오류",
        "C",
        "404는 리소스를 찾을 수 없다는 뜻입니다.",
        "http",
        "web"
      ]
    ]);
  });

  it("adds BOM and CRLF to exported CSV", () => {
    const csv = buildQuestionSetCsv(set);

    expect(csv.startsWith("\uFEFFquestion,choice_a")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("sanitizes download file names and adds a csv extension", () => {
    expect(sanitizeDownloadFileName("bad:/name?.csv")).toBe("bad name .csv");
    expect(makeQuestionSetCsvFileName("review", "fallback")).toBe("review.csv");
    expect(makeQuestionSetCsvFileName(null, "세트")).toBe("세트.csv");
  });
});
