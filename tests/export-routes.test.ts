import { afterEach, describe, expect, it, vi } from "vitest";

const findMemosMock = vi.hoisted(() => vi.fn());
const updateMemosMock = vi.hoisted(() => vi.fn());
const findWrongNotesMock = vi.hoisted(() => vi.fn());
const updateWrongNotesMock = vi.hoisted(() => vi.fn());
const findReportMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiSessionReport: {
      findUnique: findReportMock
    },
    studyMemo: {
      findMany: findMemosMock,
      updateMany: updateMemosMock
    },
    wrongNote: {
      findMany: findWrongNotesMock,
      updateMany: updateWrongNotesMock
    }
  }
}));

import { GET as downloadReport } from "@/app/api/ai/reports/[id]/download/route";
import { POST as exportMemos } from "@/app/api/exports/memos/route";
import { POST as exportWrongNotes } from "@/app/api/exports/wrong-notes/route";

function jsonRequest(body: unknown) {
  return new Request("http://test.local", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
}

describe("export routes", () => {
  afterEach(() => {
    findMemosMock.mockReset();
    updateMemosMock.mockReset();
    findWrongNotesMock.mockReset();
    updateWrongNotesMock.mockReset();
    findReportMock.mockReset();
  });

  it("rejects empty memo export selections", async () => {
    const response = await exportMemos(jsonRequest({ ids: [] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      message: "Export할 메모를 선택해주세요."
    });
  });

  it("exports selected memos and marks them exported", async () => {
    findMemosMock.mockResolvedValue([
      {
        content: "메모 내용",
        createdAt: new Date("2026-05-26T00:00:00.000Z"),
        id: "memo_1",
        sourceConversation: null,
        sourceQuestion: { prompt: "원본 문제" },
        sourceText: null,
        sourceUrl: null,
        title: "메모 제목"
      }
    ]);
    updateMemosMock.mockResolvedValue({ count: 1 });

    const response = await exportMemos(jsonRequest({ ids: ["memo_1"] }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Content-Disposition")).toContain(
      "memos-selected.md"
    );
    expect(await response.text()).toContain("메모 제목");
    expect(updateMemosMock).toHaveBeenCalledWith({
      data: { exportedAt: expect.any(Date) },
      where: { id: { in: ["memo_1"] } }
    });
  });

  it("exports selected active wrong notes and marks them exported", async () => {
    findWrongNotesMock.mockResolvedValue([
      {
        id: "wrong_1",
        lastWrongAt: new Date("2026-05-26T00:00:00.000Z"),
        manuallyAddedAt: null,
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
        wrongCount: 2
      }
    ]);
    updateWrongNotesMock.mockResolvedValue({ count: 1 });

    const response = await exportWrongNotes(jsonRequest({ ids: ["wrong_1"] }));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("오답: 2회");
    expect(updateWrongNotesMock).toHaveBeenCalledWith({
      data: { exportedAt: expect.any(Date) },
      where: { id: { in: ["wrong_1"] } }
    });
  });

  it("downloads a saved session report as markdown", async () => {
    findReportMock.mockResolvedValue({
      content: "보고서",
      createdAt: new Date("2026-05-26T00:00:00.000Z"),
      model: "gpt-test",
      prompt: "요청",
      title: "세션 보고서"
    });

    const response = await downloadReport(new Request("http://test.local"), {
      params: { id: "report_1" }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain(
      "session-report-2026-05-26.md"
    );
    expect(await response.text()).toContain("세션 보고서");
  });
});
