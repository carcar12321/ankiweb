import { NextResponse } from "next/server";

import { makeTemplateCsv } from "@/lib/csv";

export async function GET() {
  return new NextResponse(makeTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ooo-interview-template.csv"'
    }
  });
}
