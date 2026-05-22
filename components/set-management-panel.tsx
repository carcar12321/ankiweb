"use client";

import { Download, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SetManagementPanelProps = {
  description?: string | null;
  exportFileName?: string | null;
  setId: string;
  title: string;
};

export function SetManagementPanel({
  description,
  exportFileName,
  setId,
  title
}: SetManagementPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    description: description ?? "",
    exportFileName: exportFileName ?? "",
    title
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/sets/${setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const body = (await response.json().catch(() => null)) as
      | {
          ok: true;
          set: {
            description?: string | null;
            exportFileName?: string | null;
            title: string;
          };
        }
      | { ok: false; message?: string }
      | null;

    setPending(false);

    if (!response.ok || !body || !body.ok) {
      const errorMessage = body && !body.ok ? body.message : undefined;
      setError(errorMessage ?? "문제집 정보를 저장하지 못했습니다.");
      return;
    }

    setForm({
      description: body.set.description ?? "",
      exportFileName: body.set.exportFileName ?? "",
      title: body.set.title
    });
    setMessage("문제집 정보를 저장했습니다.");
    router.refresh();
  }

  return (
    <section className="panel form-grid">
      <div>
        <p className="eyebrow">FILE MANAGEMENT</p>
        <h2>문제집 파일 관리</h2>
        <p className="muted">
          DB에 저장된 현재 문제 기준으로 CSV를 내려받고, 문제집명과 다운로드
          파일명을 수정합니다.
        </p>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <div className="grid grid-2">
          <label className="field">
            <span>문제집명</span>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.currentTarget.value
                }))
              }
              value={form.title}
            />
          </label>
          <label className="field">
            <span>다운로드 파일명</span>
            <input
              className="input"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  exportFileName: event.currentTarget.value
                }))
              }
              placeholder="예: network-part1.csv"
              value={form.exportFileName}
            />
          </label>
        </div>
        <label className="field">
          <span>설명</span>
          <textarea
            className="textarea"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.currentTarget.value
              }))
            }
            value={form.description}
          />
        </label>
        {message ? <div className="status-box success">{message}</div> : null}
        {error ? <div className="status-box error">{error}</div> : null}
        <div className="actions">
          <button className="button" disabled={pending} type="submit">
            <Save size={17} />
            {pending ? "저장 중" : "저장"}
          </button>
          <a className="button-ghost" href={`/api/sets/${setId}/download`}>
            <Download size={17} />
            CSV 다운로드
          </a>
        </div>
      </form>
    </section>
  );
}
