CREATE TYPE "GeneratedQuestionDraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "QuestionSet" ADD COLUMN "exportFileName" TEXT;

CREATE TABLE "GeneratedQuestionDraft" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "sourceQuestionId" TEXT NOT NULL,
    "status" "GeneratedQuestionDraftStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT NOT NULL,
    "choiceA" TEXT NOT NULL,
    "choiceB" TEXT NOT NULL,
    "choiceC" TEXT NOT NULL,
    "choiceD" TEXT NOT NULL,
    "correct" "Choice" NOT NULL,
    "explanation" TEXT NOT NULL,
    "tag" TEXT,
    "category" TEXT,
    "rationale" TEXT,
    "approvedQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedQuestionDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeneratedQuestionDraft_setId_status_createdAt_idx" ON "GeneratedQuestionDraft"("setId", "status", "createdAt");

CREATE INDEX "GeneratedQuestionDraft_sourceQuestionId_idx" ON "GeneratedQuestionDraft"("sourceQuestionId");

ALTER TABLE "GeneratedQuestionDraft" ADD CONSTRAINT "GeneratedQuestionDraft_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GeneratedQuestionDraft" ADD CONSTRAINT "GeneratedQuestionDraft_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
