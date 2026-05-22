"use client";

import { NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";

type MenuState = {
  text: string;
  x: number;
  y: number;
};

export function SelectionMemoMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    function close() {
      setMenu(null);
      setStatus("idle");
    }

    function onContextMenu(event: MouseEvent) {
      const selection = window.getSelection()?.toString().trim();
      if (!selection || selection.length < 2) {
        close();
        return;
      }

      event.preventDefault();
      setMenu({
        text: selection.slice(0, 4000),
        x: Math.min(event.clientX, window.innerWidth - 180),
        y: Math.min(event.clientY, window.innerHeight - 70)
      });
      setStatus("idle");
    }

    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("click", close);

    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("click", close);
    };
  }, []);

  async function saveMemo() {
    if (!menu) {
      return;
    }

    setStatus("saving");
    const response = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: menu.text,
        sourceText: menu.text,
        sourceUrl: window.location.pathname
      })
    });

    setStatus(response.ok ? "saved" : "error");
    if (response.ok) {
      window.getSelection()?.removeAllRanges();
      window.setTimeout(() => setMenu(null), 700);
    }
  }

  if (!menu) {
    return null;
  }

  return (
    <div
      className="selection-memo-menu"
      onClick={(event) => event.stopPropagation()}
      style={{ left: menu.x, top: menu.y }}
    >
      <button className="button-ghost" onClick={saveMemo} type="button">
        <NotebookPen size={16} />
        {status === "saving"
          ? "저장 중"
          : status === "saved"
            ? "저장됨"
            : "메모에 추가"}
      </button>
      {status === "error" ? <small>저장하지 못했습니다.</small> : null}
    </div>
  );
}
