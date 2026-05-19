import { BarChart3, BookOpen, ClipboardList, FileUp } from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [setCount, questionCount, attemptCount, wrongCount, recentSets, recentAttempts] =
    await Promise.all([
      prisma.questionSet.count(),
      prisma.question.count(),
      prisma.attempt.count(),
      prisma.wrongNote.count({ where: { status: "ACTIVE" } }),
      prisma.questionSet.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          _count: {
            select: { questions: true, attempts: true }
          }
        }
      }),
      prisma.attempt.findMany({
        orderBy: { answeredAt: "desc" },
        take: 6,
        include: {
          question: true,
          set: true
        }
      })
    ]);

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">STUDY DASHBOARD</p>
          <h1>오늘 풀 문제를 고르세요.</h1>
          <p className="muted">
            CSV로 문제를 쌓고, 틀린 문제는 자동으로 오답노트에 보냅니다.
          </p>
        </div>
        <Link className="button" href="/upload">
          <FileUp size={17} />
          문제 업로드
        </Link>
      </section>

      <section className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="metric">
          <div className="metric-label">
            <ClipboardList size={17} /> 문제 세트
          </div>
          <div className="metric-value">{setCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">
            <BookOpen size={17} /> 전체 문제
          </div>
          <div className="metric-value">{questionCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">
            <BarChart3 size={17} /> 활성 오답
          </div>
          <div className="metric-value">{wrongCount}</div>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="panel">
          <h2>최근 문제 세트</h2>
          {recentSets.length === 0 ? (
            <div className="empty">아직 문제 세트가 없습니다.</div>
          ) : (
            <div className="set-list">
              {recentSets.map((set) => (
                <Link className="set-card" href={`/sets/${set.id}`} key={set.id}>
                  <div>
                    <h3>{set.title}</h3>
                    <div className="pill-row">
                      <span className="pill">{set._count.questions}문제</span>
                      <span className="pill">{set._count.attempts}회 풀이</span>
                    </div>
                  </div>
                  <span className="button-ghost">보기</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>최근 풀이</h2>
          {recentAttempts.length === 0 ? (
            <div className="empty">풀이 기록이 아직 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>세트</th>
                    <th>결과</th>
                    <th>문제</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{attempt.set.title}</td>
                      <td className={attempt.isCorrect ? "success-text" : "danger-text"}>
                        {attempt.isCorrect ? "정답" : "오답"}
                      </td>
                      <td>{attempt.question.prompt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ marginTop: 14 }}>
            누적 풀이 {attemptCount}회
          </p>
        </div>
      </section>
    </main>
  );
}
