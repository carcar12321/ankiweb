"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    setPending(false);

    if (!response.ok) {
      setError("비밀번호가 맞지 않습니다.");
      return;
    }

    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <form className="form-panel login-card" onSubmit={submit}>
      <div className="login-title">
        <p className="eyebrow">PRIVATE STUDY</p>
        <h1>OOO Interview</h1>
        <p className="muted">집과 회사에서 같은 오답노트를 이어갑니다.</p>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>비밀번호</span>
          <input
            autoComplete="current-password"
            className="input"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Railway APP_PASSWORD"
            type="password"
            value={password}
          />
        </label>
        {error ? <div className="status-box error">{error}</div> : null}
        <button className="button" disabled={pending} type="submit">
          <LockKeyhole size={17} />
          {pending ? "확인 중" : "들어가기"}
        </button>
      </div>
    </form>
  );
}
