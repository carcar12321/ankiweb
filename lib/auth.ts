import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ooo_interview_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
  iat: number;
  exp: number;
};

function authSecret() {
  return process.env.AUTH_SECRET || "development-secret-change-me";
}

export function appPassword() {
  return process.env.APP_PASSWORD || "study1234";
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function createSessionToken(now = Date.now()) {
  const payload: SessionPayload = {
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token?: string | null, now = Date.now()) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as SessionPayload;

    return Number.isFinite(payload.exp) && payload.exp > now;
  } catch {
    return false;
  }
}

export function isPasswordValid(password: string) {
  return password === appPassword();
}
