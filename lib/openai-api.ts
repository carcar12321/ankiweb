import { defaultAiModel, type AiReasoningEffort } from "@/lib/ai-models";

type ResponseTextFormat = {
  description?: string;
  name: string;
  schema: Record<string, unknown>;
  strict: boolean;
  type: "json_schema";
};

type OpenAiResponse = {
  error?: { message?: string };
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
};

export class AiAuthError extends Error {}
export class AiRequestError extends Error {}

const openAiUrl = "https://api.openai.com/v1/responses";

function extractOutputText(response: OpenAiResponse) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text))
      .join("\n")
      .trim() ?? ""
  );
}

export async function validateOpenAiApiKey(apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  return response.ok;
}

export async function createAiText(input: {
  apiKey: string;
  instructions: string;
  model?: string;
  prompt: string;
  reasoningEffort?: AiReasoningEffort | string;
  textFormat?: ResponseTextFormat;
}) {
  const response = await fetch(openAiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: input.prompt,
      instructions: input.instructions,
      model: input.model ?? process.env.OPENAI_MODEL ?? defaultAiModel,
      reasoning: input.reasoningEffort
        ? { effort: input.reasoningEffort }
        : undefined,
      text: input.textFormat ? { format: input.textFormat } : undefined
    })
  });

  if (response.status === 401) {
    throw new AiAuthError("AI API 키를 다시 입력해주세요.");
  }

  const body = (await response.json().catch(() => null)) as OpenAiResponse | null;

  if (!response.ok || !body) {
    throw new AiRequestError("AI 응답을 가져오지 못했습니다.");
  }

  if (body.error) {
    throw new AiRequestError(body.error.message ?? "AI 응답을 가져오지 못했습니다.");
  }

  const text = extractOutputText(body);
  if (!text) {
    throw new AiRequestError("AI가 빈 응답을 반환했습니다.");
  }

  return text;
}

export async function createAiJson<T>(input: {
  apiKey: string;
  instructions: string;
  model?: string;
  prompt: string;
  reasoningEffort?: AiReasoningEffort | string;
  textFormat: ResponseTextFormat;
}) {
  const text = await createAiText(input);
  return JSON.parse(text) as T;
}
