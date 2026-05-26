import { FileUp } from "lucide-react";
import Link from "next/link";

import { FileManagerTable } from "@/components/file-manager-table";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const sets = await prisma.questionSet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { attempts: true, questions: true }
      }
    }
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">FILES</p>
          <h1>파일관리자</h1>
          <p className="muted">
            업로드한 CSV 문제집을 확인하고, 학습하거나 다운로드하고, 필요 없는
            문제집은 완전 삭제합니다.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/upload">
            <FileUp size={17} />
            문제 업로드
          </Link>
        </div>
      </section>

      <FileManagerTable
        sets={sets.map((set) => ({
          attemptCount: set._count.attempts,
          createdAt: set.createdAt.toISOString(),
          description: set.description,
          id: set.id,
          questionCount: set._count.questions,
          title: set.title
        }))}
      />
    </main>
  );
}
