import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await prisma.aiSessionReport.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
