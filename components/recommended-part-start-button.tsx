"use client";

import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecommendedPartStartButton({
  category,
  setIds,
  startCount
}: {
  category: string | null;
  setIds: string[];
  startCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = pending || setIds.length === 0 || startCount <= 0;

  async function startSession() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "RANDOM",
        setIds,
        categories: [category],
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
      setError(message ?? "추천 part 학습을 시작하지 못했습니다.");
      return;
    }

    router.push(`/random-study?sessionId=${body.sessionId}`);
  }

  return (
    <div className="recommended-part-action">
      <button
        className="button-ghost"
        disabled={disabled}
        onClick={startSession}
        type="button"
      >
        {pending ? <Loader2 size={17} /> : <Play size={17} />}
        학습 시작 ({startCount})
      </button>
      {error ? <small className="danger-text">{error}</small> : null}
    </div>
  );
}
