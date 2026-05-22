"use client";

import { KeyRound, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

type AiKeyGateControls = {
  logout: () => Promise<void>;
  requireLogin: () => void;
};

type AiKeyGateProps = {
  children: (controls: AiKeyGateControls) => React.ReactNode;
  description?: string;
  title?: string;
};

type AuthState = "checking" | "authenticated" | "needs-key";

export function AiKeyGate({
  children,
  description = "AI 기능을 사용할 때만 API 키를 입력합니다. 키는 DB, 파일, localStorage에 저장하지 않습니다.",
  title = "AI 기능 로그인"
}: AiKeyGateProps) {
  const [apiKey, setApiKey] = useState("");
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/ai/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { authenticated?: boolean }) => {
        if (!active) {
          return;
        }
        setAuthState(body.authenticated ? "authenticated" : "needs-key");
      })
      .catch(() => {
        if (active) {
          setAuthState("needs-key");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/ai/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true }
      | { ok: false; message?: string }
      | null;

    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(message ?? "API 키를 확인하지 못했습니다.");
      return;
    }

    setApiKey("");
    setAuthState("authenticated");
  }

  async function logout() {
    await fetch("/api/ai/logout", { method: "POST" }).catch(() => null);
    setApiKey("");
    setAuthState("needs-key");
  }

  function requireLogin() {
    setApiKey("");
    setAuthState("needs-key");
  }

  if (authState === "checking") {
    return <div className="status-box">AI 세션을 확인하는 중입니다.</div>;
  }

  if (authState === "authenticated") {
    return (
      <div className="grid">
        <div className="ai-session-row">
          <span className="pill">AI 세션 활성화</span>
          <button className="button-ghost" onClick={logout} type="button">
            <LogOut size={16} />
            AI 로그아웃
          </button>
        </div>
        {children({ logout, requireLogin })}
      </div>
    );
  }

  return (
    <form className="form-grid ai-login-box" onSubmit={submit}>
      <div>
        <p className="eyebrow">AI LOGIN</p>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <label className="field">
        <span>OpenAI API 키</span>
        <input
          autoComplete="off"
          className="input"
          onChange={(event) => setApiKey(event.currentTarget.value)}
          placeholder="sk-..."
          type="password"
          value={apiKey}
        />
      </label>
      {error ? <div className="status-box error">{error}</div> : null}
      <button className="button" disabled={pending || !apiKey.trim()} type="submit">
        <KeyRound size={17} />
        {pending ? "확인 중" : "AI 기능 시작"}
      </button>
    </form>
  );
}
