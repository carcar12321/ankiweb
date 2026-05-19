"use client";

import { Download, FileUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type UploadResult =
  | {
      ok: true;
      setId: string;
      title: string;
      count: number;
    }
  | {
      ok: false;
      errors: Array<{ row: number; message: string }>;
    };

export function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as UploadResult;

    setPending(false);
    setResult(body);

    if (body.ok) {
      formRef.current?.reset();
    }
  }

  return (
    <div className="grid grid-2">
      <form className="form-panel" onSubmit={submit} ref={formRef}>
        <div className="form-grid">
          <div>
            <p className="eyebrow">CSV IMPORT</p>
            <h2>문제 세트 업로드</h2>
            <p className="muted">
              Excel에서 CSV로 저장한 4지선다 문제를 한 번에 올립니다.
            </p>
          </div>
          <label className="field">
            <span>세트 이름</span>
            <input
              className="input"
              name="title"
              placeholder="예: 네트워크 면접 1회차"
              type="text"
            />
          </label>
          <label className="field">
            <span>설명</span>
            <textarea
              className="textarea"
              name="description"
              placeholder="선택 입력"
            />
          </label>
          <label className="field">
            <span>CSV 파일</span>
            <input
              accept=".csv,text/csv"
              className="file-input"
              name="file"
              required
              type="file"
            />
          </label>
          <div className="actions">
            <button className="button" disabled={pending} type="submit">
              {pending ? <Loader2 size={17} /> : <FileUp size={17} />}
              {pending ? "업로드 중" : "업로드"}
            </button>
            <a className="button-ghost" href="/api/template">
              <Download size={17} />
              CSV 양식 다운로드
            </a>
          </div>
        </div>
      </form>

      <section className="panel">
        <h2>업로드 결과</h2>
        {!result ? (
          <div className="empty">CSV를 올리면 검증 결과가 여기에 표시됩니다.</div>
        ) : result.ok ? (
          <div className="status-box success">
            <strong>{result.title}</strong> 세트에 {result.count}문제를
            추가했습니다.
            <div style={{ marginTop: 12 }}>
              <Link className="button" href={`/study/${result.setId}`}>
                바로 풀기
              </Link>
            </div>
          </div>
        ) : (
          <div className="status-box error">
            <strong>CSV를 다시 확인해주세요.</strong>
            <ul>
              {result.errors.map((error) => (
                <li key={`${error.row}-${error.message}`}>
                  {error.row}행: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
