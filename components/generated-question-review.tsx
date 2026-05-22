"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import type { Choice } from "@/lib/study-logic";

type Draft = {
  category?: string | null;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correct: Choice;
  explanation: string;
  id: string;
  prompt: string;
  rationale?: string | null;
  setTitle: string;
  tag?: string | null;
};

type EditableDraft = Omit<Draft, "id" | "rationale" | "setTitle">;

export function GeneratedQuestionReview({ drafts }: { drafts: Draft[] }) {
  const [items, setItems] = useState(drafts);
  const [editing, setEditing] = useState<Record<string, EditableDraft>>(
    Object.fromEntries(
      drafts.map((draft) => [
        draft.id,
        {
          category: draft.category,
          choiceA: draft.choiceA,
          choiceB: draft.choiceB,
          choiceC: draft.choiceC,
          choiceD: draft.choiceD,
          correct: draft.correct,
          explanation: draft.explanation,
          prompt: draft.prompt,
          tag: draft.tag
        }
      ])
    )
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(id: string, patch: Partial<EditableDraft>) {
    setEditing((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch
      }
    }));
  }

  async function act(id: string, action: "approve" | "reject") {
    setPendingId(id);
    setError(null);
    const response = await fetch(`/api/generated-question-drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...editing[id]
      })
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true }
      | { ok: false; message?: string }
      | null;
    setPendingId(null);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(message ?? "초안을 처리하지 못했습니다.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
  }

  if (items.length === 0) {
    return <div className="empty">검토할 AI 생성 문제가 없습니다.</div>;
  }

  return (
    <div className="grid">
      {error ? <div className="status-box error">{error}</div> : null}
      {items.map((draft) => {
        const value = editing[draft.id];

        return (
          <section className="panel form-grid" key={draft.id}>
            <div>
              <p className="eyebrow">GENERATED DRAFT</p>
              <h2>{draft.setTitle}</h2>
              {draft.rationale ? <p className="muted">{draft.rationale}</p> : null}
            </div>
            <label className="field">
              <span>문제</span>
              <textarea
                className="textarea"
                onChange={(event) =>
                  updateDraft(draft.id, { prompt: event.currentTarget.value })
                }
                value={value.prompt}
              />
            </label>
            <div className="grid grid-2">
              {(["A", "B", "C", "D"] as Choice[]).map((choice) => {
                const key = `choice${choice}` as keyof EditableDraft;

                return (
                  <label className="field" key={choice}>
                    <span>보기 {choice}</span>
                    <input
                      className="input"
                      onChange={(event) =>
                        updateDraft(draft.id, { [key]: event.currentTarget.value })
                      }
                      value={String(value[key] ?? "")}
                    />
                  </label>
                );
              })}
            </div>
            <div className="grid grid-3">
              <label className="field">
                <span>정답</span>
                <select
                  className="input"
                  onChange={(event) =>
                    updateDraft(draft.id, {
                      correct: event.currentTarget.value as Choice
                    })
                  }
                  value={value.correct}
                >
                  {(["A", "B", "C", "D"] as Choice[]).map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Part</span>
                <input
                  className="input"
                  onChange={(event) =>
                    updateDraft(draft.id, { category: event.currentTarget.value })
                  }
                  value={value.category ?? ""}
                />
              </label>
              <label className="field">
                <span>Tag</span>
                <input
                  className="input"
                  onChange={(event) =>
                    updateDraft(draft.id, { tag: event.currentTarget.value })
                  }
                  value={value.tag ?? ""}
                />
              </label>
            </div>
            <label className="field">
              <span>해설</span>
              <textarea
                className="textarea"
                onChange={(event) =>
                  updateDraft(draft.id, { explanation: event.currentTarget.value })
                }
                value={value.explanation}
              />
            </label>
            <div className="actions">
              <button
                className="button"
                disabled={pendingId === draft.id}
                onClick={() => act(draft.id, "approve")}
                type="button"
              >
                <Check size={17} />
                승인
              </button>
              <button
                className="button-ghost"
                disabled={pendingId === draft.id}
                onClick={() => act(draft.id, "reject")}
                type="button"
              >
                <X size={17} />
                거절
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
