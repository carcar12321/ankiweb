CREATE TYPE "AiConversationScope" AS ENUM ('GENERAL', 'TUTOR', 'WEAKNESS', 'SESSION_REPORT', 'QUESTION_GENERATION');

CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

ALTER TABLE "StudySessionItem"
ADD COLUMN "choiceOrder" TEXT NOT NULL DEFAULT 'ABCD';

ALTER TABLE "GeneratedQuestionDraft"
DROP CONSTRAINT IF EXISTS "GeneratedQuestionDraft_sourceQuestionId_fkey";

ALTER TABLE "GeneratedQuestionDraft"
ALTER COLUMN "sourceQuestionId" DROP NOT NULL;

ALTER TABLE "GeneratedQuestionDraft"
ADD CONSTRAINT "GeneratedQuestionDraft_sourceQuestionId_fkey"
FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AiSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "model" TEXT NOT NULL DEFAULT 'gpt-5.4-mini',
  "reasoningEffort" TEXT NOT NULL DEFAULT 'medium',
  "tone" TEXT NOT NULL DEFAULT '차분하고 쉬운 한국어 학습 코치',
  "customInstructions" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiConversation" (
  "id" TEXT NOT NULL,
  "scope" "AiConversationScope" NOT NULL DEFAULT 'GENERAL',
  "title" TEXT NOT NULL,
  "model" TEXT,
  "sourceSessionId" TEXT,
  "sourceQuestionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyMemo" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "sourceText" TEXT,
  "sourceUrl" TEXT,
  "sourceSessionId" TEXT,
  "sourceQuestionId" TEXT,
  "sourceConversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyMemo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiSessionReport" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "conversationId" TEXT,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT,
  "prompt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiSessionReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiConversation_scope_updatedAt_idx" ON "AiConversation"("scope", "updatedAt");
CREATE INDEX "AiConversation_sourceSessionId_idx" ON "AiConversation"("sourceSessionId");
CREATE INDEX "AiConversation_sourceQuestionId_idx" ON "AiConversation"("sourceQuestionId");
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE INDEX "StudyMemo_createdAt_idx" ON "StudyMemo"("createdAt");
CREATE INDEX "StudyMemo_sourceSessionId_idx" ON "StudyMemo"("sourceSessionId");
CREATE INDEX "StudyMemo_sourceQuestionId_idx" ON "StudyMemo"("sourceQuestionId");
CREATE INDEX "StudyMemo_sourceConversationId_idx" ON "StudyMemo"("sourceConversationId");
CREATE INDEX "AiSessionReport_sessionId_createdAt_idx" ON "AiSessionReport"("sessionId", "createdAt");
CREATE INDEX "AiSessionReport_conversationId_idx" ON "AiSessionReport"("conversationId");

ALTER TABLE "AiConversation"
ADD CONSTRAINT "AiConversation_sourceSessionId_fkey"
FOREIGN KEY ("sourceSessionId") REFERENCES "StudySession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiConversation"
ADD CONSTRAINT "AiConversation_sourceQuestionId_fkey"
FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiMessage"
ADD CONSTRAINT "AiMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyMemo"
ADD CONSTRAINT "StudyMemo_sourceSessionId_fkey"
FOREIGN KEY ("sourceSessionId") REFERENCES "StudySession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudyMemo"
ADD CONSTRAINT "StudyMemo_sourceQuestionId_fkey"
FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudyMemo"
ADD CONSTRAINT "StudyMemo_sourceConversationId_fkey"
FOREIGN KEY ("sourceConversationId") REFERENCES "AiConversation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiSessionReport"
ADD CONSTRAINT "AiSessionReport_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiSessionReport"
ADD CONSTRAINT "AiSessionReport_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
