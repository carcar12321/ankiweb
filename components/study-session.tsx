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
import { useMemo, useState } from "react";

import { AiTutorPanel } from "@/components/ai-tutor-panel";
import { SessionAiReportPanel } from "@/components/session-ai-report-panel";
import type { ReviewRating } from "@/lib/scheduler";
import { buildSessionReport } from "@/lib/study-insights";
import type { Choice } from "@/lib/study-logic";

type StudyQuestion = {
  answeredAt?: string | null;
  category?: string | null;
  choiceOrder: string;
  choices: Record<Choice, string>;
  correctChoice?: Choice | null;
  explanation?: string | null;
  id: string;
  isCorrect?: boolean | null;
  nextDueAt?: string | null;
  prompt: string;
  rating?: ReviewRating | null;
  selected?: Choice | null;
  setTitle?: string | null;
  tag?: string | null;
};

type AnswerResult = {
  correctChoice: Choice;
  currentIndex: number;
  explanation: string;
  isCorrect: boolean;
  ok: true;
  selectedChoice: Choice;
  totalQuestions: number;
};

type RateResult = {
  appendedQuestion: Omit<
    StudyQuestion,
    | "answeredAt"
    | "correctChoice"
    | "explanation"
    | "isCorrect"
    | "nextDueAt"
    | "rating"
    | "selected"
  > | null;
  complete: boolean;
  correctCount: number;
  currentIndex: number;
  easeFactor: number;
  intervalDays: number;
  nextDueAt: string;
  ok: true;
  totalQuestions: number;
};

type ApiError = {
  message?: string;
  ok: false;
};

const ratingOptions: Array<{
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: ReviewRating;
}> = [
  { value: "AGAIN", label: "다시", icon: RotateCcw },
  { value: "HARD", label: "어려움", icon: AlertCircle },
  { value: "GOOD", label: "좋음", icon: ThumbsUp },
  { value: "EASY", label: "쉬움", icon: Zap }
];

const ratingLabels: Record<ReviewRating, string> = {
  AGAIN: "다시",
  HARD: "어려움",
  GOOD: "좋음",
  EASY: "쉬움"
};

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
    correctChoice: question.correctChoice,
    currentIndex: 0,
    explanation: question.explanation ?? "",
    isCorrect: question.isCorrect,
    ok: true,
    selectedChoice: question.selected,
    totalQuestions: 0
  } satisfies AnswerResult;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDueDate(value: Date | null) {
  if (!value) {
    return "예정 없음";
  }

  return value.toLocaleDateString("ko-KR", {
    day: "numeric",
    month: "short"
  });
}

export function StudySession({
  initialCorrectCount: _initialCorrectCount,
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
  const [questionQueue, setQuestionQueue] = useState(questions);
  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<Choice | null>(
    initialQuestion?.selected ?? null
  );
  const [result, setResult] = useState<AnswerResult | null>(
    makeInitialResult(initialQuestion)
  );
  const [pending, setPending] = useState(false);
  const [pendingRating, setPendingRating] = useState<ReviewRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = questionQueue[index];
  const complete = index >= questionQueue.length;
  const report = useMemo(
    () =>
      buildSessionReport(
        questionQueue.map((question) => ({
          category: question.category,
          isCorrect: question.isCorrect,
          nextDueAt: question.nextDueAt,
          rating: question.rating
        }))
      ),
    [questionQueue]
  );

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
      setError(message ?? "채점 중 문제가 생겼습니다. 다시 시도해주세요.");
      return;
    }

    setQuestionQueue((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              answeredAt: new Date().toISOString(),
              correctChoice: body.correctChoice,
              explanation: body.explanation,
              isCorrect: body.isCorrect,
              selected: body.selectedChoice
            }
          : item
      )
    );
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
      setError(message ?? "자가평가 저장 중 문제가 생겼습니다. 다시 시도해주세요.");
      return;
    }

    setQuestionQueue((items) => {
      const updatedItems = items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              nextDueAt: body.nextDueAt,
              rating
            }
          : item
      );

      if (!body.appendedQuestion) {
        return updatedItems;
      }

      return [
        ...updatedItems,
        {
          ...body.appendedQuestion,
          answeredAt: null,
          correctChoice: null,
          explanation: null,
          isCorrect: null,
          nextDueAt: null,
          rating: null,
          selected: null
        }
      ];
    });
    setSelected(null);
    setResult(null);
    setIndex(body.complete ? body.totalQuestions : body.currentIndex);
  }

  if (questionQueue.length === 0) {
    return <div className="empty">아직 문제가 없습니다.</div>;
  }

  if (complete) {
    return (
      <div className="grid">
        <section className="panel quiz-shell">
          <p className="eyebrow">SESSION COMPLETE</p>
          <h1>{setTitle}</h1>
          <div className="report-grid">
            <div className="status-box">
              <strong>{formatPercent(report.accuracy)}</strong>
              <span>정답률</span>
            </div>
            <div className="status-box">
              <strong>
                {report.correctCount} / {report.answeredCount}
              </strong>
              <span>맞힌 문제</span>
            </div>
            <div className="status-box">
              <strong>{formatDueDate(report.nextReview.earliestNextDueAt)}</strong>
              <span>가장 빠른 다음 복습</span>
            </div>
          </div>

          <div className="pill-row">
            {ratingOptions.map((option) => (
              <span className="pill" key={option.value}>
                {ratingLabels[option.value]} {report.ratingCounts[option.value]}
              </span>
            ))}
            <span className="pill">
              오늘 다시 볼 문제 {report.nextReview.dueTodayCount}
            </span>
            <span className="pill">예약된 복습 {report.nextReview.futureDueCount}</span>
          </div>

          {report.partStats.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>정답률</th>
                    <th>어려움</th>
                  </tr>
                </thead>
                <tbody>
                  {report.partStats.map((part) => (
                    <tr key={part.part}>
                      <td data-label="Part">{part.part}</td>
                      <td data-label="정답률">
                        {formatPercent(
                          part.total === 0 ? 0 : part.correct / part.total
                        )}
                      </td>
                      <td data-label="어려움">
                        {part.weak} / {part.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="actions">
            <Link className="button" href={setupHref}>
              <RotateCcw size={17} />
              다시 시작
            </Link>
            <Link className="button-ghost" href="/ai-study">
              AI 학습실
            </Link>
            <Link className="button-ghost" href="/wrong-notes">
              오답노트 보기
            </Link>
          </div>
        </section>
        <SessionAiReportPanel sessionId={sessionId} />
      </div>
    );
  }

  return (
    <div className="grid">
      <section className="panel quiz-shell">
        <div>
          <p className="eyebrow">STUDY MODE</p>
          <h1>{setTitle}</h1>
          <p className="muted">
            {index + 1} / {questionQueue.length}
          </p>
        </div>
        <div className="progress-line" aria-hidden="true">
          <span
            style={{ width: `${((index + 1) / questionQueue.length) * 100}%` }}
          />
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
          <button
            className="button"
            disabled={!selected || pending}
            onClick={submit}
            type="button"
          >
            {pending ? "채점 중" : "정답 확인"}
          </button>
        )}
      </section>

      <AiTutorPanel
        answered={Boolean(result || current.answeredAt)}
        currentIndex={index}
        questionId={current.id}
        sessionId={sessionId}
      />
    </div>
  );
}
