import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const cookieName = "ooo_ai_key";
const algorithm = "aes-256-gcm";

type EncryptedPayload = {
  data: string;
  iv: string;
  tag: string;
};

declare global {
  var __oooAiSessionKey: Buffer | undefined;
}

function getSessionKey() {
  globalThis.__oooAiSessionKey ??= randomBytes(32);
  return globalThis.__oooAiSessionKey;
}

function encode(buffer: Buffer) {
  return buffer.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptApiKey(apiKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getSessionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final()
  ]);
  const payload: EncryptedPayload = {
    data: encode(encrypted),
    iv: encode(iv),
    tag: encode(cipher.getAuthTag())
  };

  return encode(Buffer.from(JSON.stringify(payload), "utf8"));
}

export function decryptApiKey(value: string) {
  try {
    const payload = JSON.parse(decode(value).toString("utf8")) as EncryptedPayload;
    const decipher = createDecipheriv(
      algorithm,
      getSessionKey(),
      decode(payload.iv)
    );
    decipher.setAuthTag(decode(payload.tag));
    return Buffer.concat([
      decipher.update(decode(payload.data)),
      decipher.final()
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export async function getAiApiKeyFromCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;
  return value ? decryptApiKey(value) : null;
}

export async function setAiApiKeyCookie(apiKey: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, encryptApiKey(apiKey), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearAiApiKeyCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export function looksLikeOpenAiApiKey(value: string) {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(value.trim());
}
