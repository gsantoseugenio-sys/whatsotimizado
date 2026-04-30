import crypto from "crypto";
import env from "../config/env.js";

export function hashPayload(payload) {
  const source = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHash("sha256").update(source).digest("hex");
}

export function hashAuthToken(token) {
  return crypto.createHmac("sha256", env.TOKEN_SIGNING_SECRET).update(token).digest("hex");
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function createSignedState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.TOKEN_SIGNING_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function parseSignedState(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const expected = crypto
    .createHmac("sha256", env.TOKEN_SIGNING_SECRET)
    .update(encoded)
    .digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}
