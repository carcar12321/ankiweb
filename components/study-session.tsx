"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  RotateCcw,
  ThumbsUp,
  XCircle,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ReviewRating } from "@/lib/scheduler";
import type { Choice } from "@/lib/study-logic";

type StudyQuestion = {
  id: string;
  prompt: string;
  choices: Record<Choice, string>;
  correctChoice?: Choice | null;
  explanation?: string | null;
  isCorrect?: boolean | null;
  selected?: Choice | null;
  answeredAt?: string | null;
  setTitle?: string | null;
  tag?: string | null;
  category?: string | null;
};

type AnswerResult = {
  ok: true;
  isCorrect: boolean;
  correctChoice: Choice;
  selectedChoice: Choice;
  explanation: string;
  currentIndex: number;
  totalQuestions: number;
};

type RateResult = {
  ok: true;
  currentIndex: number;
  totalQuestions: number;
  complete: boolean;
  correctCount: number;
  nextDueAt: string;
  intervalDays: number;
  easeFactor: number;
};

type ApiError = {
  ok: false;
  message?: string;
};

const ratingOptions: Array<{
  value: ReviewRating;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { value: "AGAIN", label: "다시", icon: RotateCcw },
  { value: "HARD", label: "어려움", icon: AlertCircle },
  { value: "GOOD", label: "좋음", icon: ThumbsUp },
  { value: "EASY", label: "쉬움", icon: Zap }
];

function makeInitialResult(question: StudyQuestion | undefined) {
  if (
    !question?.answeredAt ||
    question.isCorrect === null ||
    question.isCorrect === undefined ||
    !question.correctChoice ||
    !question.selected
  ) {
    return null;
  }

  return {
    ok: true,
    isCorrect: question.isCorrect,
    correctChoice: question.correctChoice,
    selectedChoice: question.selected,
    explanation: question.explanation ?? "",
    currentIndex: 0,
    totalQuestions: 0
  } satisfies AnswerResult;
}

export function StudySession({
  initialCorrectCount,
  initialIndex,
  questions,
  sessionId,
  setupHref,
  setTitle
}: {
  initialCorrectCount: number;
  initialIndex: number;
  questions: StudyQuestion[];
  sessionId: string;
  setupHref: string;
  setTitle: string;
}) {
  const initialQuestion = questions[initialIndex];
  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<Choice | null>(
    initialQuestion?.selected ?? null
  );
  const [result, setResult] = useState<AnswerResult | null>(
    makeInitialResult(initialQuestion)
  );
  const [correctCount, setCorrectCount] = useState(initialCorrectCount);
  const [pending, setPending] = useState(false);
  const [pendingRating, setPendingRating] = useState<ReviewRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = questions[index];
  const complete = index >= questions.length;

  async function submit() {
    if (!selected || !current) {
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch(`/api/study-sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: current.id,
        selected
      })
    });
    const body = (await response.json().catch(() => null)) as
      | AnswerResult
      | ApiError
      | null;

    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(
        message ?? "채점 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요."
      );
      return;
    }

    setResult(body);
    setSelected(body.selectedChoice);
  }

  async function rate(rating: ReviewRating) {
    if (!result || !current) {
      return;
    }

    setPendingRating(rating);
    setError(null);

    const response = await fetch(`/api/study-sessions/${sessionId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: current.id,
        rating
      })
    });
    const body = (await response.json().catch(() => null)) as
      | RateResult
      | ApiError
      | null;

    setPendingRating(null);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(
        message ?? "자가평가 저장 중 문제가 생겼습니다. 다시 시도해주세요."
      );
      return;
    }

    setCorrectCount(body.correctCount);
    setSelected(null);
    setResult(null);
    setIndex(body.complete ? questions.length : body.currentIndex);
  }

  if (questions.length === 0) {
    return <div className="empty">아직 문제가 없습니다.</div>;
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
          <Link className="button" href={setupHref}>
            <RotateCcw size={17} />
            다시 시작
          </Link>
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
          {current.setTitle ? <span className="pill">{current.setTitle}</span> : null}
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
                disabled={Boolean(result) || pending}
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
      {error ? <div className="status-box error">{error}</div> : null}
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
          {result.explanation ? <p>{result.explanation}</p> : null}
          <div className="rating-grid" aria-label="자가평가">
            {ratingOptions.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  className="button-ghost rating-button"
                  disabled={Boolean(pendingRating)}
                  key={option.value}
                  onClick={() => rate(option.value)}
                  type="button"
                >
                  {pendingRating === option.value ? (
                    <CircleDashed size={17} />
                  ) : (
                    <Icon size={17} />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button className="button" disabled={!selected || pending} onClick={submit} type="button">
          {pending ? "채점 중" : "정답 확인"}
        </button>
      )}
    </section>
  );
}
