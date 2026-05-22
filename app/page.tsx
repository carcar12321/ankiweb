import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileUp,
  Shuffle
} from "lucide-react";
import Link from "next/link";

import { TodayReviewCard } from "@/components/today-review-card";
import { prisma } from "@/lib/prisma";
import {
  getWeakPartRecommendations,
  summarizeReviewLoad
} from "@/lib/study-insights";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const [
    setCount,
    questionCount,
    attemptCount,
    wrongCount,
    recentSets,
    allSets,
    reviewCandidates,
    recentAttempts,
    recentReviewLogs
  ] = await Promise.all([
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
    prisma.questionSet.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true }
    }),
    prisma.question.findMany({
      select: {
        studyState: {
          select: { dueAt: true }
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
    }),
    prisma.studyReviewLog.findMany({
      orderBy: { reviewedAt: "desc" },
      take: 100,
      include: {
        question: {
          select: { category: true }
        }
      }
    })
  ]);
  const reviewLoad = summarizeReviewLoad(
    reviewCandidates.map((question) => ({
      dueAt: question.studyState?.dueAt ?? null,
      hasStudyState: Boolean(question.studyState)
    })),
    now
  );
  const weakParts = getWeakPartRecommendations(
    recentReviewLogs.map((log) => ({
      category: log.question.category,
      rating: log.rating
    }))
  );
  const todayStartCount =
    reviewLoad.dueCount > 0 ? reviewLoad.dueCount : Math.min(20, reviewLoad.newCount);

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">STUDY DASHBOARD</p>
          <h1>오늘 공부할 문제를 고르세요.</h1>
          <p className="muted">
            복습 예정 문제를 먼저 처리하고, 부족한 부분은 랜덤학습으로 채웁니다.
          </p>
        </div>
        <div className="actions">
          <Link className="button-ghost" href="/random-study">
            <Shuffle size={17} />
            랜덤학습
          </Link>
          <Link className="button" href="/upload">
            <FileUp size={17} />
            문제 업로드
          </Link>
        </div>
      </section>

      <section className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="metric">
          <div className="metric-label">
            <ClipboardList size={17} /> 문제집
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

      <section className="grid grid-2" style={{ marginBottom: 18 }}>
        <TodayReviewCard
          dueCount={reviewLoad.dueCount}
          newCount={reviewLoad.newCount}
          overdueCount={reviewLoad.overdueCount}
          setIds={allSets.map((set) => set.id)}
          startCount={todayStartCount}
        />

        <section className="panel">
          <p className="eyebrow">RECOMMENDED PARTS</p>
          <h2>오늘 추천 part</h2>
          {weakParts.length === 0 ? (
            <div className="empty">아직 추천할 취약 part가 없습니다.</div>
          ) : (
            <div className="set-list">
              {weakParts.map((part) => (
                <div className="study-row" key={part.part}>
                  <div>
                    <h3>{part.part}</h3>
                    <div className="pill-row">
                      <span className="pill">
                        어려움 {Math.round(part.weakRate * 100)}%
                      </span>
                      <span className="pill">Again {part.again}</span>
                      <span className="pill">Hard {part.hard}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="grid grid-2">
        <div className="panel">
          <h2>최근 문제집</h2>
          {recentSets.length === 0 ? (
            <div className="empty">아직 문제집이 없습니다.</div>
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
            <div className="empty">아직 풀이 기록이 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>문제집</th>
                    <th>결과</th>
                    <th>문제</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td data-label="문제집">{attempt.set.title}</td>
                      <td
                        className={attempt.isCorrect ? "success-text" : "danger-text"}
                        data-label="결과"
                      >
                        {attempt.isCorrect ? "정답" : "오답"}
                      </td>
                      <td data-label="문제">{attempt.question.prompt}</td>
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
