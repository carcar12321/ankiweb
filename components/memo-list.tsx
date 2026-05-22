"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

type Memo = {
  content: string;
  createdAt: string;
  id: string;
  sourceConversationTitle?: string | null;
  sourceQuestionPrompt?: string | null;
  sourceText?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
};

export function MemoList({ memos }: { memos: Memo[] }) {
  const [items, setItems] = useState(memos);

  async function remove(id: string) {
    await fetch(`/api/memos/${id}`, { method: "DELETE" });
    setItems((current) => current.filter((memo) => memo.id !== id));
  }

  if (items.length === 0) {
    return <div className="empty">저장된 메모가 없습니다.</div>;
  }

  return (
    <div className="grid">
      {items.map((memo) => (
        <section className="panel form-grid" key={memo.id}>
          <div>
            <p className="eyebrow">MEMO</p>
            <h2>{memo.title || "메모"}</h2>
            <div className="pill-row">
              <span className="pill">
                {new Date(memo.createdAt).toLocaleString("ko-KR")}
              </span>
              {memo.sourceUrl ? <span className="pill">{memo.sourceUrl}</span> : null}
              {memo.sourceConversationTitle ? (
                <span className="pill">{memo.sourceConversationTitle}</span>
              ) : null}
            </div>
          </div>
          <p className="memo-content">{memo.content}</p>
          {memo.sourceQuestionPrompt ? (
            <div className="status-box">원본 문제: {memo.sourceQuestionPrompt}</div>
          ) : null}
          <div className="actions">
            <button
              className="button-ghost"
              onClick={() => remove(memo.id)}
              type="button"
            >
              <Trash2 size={16} />
              삭제
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
