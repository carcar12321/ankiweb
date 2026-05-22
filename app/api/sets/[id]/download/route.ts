import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildQuestionSetCsv,
  makeQuestionSetCsvFileName,
  sanitizeDownloadFileName
} from "@/lib/set-export";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const set = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } }
    }
  });

  if (!set) {
    return NextResponse.json(
      { ok: false, message: "문제집을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const fileName = makeQuestionSetCsvFileName(set.exportFileName, set.title);
  const fallbackName = sanitizeDownloadFileName(fileName, "questions.csv").replace(
    /[^\x20-\x7E]/g,
    "_"
  );

  return new NextResponse(buildQuestionSetCsv(set), {
    headers: {
      "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
