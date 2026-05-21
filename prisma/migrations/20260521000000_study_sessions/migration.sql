CREATE TYPE "StudySessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

ALTER TABLE "Attempt" ADD COLUMN "sessionId" TEXT;

CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "status" "StudySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudySessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "selected" "Choice",
    "isCorrect" BOOLEAN,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudySessionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attempt_sessionId_idx" ON "Attempt"("sessionId");

CREATE INDEX "StudySession_setId_status_updatedAt_idx" ON "StudySession"("setId", "status", "updatedAt");

CREATE UNIQUE INDEX "StudySessionItem_sessionId_position_key" ON "StudySessionItem"("sessionId", "position");

CREATE UNIQUE INDEX "StudySessionItem_sessionId_questionId_key" ON "StudySessionItem"("sessionId", "questionId");

CREATE INDEX "StudySessionItem_questionId_idx" ON "StudySessionItem"("questionId");

ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudySessionItem" ADD CONSTRAINT "StudySessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudySessionItem" ADD CONSTRAINT "StudySessionItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
