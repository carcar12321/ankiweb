"use client";

import { Save } from "lucide-react";
import { useState } from "react";

type ModelOption = {
  description: string;
  id: string;
  label: string;
};

type Settings = {
  customInstructions: string;
  model: string;
  reasoningEffort: string;
  tone: string;
};

export function AiSettingsForm({
  modelOptions,
  reasoningEfforts,
  settings
}: {
  modelOptions: ModelOption[];
  reasoningEfforts: readonly string[];
  settings: Settings;
}) {
  const [form, setForm] = useState(settings);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentModel = modelOptions.find((option) => option.id === form.model);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/ai/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true; settings: Settings }
      | { ok: false; message?: string }
      | null;
    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const errorMessage = body && !body.ok ? body.message : undefined;
      setError(errorMessage ?? "AI 설정을 저장하지 못했습니다.");
      return;
    }

    setForm(body.settings);
    setMessage("AI 설정을 저장했습니다.");
  }

  return (
    <section className="panel form-grid">
      <div>
        <p className="eyebrow">AI SETTINGS</p>
        <h2>모델과 답변 톤</h2>
        <p className="muted">
          현재 모델: <strong>{currentModel?.label ?? form.model}</strong>
          {currentModel ? ` · ${currentModel.description}` : ""}
        </p>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <div className="grid grid-2">
          <label className="field">
            <span>호출 모델</span>
            <select
              className="input"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((current) => ({
                  ...current,
                  model: value
                }));
              }}
              value={form.model}
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Reasoning effort</span>
            <select
              className="input"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((current) => ({
                  ...current,
                  reasoningEffort: value
                }));
              }}
              value={form.reasoningEffort}
            >
              {reasoningEfforts.map((effort) => (
                <option key={effort} value={effort}>
                  {effort}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>답변 톤</span>
          <input
            className="input"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({ ...current, tone: value }));
            }}
            value={form.tone}
          />
        </label>
        <label className="field">
          <span>추가 지시사항</span>
          <textarea
            className="textarea"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                customInstructions: value
              }));
            }}
            placeholder="예: 중복 설명은 줄이고, 시험 대비 암기 포인트와 실전 판단 기준을 먼저 정리해줘."
            value={form.customInstructions}
          />
        </label>
        {message ? <div className="status-box success">{message}</div> : null}
        {error ? <div className="status-box error">{error}</div> : null}
        <button className="button" disabled={pending} type="submit">
          <Save size={17} />
          {pending ? "저장 중" : "AI 설정 저장"}
        </button>
      </form>
    </section>
  );
}
