import { afterEach, describe, expect, it, vi } from "vitest";

const deleteQuestionSetMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    questionSet: {
      delete: deleteQuestionSetMock
    }
  }
}));

import { DELETE } from "@/app/api/sets/[id]/route";

describe("question set route", () => {
  afterEach(() => {
    deleteQuestionSetMock.mockReset();
  });

  it("deletes a question set", async () => {
    deleteQuestionSetMock.mockResolvedValue({ id: "set_1" });

    const response = await DELETE(new Request("http://test.local"), {
      params: { id: "set_1" }
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(deleteQuestionSetMock).toHaveBeenCalledWith({
      select: { id: true },
      where: { id: "set_1" }
    });
  });

  it("returns 404 when the question set cannot be deleted", async () => {
    deleteQuestionSetMock.mockRejectedValue(new Error("not found"));

    const response = await DELETE(new Request("http://test.local"), {
      params: { id: "missing" }
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      message: "문제집을 찾을 수 없습니다."
    });
  });
});
