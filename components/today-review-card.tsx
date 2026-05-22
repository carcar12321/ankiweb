"use client";

import { CalendarCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TodayReviewCard({
  dueCount,
  newCount,
  overdueCount,
  setIds,
  startCount
}: {
  dueCount: number;
  newCount: number;
  overdueCount: number;
  setIds: string[];
  startCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = pending || setIds.length === 0 || startCount <= 0;

  async function startReview() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "RANDOM",
        setIds,
        selection: dueCount > 0 ? "DUE" : "NEW",
        questionCount: startCount
      })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; sessionId: string }
      | { ok: false; message?: string }
      | null;

    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(message ?? "오늘의 복습을 시작하지 못했습니다.");
      return;
    }

    router.push(`/random-study?sessionId=${body.sessionId}`);
  }

  return (
    <section className="panel review-card">
      <div>
        <p className="eyebrow">TODAY REVIEW</p>
        <h2>오늘의 복습</h2>
        <p className="muted">
          due 문제를 먼저 풀고, due가 없으면 새 문제를 시작합니다.
        </p>
      </div>
      <div className="review-counts">
        <div>
          <strong>{dueCount}</strong>
          <span>오늘 복습</span>
        </div>
        <div>
          <strong>{overdueCount}</strong>
          <span>밀린 문제</span>
        </div>
        <div>
          <strong>{newCount}</strong>
          <span>새 문제</span>
        </div>
      </div>
      {error ? <div className="status-box error">{error}</div> : null}
      <button className="button" disabled={disabled} onClick={startReview} type="button">
        {pending ? <Loader2 size={17} /> : <CalendarCheck size={17} />}
        {pending ? "시작 중" : `오늘 복습 시작 (${startCount})`}
      </button>
    </section>
  );
}
