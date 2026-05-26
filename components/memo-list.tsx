"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";

type Memo = {
  content: string;
  createdAt: string;
  exportedAt?: string | null;
  id: string;
  sourceConversationTitle?: string | null;
  sourceQuestionPrompt?: string | null;
  sourceText?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
};

export function MemoList({ memos }: { memos: Memo[] }) {
  const [items, setItems] = useState(memos);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = selectedIds.length;

  async function remove(id: string) {
    await fetch(`/api/memos/${id}`, { method: "DELETE" });
    setItems((current) => current.filter((memo) => memo.id !== id));
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  function toggleMemo(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function selectAll() {
    setSelectedIds(items.map((memo) => memo.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function exportSelected() {
    if (selectedIds.length === 0) {
      return;
    }

    setExporting(true);
    setError(null);

    const response = await fetch("/api/exports/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setExporting(false);
      setError(body?.message ?? "메모를 export하지 못했습니다.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const exportedAt = new Date().toISOString();
    link.href = url;
    link.download = "memos-selected.md";
    link.click();
    window.URL.revokeObjectURL(url);
    setItems((current) =>
      current.map((memo) =>
        selectedIds.includes(memo.id) ? { ...memo, exportedAt } : memo
      )
    );
    setSelectedIds([]);
    setExporting(false);
  }

  if (items.length === 0) {
    return <div className="empty">저장된 메모가 없습니다.</div>;
  }

  return (
    <div className="grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EXPORT</p>
            <h2>선택한 메모 내보내기</h2>
          </div>
          <span className="pill">{selectedCount}개 선택</span>
        </div>
        <div className="actions">
          <button className="button-ghost" onClick={selectAll} type="button">
            전체 선택
          </button>
          <button className="button-ghost" onClick={clearSelection} type="button">
            선택 해제
          </button>
          <button
            className="button"
            disabled={exporting || selectedCount === 0}
            onClick={exportSelected}
            type="button"
          >
            <Download size={17} />
            {exporting ? "Export 중" : "Markdown 다운로드"}
          </button>
        </div>
        {error ? <div className="status-box error">{error}</div> : null}
      </section>

      {items.map((memo) => (
        <section className="panel form-grid" key={memo.id}>
          <div className="selectable-heading">
            <label className="select-check">
              <input
                checked={selectedIds.includes(memo.id)}
                onChange={() => toggleMemo(memo.id)}
                type="checkbox"
              />
              <span>Export 선택</span>
            </label>
            <div>
              <p className="eyebrow">MEMO</p>
              <h2>{memo.title || "메모"}</h2>
            </div>
          </div>
          <div>
            <div className="pill-row">
              <span className="pill">
                {new Date(memo.createdAt).toLocaleString("ko-KR")}
              </span>
              {memo.exportedAt ? (
                <span className="pill success-pill">
                  이미 export됨 {new Date(memo.exportedAt).toLocaleDateString("ko-KR")}
                </span>
              ) : null}
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
