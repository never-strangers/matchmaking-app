import crypto from "crypto";

export type SessionRole = "user" | "admin";

export type SessionPayload = {
  profile_id: string;
  invited_user_id: string;
  role: SessionRole;
  phone_e164: string;
  display_name: string;
  exp: number;
};

const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSessionSecret(): Buffer {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error("APP_SESSION_SECRET is not set");
  }
  return Buffer.from(secret, "utf8");
}

function base64urlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

export function signSessionToken(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds: number = DEFAULT_SESSION_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const withExp: SessionPayload = { ...payload, exp };
  const json = JSON.stringify(withExp);
  const payloadB64 = base64urlEncode(Buffer.from(json, "utf8"));

  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payloadB64);
  const signature = base64urlEncode(hmac.digest());

  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payloadB64);
  const expectedSig = base64urlEncode(hmac.digest());

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payloadJson = base64urlDecode(payloadB64).toString("utf8");
    const decoded = JSON.parse(payloadJson) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

