"use client";

import { Download, Eye, Loader2, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ManagedSet = {
  attemptCount: number;
  createdAt: string;
  description?: string | null;
  id: string;
  questionCount: number;
  title: string;
};

export function FileManagerTable({ sets }: { sets: ManagedSet[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteSet(set: ManagedSet) {
    const confirmed = window.confirm(
      `"${set.title}" 문제집을 완전 삭제할까요?\n관련 문제, 풀이 기록, 복습 상태도 함께 삭제됩니다.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(set.id);
    setError(null);

    const response = await fetch(`/api/sets/${set.id}`, {
      method: "DELETE"
    });
    const body = (await response.json().catch(() => null)) as
      | { ok: true }
      | { ok: false; message?: string }
      | null;

    setDeletingId(null);

    if (!response.ok || !body || !body.ok) {
      const message = body && !body.ok ? body.message : undefined;
      setError(message ?? "문제집을 삭제하지 못했습니다.");
      return;
    }

    router.refresh();
  }

  if (sets.length === 0) {
    return <div className="empty">아직 업로드한 문제집이 없습니다.</div>;
  }

  return (
    <section className="panel form-grid">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">FILE MANAGER</p>
          <h2>업로드한 문제집</h2>
        </div>
        <span className="pill">{sets.length}개</span>
      </div>

      {error ? <div className="status-box error">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>문제집</th>
              <th>문제</th>
              <th>풀이</th>
              <th>업로드</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => {
              const deleting = deletingId === set.id;

              return (
                <tr key={set.id}>
                  <td data-label="문제집">
                    <strong>{set.title}</strong>
                    {set.description ? (
                      <p className="muted" style={{ marginBottom: 0, marginTop: 6 }}>
                        {set.description}
                      </p>
                    ) : null}
                  </td>
                  <td data-label="문제">{set.questionCount}문제</td>
                  <td data-label="풀이">{set.attemptCount}회</td>
                  <td data-label="업로드">
                    {new Date(set.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td data-label="작업">
                    <div className="actions">
                      <Link className="button-ghost" href={`/sets/${set.id}`}>
                        <Eye size={17} />
                        보기
                      </Link>
                      <Link className="button-ghost" href={`/study/${set.id}`}>
                        <Play size={17} />
                        학습
                      </Link>
                      <a className="button-ghost" href={`/api/sets/${set.id}/download`}>
                        <Download size={17} />
                        CSV
                      </a>
                      <button
                        className="button-ghost danger-action"
                        disabled={deleting}
                        onClick={() => deleteSet(set)}
                        type="button"
                      >
                        {deleting ? <Loader2 size={17} /> : <Trash2 size={17} />}
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
