CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

CREATE TYPE "SchedulerAlgorithm" AS ENUM ('SM2', 'FSRS');

CREATE TYPE "StudySessionMode" AS ENUM ('SET', 'RANDOM');

ALTER TABLE "StudySession" DROP CONSTRAINT "StudySession_setId_fkey";

ALTER TABLE "StudySession"
  ADD COLUMN "mode" "StudySessionMode" NOT NULL DEFAULT 'SET',
  ADD COLUMN "algorithm" "SchedulerAlgorithm" NOT NULL DEFAULT 'SM2',
  ALTER COLUMN "setId" DROP NOT NULL;

ALTER TABLE "StudySessionItem"
  ADD COLUMN "rating" "ReviewRating",
  ADD COLUMN "ratedAt" TIMESTAMP(3);

CREATE TABLE "StudySessionSourceSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySessionSourceSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionStudyState" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "algorithm" "SchedulerAlgorithm" NOT NULL DEFAULT 'SM2',
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "fsrsRetrievability" DOUBLE PRECISION,
    "fsrsStability" DOUBLE PRECISION,
    "fsrsDifficulty" DOUBLE PRECISION,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionStudyState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyReviewLog" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "algorithm" "SchedulerAlgorithm" NOT NULL DEFAULT 'SM2',
    "rating" "ReviewRating" NOT NULL,
    "quality" INTEGER NOT NULL,
    "selected" "Choice" NOT NULL,
    "wasCorrect" BOOLEAN NOT NULL,
    "previousDueAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "previousIntervalDays" INTEGER NOT NULL,
    "nextIntervalDays" INTEGER NOT NULL,
    "previousEaseFactor" DOUBLE PRECISION NOT NULL,
    "nextEaseFactor" DOUBLE PRECISION NOT NULL,
    "previousRepetitions" INTEGER NOT NULL,
    "nextRepetitions" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyReviewLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudySessionSourceSet_sessionId_setId_key" ON "StudySessionSourceSet"("sessionId", "setId");

CREATE INDEX "StudySessionSourceSet_setId_idx" ON "StudySessionSourceSet"("setId");

CREATE UNIQUE INDEX "QuestionStudyState_questionId_key" ON "QuestionStudyState"("questionId");

CREATE INDEX "QuestionStudyState_dueAt_idx" ON "QuestionStudyState"("dueAt");

CREATE INDEX "QuestionStudyState_algorithm_dueAt_idx" ON "QuestionStudyState"("algorithm", "dueAt");

CREATE INDEX "StudyReviewLog_questionId_reviewedAt_idx" ON "StudyReviewLog"("questionId", "reviewedAt");

CREATE INDEX "StudyReviewLog_sessionId_idx" ON "StudyReviewLog"("sessionId");

CREATE INDEX "StudyReviewLog_algorithm_reviewedAt_idx" ON "StudyReviewLog"("algorithm", "reviewedAt");

CREATE INDEX "StudySession_mode_status_updatedAt_idx" ON "StudySession"("mode", "status", "updatedAt");

ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudySessionSourceSet" ADD CONSTRAINT "StudySessionSourceSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudySessionSourceSet" ADD CONSTRAINT "StudySessionSourceSet_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionStudyState" ADD CONSTRAINT "QuestionStudyState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyReviewLog" ADD CONSTRAINT "StudyReviewLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyReviewLog" ADD CONSTRAINT "StudyReviewLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "QuestionStudyState" (
    "id",
    "questionId",
    "algorithm",
    "dueAt",
    "intervalDays",
    "easeFactor",
    "repetitions",
    "lastReviewedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'qss_' || "id",
    "questionId",
    'SM2',
    COALESCE("dueAt", "lastWrongAt", CURRENT_TIMESTAMP),
    "intervalDays",
    "easeFactor",
    CASE WHEN "intervalDays" > 0 THEN 1 ELSE 0 END,
    COALESCE("reviewedAt", "lastWrongAt"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WrongNote"
ON CONFLICT ("questionId") DO NOTHING;
