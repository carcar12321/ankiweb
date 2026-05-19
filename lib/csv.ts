import { normalizeChoice, type Choice } from "@/lib/study-logic";

export type CsvQuestion = {
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correct: Choice;
  explanation: string;
  tag?: string;
  category?: string;
};

export type CsvValidationError = {
  row: number;
  message: string;
};

const requiredColumns = [
  "question",
  "choice_a",
  "choice_b",
  "choice_c",
  "choice_d",
  "correct",
  "explanation"
] as const;

const optionalColumns = ["tag", "category"] as const;

export const csvTemplateHeaders = [...requiredColumns, ...optionalColumns];

function cleanHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function cleanCell(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

export function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushField();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      pushRow();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  if (rows[0]?.[0]) {
    rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  }

  return rows;
}

export function validateQuestionCsv(input: string) {
  const rows = parseCsvRows(input);
  const errors: CsvValidationError[] = [];

  if (rows.length === 0) {
    return {
      questions: [] as CsvQuestion[],
      errors: [{ row: 1, message: "CSV에 헤더와 문제가 없습니다." }]
    };
  }

  const headers = rows[0].map(cleanHeader);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  for (const column of requiredColumns) {
    if (!headerIndex.has(column)) {
      errors.push({
        row: 1,
        message: `필수 컬럼 '${column}'이 없습니다.`
      });
    }
  }

  if (errors.length > 0) {
    return { questions: [] as CsvQuestion[], errors };
  }

  const getCell = (row: string[], column: string) =>
    cleanCell(row[headerIndex.get(column) ?? -1]);

  const questions: CsvQuestion[] = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const values = {
      question: getCell(row, "question"),
      choiceA: getCell(row, "choice_a"),
      choiceB: getCell(row, "choice_b"),
      choiceC: getCell(row, "choice_c"),
      choiceD: getCell(row, "choice_d"),
      correct: getCell(row, "correct"),
      explanation: getCell(row, "explanation"),
      tag: getCell(row, "tag"),
      category: getCell(row, "category")
    };

    const missingColumns = requiredColumns.filter((column) => {
      const value =
        column === "choice_a"
          ? values.choiceA
          : column === "choice_b"
            ? values.choiceB
            : column === "choice_c"
              ? values.choiceC
              : column === "choice_d"
                ? values.choiceD
                : values[column as keyof typeof values];

      return typeof value === "string" && value.length === 0;
    });

    if (missingColumns.length > 0) {
      errors.push({
        row: rowNumber,
        message: `필수값이 비어 있습니다: ${missingColumns.join(", ")}`
      });
      return;
    }

    const correct = normalizeChoice(values.correct);
    if (!correct) {
      errors.push({
        row: rowNumber,
        message: "correct는 A, B, C, D 중 하나여야 합니다."
      });
      return;
    }

    questions.push({
      question: values.question,
      choiceA: values.choiceA,
      choiceB: values.choiceB,
      choiceC: values.choiceC,
      choiceD: values.choiceD,
      correct,
      explanation: values.explanation,
      tag: values.tag || undefined,
      category: values.category || undefined
    });
  });

  if (questions.length === 0 && errors.length === 0) {
    errors.push({
      row: 2,
      message: "업로드할 문제가 없습니다."
    });
  }

  return { questions, errors };
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function makeCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function makeTemplateCsv() {
  const sampleRows = [
    csvTemplateHeaders,
    [
      "HTTP 상태 코드 404의 의미는?",
      "요청 성공",
      "권한 없음",
      "찾을 수 없음",
      "서버 내부 오류",
      "C",
      "404는 요청한 리소스를 찾을 수 없을 때 반환됩니다.",
      "network",
      "web"
    ],
    [
      "다음 중 JavaScript의 원시 타입이 아닌 것은?",
      "string",
      "number",
      "object",
      "boolean",
      "C",
      "object는 원시 타입이 아니라 참조 타입입니다.",
      "javascript",
      "frontend"
    ]
  ];

  return `\uFEFF${makeCsv(sampleRows)}\r\n`;
}
