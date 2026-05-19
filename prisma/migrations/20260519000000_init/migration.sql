CREATE TYPE "Choice" AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE "WrongNoteStatus" AS ENUM ('ACTIVE', 'RESOLVED');

CREATE TABLE "QuestionSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "choiceA" TEXT NOT NULL,
    "choiceB" TEXT NOT NULL,
    "choiceC" TEXT NOT NULL,
    "choiceD" TEXT NOT NULL,
    "correct" "Choice" NOT NULL,
    "explanation" TEXT NOT NULL,
    "tag" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "selected" "Choice" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WrongNote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "wrongCount" INTEGER NOT NULL DEFAULT 1,
    "lastWrongAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "status" "WrongNoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "dueAt" TIMESTAMP(3),
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrongNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Question_setId_order_idx" ON "Question"("setId", "order");

CREATE INDEX "Attempt_questionId_idx" ON "Attempt"("questionId");

CREATE INDEX "Attempt_setId_answeredAt_idx" ON "Attempt"("setId", "answeredAt");

CREATE UNIQUE INDEX "WrongNote_questionId_key" ON "WrongNote"("questionId");

CREATE INDEX "WrongNote_status_lastWrongAt_idx" ON "WrongNote"("status", "lastWrongAt");

CREATE INDEX "WrongNote_dueAt_idx" ON "WrongNote"("dueAt");

ALTER TABLE "Question" ADD CONSTRAINT "Question_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WrongNote" ADD CONSTRAINT "WrongNote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
