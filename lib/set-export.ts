import { csvTemplateHeaders, makeCsv } from "@/lib/csv";
import type { Choice } from "@/lib/study-logic";

export type ExportQuestion = {
  category?: string | null;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correct: Choice;
  explanation: string;
  prompt: string;
  tag?: string | null;
};

export type ExportQuestionSet = {
  exportFileName?: string | null;
  questions: ExportQuestion[];
  title: string;
};

const reservedFileNameCharacters = new Set(['<', '>', ':', '"', "/", "\\", "|", "?", "*"]);

function replaceUnsafeFileNameCharacters(value: string) {
  return Array.from(value)
    .map((character) =>
      character.charCodeAt(0) < 32 || reservedFileNameCharacters.has(character)
        ? " "
        : character
    )
    .join("");
}

export function sanitizeDownloadFileName(value: string, fallback = "questions") {
  const cleaned = replaceUnsafeFileNameCharacters(value)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return cleaned || fallback;
}

export function makeQuestionSetCsvFileName(
  exportFileName?: string | null,
  title?: string | null
) {
  const baseName = sanitizeDownloadFileName(
    (exportFileName || title || "questions").replace(/\.csv$/i, "")
  );

  return `${baseName}.csv`;
}

export function buildQuestionSetCsvRows(set: Pick<ExportQuestionSet, "questions">) {
  return [
    csvTemplateHeaders,
    ...set.questions.map((question) => [
      question.prompt,
      question.choiceA,
      question.choiceB,
      question.choiceC,
      question.choiceD,
      question.correct,
      question.explanation,
      question.tag ?? "",
      question.category ?? ""
    ])
  ];
}

export function buildQuestionSetCsv(set: ExportQuestionSet) {
  return `\uFEFF${makeCsv(buildQuestionSetCsvRows(set))}\r\n`;
}
