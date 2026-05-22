"use client";

import { Bot, CircleDashed, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AiKeyGate } from "@/components/ai-key-gate";

type QuestionSetOption = {
  id: string;
  title: string;
};

type ConversationSummary = {
  createdAt: string;
  id: string;
  latestMessage: string;
  messageCount: number;
  model?: string | null;
  scope: string;
  title: string;
  updatedAt: string;
};

type SessionReportSummary = {
  content: string;
  createdAt: string;
  id: string;
  model?: string | null;
  title: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ApiError = {
  ok: false;
  message?: string;
};

export function AiStudyWorkspace({
  conversations,
  reports,
  sets
}: {
  conversations: ConversationSummary[];
  reports: SessionReportSummary[];
  sets: QuestionSetOption[];
}) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [generationCount, setGenerationCount] = useState(5);
  const [selectedSetId, setSelectedSetId] = useState(sets[0]?.id ?? "");
  const [generatedCount, setGeneratedCount] = useState(0);
  const [pending, setPending] = useState<"chat" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState(conversations);
  const [savedReports, setSavedReports] = useState(reports);

  async function ask(requireLogin: () => void) {
    const text = message.trim();
    if (!text) {
      return;
    }

    setPending("chat");
    setError(null);
    setChatMessages((current) => [...current, { role: "user", text }]);
    setMessage("");

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, message: text })
    });
    const body = (await response.json().catch(() => null)) as
      | {
          answer: string;
          conversationId: string;
          model: string;
          ok: true;
        }
      | ApiError
      | null;

    setPending(null);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const errorMessage = body && !body.ok ? body.message : undefined;
      setError(errorMessage ?? "AI 답변을 가져오지 못했습니다.");
      return;
    }

    setConversationId(body.conversationId);
    setCurrentModel(body.model);
    setChatMessages((current) => [
      ...current,
      { role: "assistant", text: body.answer }
    ]);
  }

  async function generateQuestions(requireLogin: () => void) {
    const prompt = generationPrompt.trim();
    if (!prompt || !selectedSetId) {
      setError("문제집과 생성 요청을 입력해주세요.");
      return;
    }

    setPending("generate");
    setError(null);
    const response = await fetch("/api/ai/generate-from-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: generationCount,
        prompt,
        setId: selectedSetId
      })
    });
    const body = (await response.json().catch(() => null)) as
      | { drafts: Array<{ id: string }>; model: string; ok: true }
      | ApiError
      | null;

    setPending(null);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const errorMessage = body && !body.ok ? body.message : undefined;
      setError(errorMessage ?? "문제를 생성하지 못했습니다.");
      return;
    }

    setCurrentModel(body.model);
    setGeneratedCount(body.drafts.length);
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    setHistory((current) => current.filter((item) => item.id !== id));
  }

  async function deleteReport(id: string) {
    await fetch(`/api/ai/reports/${id}`, { method: "DELETE" });
    setSavedReports((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="grid">
      <section className="panel ai-panel">
        <div>
          <p className="eyebrow">AI STUDY ROOM</p>
          <h2>전역 AI 학습실</h2>
          <p className="muted">
            문제풀이 중이 아니어도 개념 질문, 프롬프트 기반 출제, 학습 상담을
            할 수 있습니다.
          </p>
          {currentModel ? <span className="pill">현재 호출 모델 {currentModel}</span> : null}
        </div>
        <AiKeyGate title="AI 학습실 로그인">
          {({ requireLogin }) => (
            <div className="grid">
              <form
                className="ai-chat-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void ask(requireLogin);
                }}
              >
                <input
                  className="input"
                  onChange={(event) => setMessage(event.currentTarget.value)}
                  placeholder="개념 설명, 요약, 암기 포인트, 공부 계획을 물어보세요."
                  value={message}
                />
                <button
                  className="button"
                  disabled={pending !== null || !message.trim()}
                  type="submit"
                >
                  {pending === "chat" ? <CircleDashed size={17} /> : <Bot size={17} />}
                  질문
                </button>
              </form>

              <div className="ai-messages">
                {chatMessages.map((item, index) => (
                  <div className={`ai-message ${item.role}`} key={index}>
                    <strong>{item.role === "user" ? "나" : "AI"}</strong>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="status-box form-grid">
                <h3>프롬프트로 문제 만들기</h3>
                <div className="grid grid-2">
                  <label className="field">
                    <span>저장할 문제집</span>
                    <select
                      className="input"
                      onChange={(event) => setSelectedSetId(event.currentTarget.value)}
                      value={selectedSetId}
                    >
                      {sets.map((set) => (
                        <option key={set.id} value={set.id}>
                          {set.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>생성 개수</span>
                    <input
                      className="input"
                      max={10}
                      min={1}
                      onChange={(event) =>
                        setGenerationCount(Number(event.currentTarget.value))
                      }
                      type="number"
                      value={generationCount}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>생성 요청</span>
                  <textarea
                    className="textarea"
                    onChange={(event) => setGenerationPrompt(event.currentTarget.value)}
                    placeholder="예: HTTP 상태 코드에서 404, 403, 500을 헷갈리지 않도록 실전형 문제를 만들어줘."
                    value={generationPrompt}
                  />
                </label>
                <button
                  className="button-ghost"
                  disabled={pending !== null || !generationPrompt.trim() || !selectedSetId}
                  onClick={() => generateQuestions(requireLogin)}
                  type="button"
                >
                  {pending === "generate" ? (
                    <CircleDashed size={17} />
                  ) : (
                    <Wand2 size={17} />
                  )}
                  문제 초안 생성
                </button>
                {generatedCount > 0 ? (
                  <div className="status-box success">
                    {generatedCount}개 초안을 만들었습니다.{" "}
                    <Link className="inline-link" href="/generated-questions">
                      검토하러 가기
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </AiKeyGate>
        {error ? <div className="status-box error">{error}</div> : null}
      </section>

      <section className="grid grid-2">
        <div className="panel">
          <h2>AI 질문 기록</h2>
          {history.length === 0 ? (
            <div className="empty">저장된 AI 기록이 없습니다.</div>
          ) : (
            <div className="set-list">
              {history.map((item) => (
                <div className="study-row" key={item.id}>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.latestMessage}</p>
                  <div className="pill-row">
                    <span className="pill">{item.scope}</span>
                    {item.model ? <span className="pill">{item.model}</span> : null}
                    <span className="pill">{item.messageCount}개 메시지</span>
                  </div>
                  <div className="actions" style={{ marginTop: 10 }}>
                    <Link className="button-ghost" href={`/ai-study/${item.id}`}>
                      보기
                    </Link>
                    <button
                      className="button-ghost"
                      onClick={() => deleteConversation(item.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>세션 AI 보고서</h2>
          {savedReports.length === 0 ? (
            <div className="empty">저장된 세션 보고서가 없습니다.</div>
          ) : (
            <div className="set-list">
              {savedReports.map((report) => (
                <div className="study-row" key={report.id}>
                  <h3>{report.title}</h3>
                  <p className="muted">{report.content.slice(0, 180)}</p>
                  <div className="pill-row">
                    {report.model ? <span className="pill">{report.model}</span> : null}
                    <span className="pill">
                      {new Date(report.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <div className="actions" style={{ marginTop: 10 }}>
                    <button
                      className="button-ghost"
                      onClick={() => deleteReport(report.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
