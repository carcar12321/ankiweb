"use client";

import { Loader2, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ActiveSessionSummary = {
  id: string;
  totalQuestions: number;
  currentIndex: number;
  correctCount: number;
  updatedAt: string;
};

export function StudyStartPanel({
  activeSession,
  setId,
  setTitle,
  totalQuestions
}: {
  activeSession?: ActiveSessionSummary | null;
  setId: string;
  setTitle: string;
  totalQuestions: number;
}) {
  const router = useRouter();
  const defaultCount = Math.min(20, Math.max(totalQuestions, 1));
  const [questionCount, setQuestionCount] = useState(defaultCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickOptions = useMemo(
    () =>
      Array.from(
        new Set([10, 20, 50, totalQuestions].filter((value) => value <= totalQuestions))
      ).filter((value) => value >= 1),
    [totalQuestions]
  );

  function changeQuestionCount(nextValue: number) {
    if (!Number.isFinite(nextValue)) {
      setQuestionCount(defaultCount);
      return;
    }

    const rounded = Math.trunc(nextValue);
    setQuestionCount(Math.min(totalQuestions, Math.max(1, rounded)));
  }

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setId,
        questionCount
      })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; sessionId: string }
      | { ok: false; message?: string }
      | null;

    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const message = body && "message" in body ? body.message : undefined;
      setError(message ?? "새 풀이를 시작하지 못했습니다.");
      return;
    }

    router.push(`/study/${setId}?sessionId=${body.sessionId}`);
  }

  const activeProgress = activeSession
    ? Math.min(activeSession.currentIndex, activeSession.totalQuestions)
    : 0;

  return (
    <section className="panel quiz-shell">
      <div>
        <p className="eyebrow">STUDY SETUP</p>
        <h1>{setTitle}</h1>
        <p className="muted">
          총 {totalQuestions}문제 중 원하는 개수만 골라 공부합니다.
        </p>
      </div>

      {activeSession ? (
        <div className="status-box session-card">
          <div>
            <h2>진행 중인 풀이</h2>
            <p className="muted">
              {activeProgress} / {activeSession.totalQuestions}문제 완료 · 정답{" "}
              {activeSession.correctCount}개
            </p>
          </div>
          <div className="progress-line" aria-hidden="true">
            <span
              style={{
                width: `${(activeProgress / activeSession.totalQuestions) * 100}%`
              }}
            />
          </div>
          <div className="actions">
            <Link className="button" href={`/study/${setId}?sessionId=${activeSession.id}`}>
              <Play size={17} />
              이어하기
            </Link>
          </div>
        </div>
      ) : null}

      <form className="form-grid" onSubmit={startSession}>
        <div>
          <h2>{activeSession ? "새로 시작" : "풀이 시작"}</h2>
          <p className="muted">
            새로 시작하면 진행 중인 풀이가 있더라도 새 세션으로 교체됩니다.
          </p>
        </div>

        <label className="field">
          <span>공부할 문제 개수</span>
          <input
            className="input"
            max={totalQuestions}
            min={1}
            onChange={(event) => changeQuestionCount(Number(event.currentTarget.value))}
            type="number"
            value={questionCount}
          />
        </label>

        <div className="quick-options" aria-label="빠른 문제 개수 선택">
          {quickOptions.map((option) => (
            <button
              className={`button-ghost${questionCount === option ? " active" : ""}`}
              key={option}
              onClick={() => changeQuestionCount(option)}
              type="button"
            >
              {option === totalQuestions ? "전체" : option}
            </button>
          ))}
        </div>

        {error ? <div className="status-box error">{error}</div> : null}

        <button className="button" disabled={pending || totalQuestions === 0} type="submit">
          {pending ? <Loader2 size={17} /> : <RotateCcw size={17} />}
          {pending ? "시작 중" : activeSession ? "새 풀이 시작" : "풀이 시작"}
        </button>
      </form>
    </section>
  );
}
