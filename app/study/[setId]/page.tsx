import { notFound } from "next/navigation";

import { StudySession } from "@/components/study-session";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ setId: string }> | { setId: string };
};

export default async function StudyPage({ params }: PageProps) {
  await requireAuth();
  const { setId } = await params;
  const set = await prisma.questionSet.findUnique({
    where: { id: setId },
    include: {
      questions: { orderBy: { order: "asc" } }
    }
  });

  if (!set) {
    notFound();
  }

  const questions = set.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    choices: {
      A: question.choiceA,
      B: question.choiceB,
      C: question.choiceC,
      D: question.choiceD
    },
    tag: question.tag,
    category: question.category
  }));

  return (
    <main className="page page-narrow">
      <StudySession questions={questions} setTitle={set.title} />
    </main>
  );
}
