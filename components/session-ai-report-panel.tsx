"use client";

import { CircleDashed, Download, FileText, Send } from "lucide-react";
import { useState } from "react";

import { AiKeyGate } from "@/components/ai-key-gate";

type ApiError = {
  ok: false;
  message?: string;
};

export function SessionAiReportPanel({ sessionId }: { sessionId: string }) {
  const [request, setRequest] = useState(
    "내 질문 내용까지 반영해서 부족한 개념과 다음에 풀 문제 유형을 정리해줘."
  );
  const [pending, setPending] = useState(false);
  const [followUpPending, setFollowUpPending] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [followUpMessages, setFollowUpMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  async function generate(requireLogin: () => void) {
    setPending(true);
    setError(null);

    const response = await fetch("/api/ai/session-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, sessionId })
    });
    const body = (await response.json().catch(() => null)) as
      | {
          conversationId: string;
          model: string;
          ok: true;
          report: { content: string; id: string };
        }
      | ApiError
      | null;

    setPending(false);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const errorMessage = body && !body.ok ? body.message : undefined;
      setError(errorMessage ?? "AI 보고서를 생성하지 못했습니다.");
      return;
    }

    setModel(body.model);
    setReport(body.report.content);
    setReportId(body.report.id);
    setConversationId(body.conversationId);
    setFollowUpMessages([]);
  }

  async function askFollowUp(requireLogin: () => void) {
    const message = followUp.trim();

    if (!message || !conversationId) {
      return;
    }

    setFollowUpPending(true);
    setError(null);
    setFollowUp("");
    setFollowUpMessages((current) => [...current, { role: "user", text: message }]);

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, message })
    });
    const body = (await response.json().catch(() => null)) as
      | { answer: string; conversationId: string; model: string; ok: true }
      | ApiError
      | null;

    setFollowUpPending(false);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const errorMessage = body && !body.ok ? body.message : undefined;
      setError(errorMessage ?? "추가 답변을 가져오지 못했습니다.");
      return;
    }

    setConversationId(body.conversationId);
    setModel(body.model);
    setFollowUpMessages((current) => [
      ...current,
      { role: "assistant", text: body.answer }
    ]);
  }

  return (
    <section className="panel ai-panel">
      <div>
        <p className="eyebrow">AI SESSION REPORT</p>
        <h2>AI 세션 보고서</h2>
        <p className="muted">
          이번 세션 결과와 AI에게 질문했던 내용을 함께 저장형 보고서로 만듭니다.
        </p>
        {model ? <span className="pill">호출 모델 {model}</span> : null}
      </div>
      <AiKeyGate title="AI 보고서 로그인">
        {({ requireLogin }) => (
          <div className="form-grid">
            <label className="field">
              <span>AI에게 요청할 내용</span>
              <textarea
                className="textarea"
                onChange={(event) => setRequest(event.currentTarget.value)}
                value={request}
              />
            </label>
            <button
              className="button"
              disabled={pending}
              onClick={() => generate(requireLogin)}
              type="button"
            >
              {pending ? <CircleDashed size={17} /> : <FileText size={17} />}
              {pending ? "보고서 생성 중" : "보고서 만들기"}
            </button>
            {reportId ? (
              <a
                className="button-ghost"
                href={`/api/ai/reports/${reportId}/download`}
              >
                <Download size={17} />
                Markdown 다운로드
              </a>
            ) : null}
            {report ? (
              <div className="ai-message assistant">
                <strong>AI 보고서</strong>
                <p>{report}</p>
              </div>
            ) : null}
            {followUpMessages.length > 0 ? (
              <div className="ai-messages">
                {followUpMessages.map((message, index) => (
                  <div className={`ai-message ${message.role}`} key={index}>
                    <strong>{message.role === "user" ? "나" : "AI"}</strong>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {conversationId ? (
              <form
                className="ai-chat-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void askFollowUp(requireLogin);
                }}
              >
                <input
                  className="input"
                  onChange={(event) => setFollowUp(event.currentTarget.value)}
                  placeholder="보고서에 이어서 추가 요청을 입력하세요."
                  value={followUp}
                />
                <button
                  className="button"
                  disabled={followUpPending || !followUp.trim()}
                  type="submit"
                >
                  {followUpPending ? <CircleDashed size={17} /> : <Send size={17} />}
                  추가 요청
                </button>
              </form>
            ) : null}
          </div>
        )}
      </AiKeyGate>
      {error ? <div className="status-box error">{error}</div> : null}
    </section>
  );
}
