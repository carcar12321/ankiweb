import { sanitizeDownloadFileName } from "@/lib/set-export";
import type { Choice } from "@/lib/study-logic";

type ExportMemo = {
  content: string;
  createdAt: Date | string;
  sourceConversationTitle?: string | null;
  sourceQuestionPrompt?: string | null;
  sourceText?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
};

type ExportWrongNote = {
  lastWrongAt: Date | string;
  manuallyAddedAt?: Date | string | null;
  question: {
    category?: string | null;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    correct: Choice;
    explanation: string;
    prompt: string;
    set: {
      title: string;
    };
    tag?: string | null;
  };
  wrongCount: number;
};

type ExportSessionReport = {
  content: string;
  createdAt: Date | string;
  model?: string | null;
  prompt?: string | null;
  title: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ko-KR");
}

function sectionTitle(value: string, fallback: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 0 ? compact : fallback;
}

function formatChoiceList(note: ExportWrongNote) {
  const question = note.question;

  return [
    `A. ${question.choiceA}`,
    `B. ${question.choiceB}`,
    `C. ${question.choiceC}`,
    `D. ${question.choiceD}`
  ].join("\n");
}

function joinMarkdown(lines: Array<string | null | undefined>) {
  return `${lines.filter((line): line is string => line !== null && line !== undefined).join("\n").trimEnd()}\n`;
}

export function makeMarkdownFileName(baseName: string) {
  return `${sanitizeDownloadFileName(baseName.replace(/\.md$/i, ""), "export")}.md`;
}

export function markdownDownloadHeaders(fileName: string) {
  const asciiFallback = sanitizeDownloadFileName(fileName, "export.md").replace(
    /[^\x20-\x7E]/g,
    "_"
  );

  return {
    "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Content-Type": "text/markdown; charset=utf-8"
  };
}

export function buildMemosMarkdown(memos: ExportMemo[], exportedAt = new Date()) {
  return joinMarkdown([
    "# 메모장 Export",
    "",
    `- Export 시각: ${formatDate(exportedAt)}`,
    `- 메모 수: ${memos.length}`,
    "",
    ...memos.flatMap((memo, index) => [
      `## ${index + 1}. ${sectionTitle(memo.title ?? "", "메모")}`,
      "",
      `- 작성일: ${formatDate(memo.createdAt)}`,
      memo.sourceUrl ? `- 출처 URL: ${memo.sourceUrl}` : null,
      memo.sourceConversationTitle
        ? `- AI 대화: ${memo.sourceConversationTitle}`
        : null,
      memo.sourceQuestionPrompt ? `- 원본 문제: ${memo.sourceQuestionPrompt}` : null,
      "",
      memo.sourceText ? `> ${memo.sourceText.replace(/\n/g, "\n> ")}` : null,
      memo.sourceText ? "" : null,
      memo.content,
      ""
    ])
  ]);
}

export function buildWrongNotesMarkdown(
  notes: ExportWrongNote[],
  exportedAt = new Date()
) {
  return joinMarkdown([
    "# 오답노트 Export",
    "",
    `- Export 시각: ${formatDate(exportedAt)}`,
    `- 문제 수: ${notes.length}`,
    "",
    ...notes.flatMap((note, index) => {
      const question = note.question;
      const manual = Boolean(note.manuallyAddedAt);

      return [
        `## ${index + 1}. ${sectionTitle(question.prompt, "문제")}`,
        "",
        `- 문제집: ${question.set.title}`,
        `- Part: ${question.category ?? "미분류"}`,
        question.tag ? `- Tag: ${question.tag}` : null,
        manual
          ? `- 상태: 직접 추가 (${formatDate(note.manuallyAddedAt)})`
          : `- 오답: ${note.wrongCount}회`,
        `- 최근 오답/추가: ${formatDate(note.lastWrongAt)}`,
        "",
        "### 보기",
        "",
        formatChoiceList(note),
        "",
        `정답: ${question.correct}`,
        "",
        "### 해설",
        "",
        question.explanation,
        ""
      ];
    })
  ]);
}

export function buildSessionReportMarkdown(
  report: ExportSessionReport,
  exportedAt = new Date()
) {
  return joinMarkdown([
    `# ${sectionTitle(report.title, "세션 AI 보고서")}`,
    "",
    `- 생성일: ${formatDate(report.createdAt)}`,
    `- Export 시각: ${formatDate(exportedAt)}`,
    report.model ? `- 모델: ${report.model}` : null,
    report.prompt ? `- 요청: ${report.prompt}` : null,
    "",
    report.content
  ]);
}
