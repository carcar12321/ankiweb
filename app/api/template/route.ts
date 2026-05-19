import { NextRequest, NextResponse } from "next/server";

import { makeTemplateCsv } from "@/lib/csv";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return new NextResponse(makeTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ooo-interview-template.csv"'
    }
  });
}
