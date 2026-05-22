import { NextRequest, NextResponse } from "next/server";

import { getAiApiKeyFromCookie } from "@/lib/ai-session";
import { buildSimilarQuestionPrompt } from "@/lib/ai-context";
import { AiAuthError, createAiJson } from "@/lib/openai-api";
import { prisma } from "@/lib/prisma";
import { isChoice, type Choice } from "@/lib/study-logic";

export const runtime = "nodejs";

type SimilarQuestionResponse = {
  questions: Array<{
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    correct: Choice;
    explanation: string;
    prompt: string;
    rationale: string;
  }>;
};

const similarQuestionSchema = {
  additionalProperties: false,
  properties: {
    questions: {
      items: {
        additionalProperties: false,
        properties: {
          choiceA: { type: "string" },
          choiceB: { type: "string" },
          choiceC: { type: "string" },
          choiceD: { type: "string" },
          correct: { enum: ["A", "B", "C", "D"], type: "string" },
          explanation: { type: "string" },
          prompt: { type: "string" },
          rationale: { type: "string" }
        },
        required: [
          "prompt",
          "choiceA",
          "choiceB",
          "choiceC",
          "choiceD",
          "correct",
          "explanation",
          "rationale"
        ],
        type: "object"
      },
      type: "array"
    }
  },
  required: ["questions"],
  type: "object"
};

export async function POST(request: NextRequest) {
  const apiKey = await getAiApiKeyFromCookie();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "AI 기능을 사용하려면 API 키를 입력해주세요." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    count?: number;
    questionId?: string;
  } | null;
  const requestedCount = Number(body?.count ?? 3);
  const count = Number.isFinite(requestedCount)
    ? Math.min(5, Math.max(1, Math.trunc(requestedCount)))
    : 3;

  if (!body?.questionId) {
    return NextResponse.json(
      { ok: false, message: "기준 문제가 필요합니다." },
      { status: 400 }
    );
  }

  const question = await prisma.question.findUnique({
    where: { id: body.questionId }
  });

  if (!question) {
    return NextResponse.json(
      { ok: false, message: "기준 문제를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const generated = await createAiJson<SimilarQuestionResponse>({
      apiKey,
      instructions:
        "당신은 고품질 객관식 문제를 만드는 한국어 출제자입니다. 반드시 JSON 스키마에 맞는 유사 문제만 생성하세요.",
      prompt: buildSimilarQuestionPrompt({
        count,
        question: {
          category: question.category,
          choices: {
            A: question.choiceA,
            B: question.choiceB,
            C: question.choiceC,
            D: question.choiceD
          },
          correct: question.correct,
          explanation: question.explanation,
          prompt: question.prompt,
          tag: question.tag
        }
      }),
      textFormat: {
        description: "Generated similar multiple-choice questions",
        name: "similar_questions",
        schema: similarQuestionSchema,
        strict: true,
        type: "json_schema"
      }
    });
    const validQuestions = generated.questions
      .filter((item) => isChoice(item.correct))
      .slice(0, count);

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { ok: false, message: "생성된 문제 형식이 올바르지 않습니다." },
        { status: 502 }
      );
    }

    const drafts = await prisma.$transaction(
      validQuestions.map((item) =>
        prisma.generatedQuestionDraft.create({
          data: {
            category: question.category,
            choiceA: item.choiceA,
            choiceB: item.choiceB,
            choiceC: item.choiceC,
            choiceD: item.choiceD,
            correct: item.correct,
            explanation: item.explanation,
            prompt: item.prompt,
            rationale: item.rationale,
            setId: question.setId,
            sourceQuestionId: question.id,
            tag: question.tag
          }
        })
      )
    );

    return NextResponse.json({
      ok: true,
      drafts: drafts.map((draft) => ({
        id: draft.id,
        prompt: draft.prompt,
        rationale: draft.rationale
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof AiAuthError
            ? "API 키를 다시 입력해주세요."
            : "유사 문제를 생성하지 못했습니다."
      },
      { status: error instanceof AiAuthError ? 401 : 502 }
    );
  }
}
