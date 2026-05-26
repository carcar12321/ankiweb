"use client";

import {
  CheckCircle2,
  ChevronRight,
  Download,
  RotateCcw,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  toDisplayedChoices,
  toDisplayChoice,
  toOriginalChoice
} from "@/lib/choice-order";
import type { Choice } from "@/lib/study-logic";

const FIXED_CHOICE_ORDER = "ABCD" as const;

type WrongNoteItem = {
  id: string;
  wrongCount: number;
  lastWrongAt: string;
  exportedAt?: string | null;
  manuallyAddedAt?: string | null;
  question: {
    choiceOrder?: string;
    id: string;
    prompt: string;
    choices: Record<Choice, string>;
    setTitle: string;
    tag?: string | null;
    category?: string | null;
  };
};

type AnswerResult = {
  isCorrect: boolean;
  correctChoice: Choice;
  explanation: string;
};

export function WrongNotesPanel({ notes }: { notes: WrongNoteItem[] }) {
  const [queue, setQueue] = useState(() =>
    notes.map((note) => {
      const choiceOrder = FIXED_CHOICE_ORDER;
      return {
        ...note,
        question: {
          ...note.question,
          choiceOrder,
          choices: toDisplayedChoices(choiceOrder, note.question.choices)
        }
      };
    })
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const current = queue[index];
  const selectedExportCount = selectedNoteIds.length;

  async function submit() {
    if (!selected || !current) {
      return;
    }

    setPending(true);
    const originalSelected = toOriginalChoice(
      current.question.choiceOrder ?? "ABCD",
      selected
    );
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: current.question.id,
        selected: originalSelected,
        reviewMode: true
      })
    });
    const body = (await response.json()) as AnswerResult;
    setPending(false);
    setResult({
      ...body,
      correctChoice: toDisplayChoice(
        current.question.choiceOrder ?? "ABCD",
        body.correctChoice
      )
    });
    setReviewed((value) => value + 1);
  }

  function next() {
    if (!current || !result) {
      return;
    }

    const nextQueue = result.isCorrect
      ? queue.filter((item) => item.id !== current.id)
      : queue.map((item) =>
          item.id === current.id
            ? { ...item, wrongCount: item.wrongCount + 1 }
            : item
        );

    setQueue(nextQueue);
    setSelectedNoteIds((items) =>
      items.filter((id) => nextQueue.some((note) => note.id === id))
    );
    setIndex((value) => Math.min(value + 1, Math.max(nextQueue.length - 1, 0)));
    setSelected(null);
    setResult(null);
  }

  function restart() {
    setQueue(
      notes.map((note) => {
        const choiceOrder = FIXED_CHOICE_ORDER;
        return {
          ...note,
          question: {
            ...note.question,
            choiceOrder,
            choices: toDisplayedChoices(choiceOrder, note.question.choices)
          }
        };
      })
    );
    setIndex(0);
    setSelected(null);
    setResult(null);
    setReviewed(0);
    setSelectedNoteIds([]);
  }

  function toggleNote(id: string) {
    setSelectedNoteIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((item) => item !== id)
        : [...currentIds, id]
    );
  }

  function selectAllForExport() {
    setSelectedNoteIds(queue.map((note) => note.id));
  }

  function clearExportSelection() {
    setSelectedNoteIds([]);
  }

  async function exportSelected() {
    if (selectedNoteIds.length === 0) {
      return;
    }

    setExporting(true);
    setExportError(null);

    const response = await fetch("/api/exports/wrong-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedNoteIds })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setExporting(false);
      setExportError(body?.message ?? "오답노트를 export하지 못했습니다.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const exportedAt = new Date().toISOString();
    link.href = url;
    link.download = "wrong-notes-selected.md";
    link.click();
    window.URL.revokeObjectURL(url);
    setQueue((items) =>
      items.map((note) =>
        selectedNoteIds.includes(note.id) ? { ...note, exportedAt } : note
      )
    );
    setSelectedNoteIds([]);
    setExporting(false);
  }

  if (notes.length === 0) {
    return (
      <div className="empty">
        아직 오답이 없습니다. 문제를 풀다가 틀리면 자동으로 여기에 쌓입니다.
      </div>
    );
  }

  return (
    <div className="grid">
      {current ? (
        <section className="panel quiz-shell">
          <div>
            <p className="eyebrow">WRONG NOTE REVIEW</p>
            <h1>오답 재풀이</h1>
            <p className="muted">
              남은 오답 {queue.length}개 · 이번 세션 검토 {reviewed}개
            </p>
          </div>
          <div className="question-card">
            <div className="pill-row">
              <span className="pill">{current.question.setTitle}</span>
              {current.question.category ? (
                <span className="pill">{current.question.category}</span>
              ) : null}
              {current.question.tag ? (
                <span className="pill">{current.question.tag}</span>
              ) : null}
              {current.manuallyAddedAt ? (
                <span className="pill">직접 추가</span>
              ) : (
                <span className="pill">오답 {current.wrongCount}회</span>
              )}
              {current.exportedAt ? (
                <span className="pill success-pill">이미 export됨</span>
              ) : null}
            </div>
            <div className="question-prompt">{current.question.prompt}</div>
            <div className="choice-grid">
              {(Object.keys(current.question.choices) as Choice[]).map((choice) => {
                const isSelected = selected === choice;
                const isCorrect = result?.correctChoice === choice;
                const isWrongSelected = result && isSelected && !result.isCorrect;

                return (
                  <button
                    className={[
                      "choice-button",
                      isSelected ? "selected" : "",
                      isCorrect ? "correct" : "",
                      isWrongSelected ? "incorrect" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={Boolean(result)}
                    key={choice}
                    onClick={() => setSelected(choice)}
                    type="button"
                  >
                    <span className="choice-letter">{choice}</span>
                    <span>{current.question.choices[choice]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {result ? (
            <div className={`feedback ${result.isCorrect ? "correct" : "incorrect"}`}>
              <h2 className={result.isCorrect ? "success-text" : "danger-text"}>
                {result.isCorrect ? (
                  <>
                    <CheckCircle2 size={20} /> 해결했습니다
                  </>
                ) : (
                  <>
                    <XCircle size={20} /> 다시 오답노트에 남깁니다
                  </>
                )}
              </h2>
              <p>
                정답: <strong>{result.correctChoice}</strong>
              </p>
              <p>{result.explanation}</p>
              <button className="button" onClick={next} type="button">
                다음 오답
                <ChevronRight size={17} />
              </button>
            </div>
          ) : (
            <button className="button" disabled={!selected || pending} onClick={submit} type="button">
              {pending ? "채점 중" : "정답 확인"}
            </button>
          )}
        </section>
      ) : (
        <section className="panel">
          <p className="eyebrow">CLEAR</p>
          <h1>이번 오답을 모두 확인했습니다.</h1>
          <div className="actions">
            <button className="button" onClick={restart} type="button">
              <RotateCcw size={17} />
              다시 보기
            </button>
            <Link className="button-ghost" href="/">
              대시보드
            </Link>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EXPORT</p>
            <h2>현재 오답 목록</h2>
          </div>
          <span className="pill">{selectedExportCount}개 선택</span>
        </div>
        <div className="actions" style={{ marginBottom: 14 }}>
          <button className="button-ghost" onClick={selectAllForExport} type="button">
            전체 선택
          </button>
          <button className="button-ghost" onClick={clearExportSelection} type="button">
            선택 해제
          </button>
          <button
            className="button"
            disabled={exporting || selectedExportCount === 0}
            onClick={exportSelected}
            type="button"
          >
            <Download size={17} />
            {exporting ? "Export 중" : "Markdown 다운로드"}
          </button>
        </div>
        {exportError ? <div className="status-box error">{exportError}</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>선택</th>
                <th>세트</th>
                <th>문제</th>
                <th>오답</th>
                <th>최근 오답/추가</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((note) => (
                <tr key={note.id}>
                  <td data-label="선택">
                    <label className="table-check">
                      <input
                        checked={selectedNoteIds.includes(note.id)}
                        onChange={() => toggleNote(note.id)}
                        type="checkbox"
                      />
                      <span>선택</span>
                    </label>
                  </td>
                  <td data-label="세트">{note.question.setTitle}</td>
                  <td data-label="문제">{note.question.prompt}</td>
                  <td data-label="오답">
                    {note.manuallyAddedAt ? (
                      <span className="pill">직접 추가</span>
                    ) : (
                      `${note.wrongCount}회`
                    )}
                  </td>
                  <td data-label="최근 오답/추가">
                    {new Date(note.lastWrongAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td data-label="Export">
                    {note.exportedAt ? (
                      <span className="pill success-pill">
                        이미 export됨{" "}
                        {new Date(note.exportedAt).toLocaleDateString("ko-KR")}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
