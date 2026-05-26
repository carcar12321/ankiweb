import { NextResponse } from "next/server";

import {
  buildSessionReportMarkdown,
  makeMarkdownFileName,
  markdownDownloadHeaders
} from "@/lib/markdown-export";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = await prisma.aiSessionReport.findUnique({
    where: { id },
    select: {
      content: true,
      createdAt: true,
      model: true,
      prompt: true,
      title: true
    }
  });

  if (!report) {
    return NextResponse.json(
      { ok: false, message: "세션 보고서를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const date = report.createdAt.toISOString().slice(0, 10);
  const fileName = makeMarkdownFileName(`session-report-${date}`);

  return new NextResponse(buildSessionReportMarkdown(report), {
    headers: markdownDownloadHeaders(fileName)
  });
}
