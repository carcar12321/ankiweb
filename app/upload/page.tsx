import { UploadForm } from "@/components/upload-form";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">UPLOAD</p>
          <h1>CSV로 문제를 올립니다.</h1>
          <p className="muted">
            양식을 내려받아 Excel에서 작성한 뒤 CSV로 저장해 업로드하세요.
          </p>
        </div>
      </section>
      <UploadForm />
    </main>
  );
}
