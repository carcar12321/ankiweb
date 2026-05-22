import { describe, expect, it } from "vitest";

import {
  decryptApiKey,
  encryptApiKey,
  looksLikeOpenAiApiKey
} from "@/lib/ai-session";

describe("AI key session helpers", () => {
  it("encrypts and decrypts an API key without returning the raw value", () => {
    const apiKey = "sk-proj-test_key_12345678901234567890";
    const encrypted = encryptApiKey(apiKey);

    expect(encrypted).not.toContain(apiKey);
    expect(decryptApiKey(encrypted)).toBe(apiKey);
  });

  it("rejects malformed encrypted payloads", () => {
    expect(decryptApiKey("not-a-cookie-payload")).toBeNull();
  });

  it("validates common OpenAI API key prefixes", () => {
    expect(looksLikeOpenAiApiKey("sk-proj-test_key_12345678901234567890")).toBe(
      true
    );
    expect(looksLikeOpenAiApiKey("not-a-key")).toBe(false);
  });
});
