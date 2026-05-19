"use client";

import { CheckCircle2, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { Choice } from "@/lib/study-logic";

type WrongNoteItem = {
  id: string;
  wrongCount: number;
  lastWrongAt: string;
  question: {
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
  const [queue, setQueue] = useState(notes);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, setPending] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const current = queue[index];

  async function submit() {
    if (!selected || !current) {
      return;
    }

    setPending(true);
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: current.question.id,
        selected,
        reviewMode: true
      })
    });
    const body = (await response.json()) as AnswerResult;
    setPending(false);
    setResult(body);
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
    setIndex((value) => Math.min(value + 1, Math.max(nextQueue.length - 1, 0)));
    setSelected(null);
    setResult(null);
  }

  function restart() {
    setQueue(notes);
    setIndex(0);
    setSelected(null);
    setResult(null);
    setReviewed(0);
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
              <span className="pill">오답 {current.wrongCount}회</span>
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
        <h2>현재 오답 목록</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>세트</th>
                <th>문제</th>
                <th>오답</th>
                <th>최근 오답</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((note) => (
                <tr key={note.id}>
                  <td>{note.question.setTitle}</td>
                  <td>{note.question.prompt}</td>
                  <td>{note.wrongCount}회</td>
                  <td>{new Date(note.lastWrongAt).toLocaleDateString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
