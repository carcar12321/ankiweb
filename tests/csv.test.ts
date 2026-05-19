import { describe, expect, it } from "vitest";

import {
  csvTemplateHeaders,
  makeTemplateCsv,
  parseCsvRows,
  validateQuestionCsv
} from "../lib/csv";

describe("CSV parser", () => {
  it("parses quoted cells and commas", () => {
    const rows = parseCsvRows('question,choice_a\r\n"hello, world",A');

    expect(rows).toEqual([
      ["question", "choice_a"],
      ["hello, world", "A"]
    ]);
  });

  it("validates a normal four-choice CSV", () => {
    const csv = [
      "question,choice_a,choice_b,choice_c,choice_d,correct,explanation,tag,category",
      "Q,A1,B1,C1,D1,c,Because,tag,cat"
    ].join("\n");
    const result = validateQuestionCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      question: "Q",
      correct: "C",
      explanation: "Because"
    });
  });

  it("reports missing required headers", () => {
    const result = validateQuestionCsv("question,choice_a\nQ,A");

    expect(result.errors).toContainEqual({
      row: 1,
      message: "필수 컬럼 'choice_b'이 없습니다."
    });
  });

  it("reports invalid correct values", () => {
    const csv = [
      "question,choice_a,choice_b,choice_c,choice_d,correct,explanation",
      "Q,A1,B1,C1,D1,E,Nope"
    ].join("\n");
    const result = validateQuestionCsv(csv);

    expect(result.errors).toEqual([
      {
        row: 2,
        message: "correct는 A, B, C, D 중 하나여야 합니다."
      }
    ]);
  });

  it("generates an Excel-friendly template with BOM and expected headers", () => {
    const template = makeTemplateCsv();

    expect(template.charCodeAt(0)).toBe(0xfeff);
    expect(parseCsvRows(template)[0]).toEqual(csvTemplateHeaders);
  });
});
