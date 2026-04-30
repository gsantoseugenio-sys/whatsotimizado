import env from "../config/env.js";
import { createSignedState, parseSignedState } from "../utils/hash.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function buildGoogleAuthUrl({ extensionId }) {
  const state = createSignedState({
    extensionId: extensionId || "",
    iat: Date.now()
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function validateGoogleState(rawState) {
  const payload = parseSignedState(rawState);
  if (!payload) return null;
  const ageMs = Date.now() - Number(payload.iat || 0);
  if (ageMs < 0 || ageMs > 10 * 60 * 1000) return null;
  return {
    extensionId: typeof payload.extensionId === "string" ? payload.extensionId : ""
  };
}

export async function exchangeCodeForGoogleUser(code) {
  const tokenParams = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
    code
  });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenParams.toString()
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error("Falha ao autenticar com Google.");
  }

  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const user = await userResponse.json();
  if (!userResponse.ok || !user.sub || !user.email) {
    throw new Error("Nao foi possivel carregar dados do usuario Google.");
  }

  return {
    googleId: user.sub,
    email: user.email,
    name: user.name || user.given_name || ""
  };
}
