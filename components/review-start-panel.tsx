"use client";

import { CalendarCheck, Loader2, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  categoryFromKey,
  getCategoryKey,
  getCategoryLabel,
  type CategoryValue
} from "@/lib/categories";

type ActiveSessionSummary = {
  id: string;
  totalQuestions: number;
  currentIndex: number;
  correctCount: number;
  updatedAt: string;
};

type ReviewPartStats = {
  activeWrongCount: number;
  againCount: number;
  category: CategoryValue;
  count: number;
  dueCount: number;
  hardCount: number;
};

type ReviewStudySet = {
  id: string;
  parts: ReviewPartStats[];
  title: string;
  totalReviewed: number;
};

type WeakPartRecommendation = {
  again: number;
  hard: number;
  part: string;
  total: number;
  weak: number;
  weakRate: number;
};

function getDefaultCount(totalQuestions: number) {
  return Math.min(20, Math.max(totalQuestions, 1));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ReviewStartPanel({
  activeSession,
  recommendations,
  sets
}: {
  activeSession?: ActiveSessionSummary | null;
  recommendations: WeakPartRecommendation[];
  sets: ReviewStudySet[];
}) {
  const router = useRouter();
  const allSetIds = useMemo(() => sets.map((set) => set.id), [sets]);
  const [selectedSetIds, setSelectedSetIds] = useState(allSetIds);
  const partOptions = useMemo(() => {
    const counts = new Map<string, ReviewPartStats>();

    sets
      .filter((set) => selectedSetIds.includes(set.id))
      .flatMap((set) => set.parts)
      .forEach((part) => {
        const key = getCategoryKey(part.category);
        const current = counts.get(key);

        counts.set(key, {
          activeWrongCount:
            (current?.activeWrongCount ?? 0) + part.activeWrongCount,
          againCount: (current?.againCount ?? 0) + part.againCount,
          category: part.category,
          count: (current?.count ?? 0) + part.count,
          dueCount: (current?.dueCount ?? 0) + part.dueCount,
          hardCount: (current?.hardCount ?? 0) + part.hardCount
        });
      });

    return Array.from(counts.values()).sort((left, right) =>
      getCategoryLabel(left.category).localeCompare(getCategoryLabel(right.category))
    );
  }, [selectedSetIds, sets]);
  const allPartKeys = useMemo(
    () => partOptions.map((part) => getCategoryKey(part.category)),
    [partOptions]
  );
  const [selectedPartKeys, setSelectedPartKeys] = useState(allPartKeys);
  const selectedStats = useMemo(
    () =>
      partOptions
        .filter((part) => selectedPartKeys.includes(getCategoryKey(part.category)))
        .reduce(
          (summary, part) => ({
            activeWrongCount: summary.activeWrongCount + part.activeWrongCount,
            againCount: summary.againCount + part.againCount,
            count: summary.count + part.count,
            dueCount: summary.dueCount + part.dueCount,
            hardCount: summary.hardCount + part.hardCount
          }),
          {
            activeWrongCount: 0,
            againCount: 0,
            count: 0,
            dueCount: 0,
            hardCount: 0
          }
        ),
    [partOptions, selectedPartKeys]
  );
  const selectedTotal = selectedStats.count;
  const defaultCount = getDefaultCount(selectedTotal);
  const [questionCount, setQuestionCount] = useState(defaultCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSetIds(allSetIds);
  }, [allSetIds]);

  useEffect(() => {
    setSelectedPartKeys(allPartKeys);
  }, [allPartKeys]);

  useEffect(() => {
    setQuestionCount((value) =>
      Math.min(Math.max(1, value), Math.max(selectedTotal, 1))
    );
  }, [selectedTotal]);

  const quickOptions = useMemo(
    () =>
      Array.from(
        new Set([10, 20, 50, selectedTotal].filter((value) => value <= selectedTotal))
      ).filter((value) => value >= 1),
    [selectedTotal]
  );

  function toggleSet(setId: string) {
    setSelectedSetIds((current) =>
      current.includes(setId)
        ? current.filter((item) => item !== setId)
        : [...current, setId]
    );
  }

  function togglePart(key: string) {
    setSelectedPartKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function changeQuestionCount(nextValue: number) {
    if (!Number.isFinite(nextValue)) {
      setQuestionCount(defaultCount);
      return;
    }

    const rounded = Math.trunc(nextValue);
    setQuestionCount(Math.min(selectedTotal, Math.max(1, rounded)));
  }

  async function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "REVIEW",
        setIds: selectedSetIds,
        categories: selectedPartKeys.map(categoryFromKey),
        questionCount
      })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; sessionId: string }
      | { ok: false; message?: string }
      | null;

    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(message ?? "복습 세션을 시작하지 못했습니다.");
      return;
    }

    router.push(`/review?sessionId=${body.sessionId}`);
  }

  const activeProgress = activeSession
    ? Math.min(activeSession.currentIndex, activeSession.totalQuestions)
    : 0;

  if (sets.length === 0) {
    return (
      <section className="panel quiz-shell">
        <div>
          <p className="eyebrow">REVIEW</p>
          <h1>복습하기</h1>
        </div>
        <div className="empty">아직 풀이 이력이 있는 문제가 없습니다.</div>
      </section>
    );
  }

  return (
    <section className="panel quiz-shell">
      <div>
        <p className="eyebrow">REVIEW</p>
        <h1>복습하기</h1>
        <p className="muted">
          선택 범위 {selectedTotal}문제 중 취약한 문제에 더 높은 확률을 줍니다.
        </p>
      </div>

      {activeSession ? (
        <div className="status-box session-card">
          <div>
            <h2>진행 중인 복습</h2>
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
            <Link className="button" href={`/review?sessionId=${activeSession.id}`}>
              <Play size={17} />
              이어하기
            </Link>
          </div>
        </div>
      ) : null}

      <div className="review-stat-grid">
        <div>
          <strong>{selectedStats.count}</strong>
          <span>푼 문제</span>
        </div>
        <div>
          <strong>{selectedStats.againCount + selectedStats.hardCount}</strong>
          <span>Again/Hard</span>
        </div>
        <div>
          <strong>{selectedStats.dueCount}</strong>
          <span>오늘 due</span>
        </div>
        <div>
          <strong>{selectedStats.activeWrongCount}</strong>
          <span>활성 오답</span>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="status-box">
          <h2>추천 Part</h2>
          <div className="set-list">
            {recommendations.map((part) => (
              <div className="study-row" key={part.part}>
                <h3>{part.part}</h3>
                <div className="pill-row">
                  <span className="pill">취약 {formatPercent(part.weakRate)}</span>
                  <span className="pill">Again {part.again}</span>
                  <span className="pill">Hard {part.hard}</span>
                  <span className="pill">{part.weak} / {part.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <form className="form-grid" onSubmit={startSession}>
        <div className="field">
          <span>문제집</span>
          <div className="check-grid">
            {sets.map((set) => (
              <label className="check-card" key={set.id}>
                <input
                  checked={selectedSetIds.includes(set.id)}
                  onChange={() => toggleSet(set.id)}
                  type="checkbox"
                />
                <span>
                  {set.title}
                  <small>{set.totalReviewed}문제</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Part</span>
          <div className="check-grid">
            {partOptions.map((part) => {
              const key = getCategoryKey(part.category);

              return (
                <label className="check-card" key={key}>
                  <input
                    checked={selectedPartKeys.includes(key)}
                    onChange={() => togglePart(key)}
                    type="checkbox"
                  />
                  <span>
                    {getCategoryLabel(part.category)}
                    <small>
                      {part.count}문제 · Again/Hard{" "}
                      {part.againCount + part.hardCount}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span>총 문제 개수</span>
          <input
            className="input"
            disabled={selectedTotal === 0}
            max={selectedTotal}
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
              {option === selectedTotal ? "전체" : option}
            </button>
          ))}
        </div>

        {error ? <div className="status-box error">{error}</div> : null}

        <button
          className="button"
          disabled={pending || selectedSetIds.length === 0 || selectedTotal === 0}
          type="submit"
        >
          {pending ? <Loader2 size={17} /> : <CalendarCheck size={17} />}
          {pending ? "시작 중" : "복습 시작"}
        </button>
      </form>

      <p className="muted">
        <RotateCcw size={15} /> Again 문제는 세션 끝에 한 번 더 등장합니다.
      </p>
    </section>
  );
}
