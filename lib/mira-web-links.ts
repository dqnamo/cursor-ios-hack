import { createHmac, timingSafeEqual } from "node:crypto";

export type MiraWebLinkPayload = {
  telegramId: string;
  exp: number;
  iat: number;
};

const DEFAULT_TTL_DAYS = 30;
const MAX_TTL_DAYS = 365;

export function createMiraWebToken(
  telegramId: string,
  options: { expiresInDays?: number } = {},
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const ttlDays = Math.min(
    Math.max(options.expiresInDays ?? DEFAULT_TTL_DAYS, 1),
    MAX_TTL_DAYS,
  );
  const payload: MiraWebLinkPayload = {
    telegramId,
    iat: issuedAt,
    exp: issuedAt + ttlDays * 24 * 60 * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function createMiraWebUrl(
  telegramId: string,
  options: { expiresInDays?: number; baseUrl?: string } = {},
) {
  const url = new URL(options.baseUrl ?? getAppBaseUrl());
  url.searchParams.set(
    "token",
    createMiraWebToken(telegramId, {
      expiresInDays: options.expiresInDays,
    }),
  );

  return url.toString();
}

export function verifyMiraWebToken(token: string) {
  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  let payload: MiraWebLinkPayload;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (!isMiraWebLinkPayload(payload)) {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function getAppBaseUrl() {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getMiraWebLinkSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getMiraWebLinkSecret() {
  const secret = process.env.MIRA_WEB_LINK_SECRET;

  if (!secret) {
    throw new Error("MIRA_WEB_LINK_SECRET is not configured.");
  }

  return secret;
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function isMiraWebLinkPayload(value: unknown): value is MiraWebLinkPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "telegramId" in value &&
    typeof value.telegramId === "string" &&
    value.telegramId.length > 0 &&
    "exp" in value &&
    typeof value.exp === "number" &&
    "iat" in value &&
    typeof value.iat === "number"
  );
}
