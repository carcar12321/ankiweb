"use client";

import { CheckCircle2, ChevronRight, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Choice } from "@/lib/study-logic";

type StudyQuestion = {
  id: string;
  prompt: string;
  choices: Record<Choice, string>;
  tag?: string | null;
  category?: string | null;
};

type AnswerResult = {
  isCorrect: boolean;
  correctChoice: Choice;
  explanation: string;
};

export function StudySession({
  setTitle,
  questions
}: {
  setTitle: string;
  questions: StudyQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Choice | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [pending, setPending] = useState(false);
  const current = questions[index];
  const complete = index >= questions.length;

  const correctCount = useMemo(
    () => answers.filter(Boolean).length,
    [answers]
  );

  async function submit() {
    if (!selected || !current) {
      return;
    }

    setPending(true);
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: current.id,
        selected,
        reviewMode: false
      })
    });
    const body = (await response.json()) as AnswerResult;
    setPending(false);

    setResult(body);
    setAnswers((previous) => [...previous, body.isCorrect]);
  }

  function next() {
    setSelected(null);
    setResult(null);
    setIndex((value) => value + 1);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setResult(null);
    setAnswers([]);
  }

  if (questions.length === 0) {
    return <div className="empty">이 세트에는 아직 문제가 없습니다.</div>;
  }

  if (complete) {
    return (
      <section className="panel quiz-shell">
        <p className="eyebrow">SESSION COMPLETE</p>
        <h1>{setTitle}</h1>
        <p className="muted">
          총 {questions.length}문제 중 {correctCount}문제를 맞혔습니다.
        </p>
        <div className="actions">
          <button className="button" onClick={restart} type="button">
            <RotateCcw size={17} />
            다시 풀기
          </button>
          <Link className="button-ghost" href="/wrong-notes">
            오답노트 보기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel quiz-shell">
      <div>
        <p className="eyebrow">STUDY MODE</p>
        <h1>{setTitle}</h1>
        <p className="muted">
          {index + 1} / {questions.length}
        </p>
      </div>
      <div className="progress-line" aria-hidden="true">
        <span style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="question-card">
        <div className="pill-row">
          {current.category ? <span className="pill">{current.category}</span> : null}
          {current.tag ? <span className="pill">{current.tag}</span> : null}
        </div>
        <div className="question-prompt">{current.prompt}</div>
        <div className="choice-grid">
          {(Object.keys(current.choices) as Choice[]).map((choice) => {
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
                <span>{current.choices[choice]}</span>
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
                <CheckCircle2 size={20} /> 정답입니다
              </>
            ) : (
              <>
                <XCircle size={20} /> 오답입니다
              </>
            )}
          </h2>
          <p>
            정답: <strong>{result.correctChoice}</strong>
          </p>
          <p>{result.explanation}</p>
          <button className="button" onClick={next} type="button">
            다음 문제
            <ChevronRight size={17} />
          </button>
        </div>
      ) : (
        <button className="button" disabled={!selected || pending} onClick={submit} type="button">
          {pending ? "채점 중" : "정답 확인"}
        </button>
      )}
    </section>
  );
}
