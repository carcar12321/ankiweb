import { NextRequest, NextResponse } from "next/server";

import { getAiApiKeyFromCookie } from "@/lib/ai-session";
import { buildPromptQuestionGeneration } from "@/lib/ai-context";
import { persistAiExchange, makeConversationTitle } from "@/lib/ai-persistence";
import { composeInstructions, getAiSettings } from "@/lib/ai-settings";
import { AiAuthError, createAiJson } from "@/lib/openai-api";
import { prisma } from "@/lib/prisma";
import { isChoice, type Choice } from "@/lib/study-logic";

export const runtime = "nodejs";

type GeneratedQuestions = {
  questions: Array<{
    category?: string | null;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    correct: Choice;
    explanation: string;
    prompt: string;
    rationale: string;
    tag?: string | null;
  }>;
};

const generatedQuestionSchema = {
  additionalProperties: false,
  properties: {
    questions: {
      items: {
        additionalProperties: false,
        properties: {
          category: { type: ["string", "null"] },
          choiceA: { type: "string" },
          choiceB: { type: "string" },
          choiceC: { type: "string" },
          choiceD: { type: "string" },
          correct: { enum: ["A", "B", "C", "D"], type: "string" },
          explanation: { type: "string" },
          prompt: { type: "string" },
          rationale: { type: "string" },
          tag: { type: ["string", "null"] }
        },
        required: [
          "prompt",
          "choiceA",
          "choiceB",
          "choiceC",
          "choiceD",
          "correct",
          "explanation",
          "rationale",
          "category",
          "tag"
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
    prompt?: string;
    setId?: string;
  } | null;
  const promptText = body?.prompt?.trim();
  const setId = body?.setId?.trim();
  const requestedCount = Number(body?.count ?? 5);
  const count = Number.isFinite(requestedCount)
    ? Math.min(10, Math.max(1, Math.trunc(requestedCount)))
    : 5;

  if (!promptText || !setId) {
    return NextResponse.json(
      { ok: false, message: "저장할 문제집과 생성 요청을 입력해주세요." },
      { status: 400 }
    );
  }

  const set = await prisma.questionSet.findUnique({
    where: { id: setId },
    select: { id: true, title: true }
  });
  if (!set) {
    return NextResponse.json(
      { ok: false, message: "문제집을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const settings = await getAiSettings();
    const prompt = buildPromptQuestionGeneration({ count, prompt: promptText });
    const generated = await createAiJson<GeneratedQuestions>({
      apiKey,
      instructions: composeInstructions(
        "당신은 학습용 객관식 문제를 만드는 한국어 출제자입니다. 반드시 JSON 스키마에 맞는 문제만 생성하세요.",
        settings
      ),
      model: settings.model,
      prompt,
      reasoningEffort: settings.reasoningEffort,
      textFormat: {
        description: "Generated multiple-choice questions from a free-form prompt",
        name: "prompt_questions",
        schema: generatedQuestionSchema,
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
            category: item.category?.trim() || null,
            choiceA: item.choiceA,
            choiceB: item.choiceB,
            choiceC: item.choiceC,
            choiceD: item.choiceD,
            correct: item.correct,
            explanation: item.explanation,
            prompt: item.prompt,
            rationale: item.rationale,
            setId: set.id,
            sourceQuestionId: null,
            tag: item.tag?.trim() || null
          }
        })
      )
    );
    const conversation = await persistAiExchange({
      assistant: `${drafts.length}개의 문제 초안을 생성했습니다.`,
      model: settings.model,
      scope: "QUESTION_GENERATION",
      title: makeConversationTitle("프롬프트 문제 생성", promptText),
      user: promptText
    });

    return NextResponse.json({
      ok: true,
      conversationId: conversation.id,
      drafts: drafts.map((draft) => ({ id: draft.id, prompt: draft.prompt })),
      model: settings.model
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof AiAuthError
            ? "API 키를 다시 입력해주세요."
            : "문제를 생성하지 못했습니다."
      },
      { status: error instanceof AiAuthError ? 401 : 502 }
    );
  }
}
