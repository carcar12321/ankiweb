"use client";

import { Bot, CircleDashed, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AiKeyGate } from "@/components/ai-key-gate";

type TutorMessage = {
  role: "user" | "assistant";
  text: string;
};

type AiTutorPanelProps = {
  answered: boolean;
  currentIndex: number;
  questionId: string;
  sessionId: string;
};

type AiError = {
  ok: false;
  message?: string;
};

export function AiTutorPanel({
  answered,
  currentIndex,
  questionId,
  sessionId
}: AiTutorPanelProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [pending, setPending] = useState<"explain" | "chat" | "similar" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  useEffect(() => {
    setConversationId(null);
    setCurrentModel(null);
    setDraft("");
    setDraftCount(0);
    setError(null);
    setMessages([]);
    setPending(null);
  }, [currentIndex, questionId]);

  async function askTutor(
    mode: "explain" | "chat",
    message: string | undefined,
    requireLogin: () => void
  ) {
    if (!answered) {
      setError("정답 확인 후 AI 해설을 요청할 수 있습니다.");
      return;
    }

    setPending(mode);
    setError(null);

    const nextMessages =
      mode === "chat" && message
        ? [...messages, { role: "user" as const, text: message }]
        : messages;
    setMessages(nextMessages);
    setDraft("");

    const response = await fetch("/api/ai/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentIndex,
        conversationId,
        message,
        mode,
        questionId,
        sessionId
      })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; answer: string; conversationId: string; model: string }
      | AiError
      | null;

    setPending(null);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const fallback =
        response.status === 401
          ? "API 키 입력이 필요합니다."
          : "AI 답변을 가져오지 못했습니다.";
      const messageText = body && !body.ok ? body.message : undefined;
      setError(messageText ?? fallback);
      return;
    }

    setConversationId(body.conversationId);
    setCurrentModel(body.model);
    setMessages([
      ...nextMessages,
      {
        role: "assistant",
        text: body.answer
      }
    ]);
  }

  async function generateSimilar(requireLogin: () => void) {
    if (!answered) {
      setError("정답 확인 후 유사 문제를 만들 수 있습니다.");
      return;
    }

    setPending("similar");
    setError(null);
    const response = await fetch("/api/ai/generate-similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 3, questionId })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; drafts: Array<{ id: string }>; model?: string }
      | AiError
      | null;

    setPending(null);

    if (response.status === 401) {
      requireLogin();
    }

    if (!response.ok || !body || !body.ok) {
      const fallback =
        response.status === 401
          ? "API 키 입력이 필요합니다."
          : "유사 문제를 생성하지 못했습니다.";
      const messageText = body && !body.ok ? body.message : undefined;
      setError(messageText ?? fallback);
      return;
    }

    setCurrentModel(body.model ?? currentModel);
    setDraftCount(body.drafts.length);
  }

  return (
    <section className="panel ai-panel">
      <div>
        <p className="eyebrow">AI TUTOR</p>
        <h2>학습 도우미</h2>
        <p className="muted">
          현재 문제와 최소 학습 요약만 보내서 해설, 추가 질문, 유사 문제 생성을
          요청합니다.
        </p>
        {currentModel ? <span className="pill">호출 모델 {currentModel}</span> : null}
      </div>

      <AiKeyGate>
        {({ requireLogin }) => (
          <>
            {!answered ? (
              <div className="status-box">
                먼저 정답을 확인하면 AI 해설과 유사 문제 생성이 열립니다.
              </div>
            ) : null}
            <div className="actions">
              <button
                className="button"
                disabled={!answered || pending !== null}
                onClick={() => askTutor("explain", undefined, requireLogin)}
                type="button"
              >
                {pending === "explain" ? (
                  <CircleDashed size={17} />
                ) : (
                  <Bot size={17} />
                )}
                자세한 해설
              </button>
              <button
                className="button-ghost"
                disabled={!answered || pending !== null}
                onClick={() => generateSimilar(requireLogin)}
                type="button"
              >
                {pending === "similar" ? (
                  <CircleDashed size={17} />
                ) : (
                  <Wand2 size={17} />
                )}
                유사 문제 3개
              </button>
            </div>

            {draftCount > 0 ? (
              <div className="status-box success">
                {draftCount}개 초안을 만들었습니다.{" "}
                <Link className="inline-link" href="/generated-questions">
                  검토하러 가기
                </Link>
              </div>
            ) : null}

            <div className="ai-messages">
              {messages.map((message, index) => (
                <div className={`ai-message ${message.role}`} key={index}>
                  <strong>{message.role === "user" ? "나" : "AI"}</strong>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <form
              className="ai-chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                const message = draft.trim();
                if (message) {
                  void askTutor("chat", message, requireLogin);
                }
              }}
            >
              <input
                className="input"
                disabled={!answered || pending !== null}
                onChange={(event) => setDraft(event.currentTarget.value)}
                placeholder="추가 해설이나 개념 설명을 물어보세요."
                value={draft}
              />
              <button
                className="button-ghost"
                disabled={!answered || pending !== null || !draft.trim()}
                type="submit"
              >
                {pending === "chat" ? (
                  <CircleDashed size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
                질문
              </button>
            </form>
          </>
        )}
      </AiKeyGate>

      {error ? <div className="status-box error">{error}</div> : null}
    </section>
  );
}
