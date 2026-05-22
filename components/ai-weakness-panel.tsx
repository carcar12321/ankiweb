"use client";

import { BarChart3, CircleDashed } from "lucide-react";
import { useState } from "react";

import { AiKeyGate } from "@/components/ai-key-gate";

type AiError = {
  ok: false;
  message?: string;
};

export function AiWeaknessPanel() {
  const [pending, setPending] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buildReport(requireLogin: () => void) {
    setPending(true);
    setError(null);

    const response = await fetch("/api/ai/weakness-report", {
      method: "POST"
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; report: string }
      | AiError
      | null;

    setPending(false);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const fallback =
        response.status === 401
          ? "API 키 입력이 필요합니다."
          : "AI 분석을 가져오지 못했습니다.";
      const message = body && !body.ok ? body.message : undefined;
      setError(message ?? fallback);
      return;
    }

    setReport(body.report);
  }

  return (
    <section className="panel ai-panel">
      <div>
        <p className="eyebrow">AI WEAKNESS REPORT</p>
        <h2>오답 기반 약점 분석</h2>
        <p className="muted">
          활성 오답노트와 최근 자가평가 기록만 보내서 부족한 part와 다음 학습
          순서를 분석합니다.
        </p>
      </div>
      <AiKeyGate title="AI 약점 분석 로그인">
        {({ requireLogin }) => (
          <div className="grid">
            <button
              className="button"
              disabled={pending}
              onClick={() => buildReport(requireLogin)}
              type="button"
            >
              {pending ? <CircleDashed size={17} /> : <BarChart3 size={17} />}
              {pending ? "분석 중" : "약점 리포트 만들기"}
            </button>
            {report ? (
              <div className="ai-message assistant">
                <strong>AI 분석</strong>
                <p>{report}</p>
              </div>
            ) : null}
          </div>
        )}
      </AiKeyGate>
      {error ? <div className="status-box error">{error}</div> : null}
    </section>
  );
}
