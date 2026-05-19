import { WrongNotesPanel } from "@/components/wrong-notes-panel";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WrongNotesPage() {
  await requireAuth();

  const notes = await prisma.wrongNote.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ wrongCount: "desc" }, { lastWrongAt: "desc" }],
    include: {
      question: {
        include: {
          set: true
        }
      }
    }
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">WRONG NOTES</p>
          <h1>틀린 문제만 다시 봅니다.</h1>
          <p className="muted">
            오답 재풀이에서 맞히면 해결 처리되고 목록에서 빠집니다.
          </p>
        </div>
      </section>
      <WrongNotesPanel
        notes={notes.map((note) => ({
          id: note.id,
          wrongCount: note.wrongCount,
          lastWrongAt: note.lastWrongAt.toISOString(),
          question: {
            id: note.question.id,
            prompt: note.question.prompt,
            choices: {
              A: note.question.choiceA,
              B: note.question.choiceB,
              C: note.question.choiceC,
              D: note.question.choiceD
            },
            setTitle: note.question.set.title,
            tag: note.question.tag,
            category: note.question.category
          }
        }))}
      />
    </main>
  );
}
