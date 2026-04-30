import crypto from "crypto";
import env from "../config/env.js";
import {
  countMonthlyUsageByContext,
  countMonthlyUsageByStyle,
  countMonthlyUsageByToken,
  createAuthTokenRecord,
  findActiveTokenWithUser,
  registerUsageEvent,
  revokeToken,
  touchToken
} from "../repos/token-repo.js";
import { hashAuthToken } from "../utils/hash.js";

function createOpaqueToken() {
  const random = crypto.randomBytes(24).toString("base64url");
  return `waat_${random}`;
}

export async function issueAuthToken({ userId, sourceExtensionId }) {
  const token = createOpaqueToken();
  const tokenHash = hashAuthToken(token);
  const now = Date.now();
  const expiresAt = new Date(now + env.TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const tokenPreview = `${token.slice(0, 10)}...`;

  await createAuthTokenRecord({
    userId,
    tokenHash,
    tokenPreview,
    sourceExtensionId,
    expiresAt
  });

  return {
    token,
    expiresAt
  };
}

export async function authenticateAuthToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) return null;

  const tokenHash = hashAuthToken(token);
  const row = await findActiveTokenWithUser(tokenHash);
  if (!row) return null;

  await touchToken(row.token_id);
  return {
    user: {
      id: row.user_id_ref,
      email: row.email,
      name: row.name,
      plan: row.plan,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionStatus: row.subscription_status,
      subscriptionCurrentPeriodEnd: row.subscription_current_period_end
    },
    token: {
      id: row.token_id,
      sourceExtensionId: row.source_extension_id,
      expiresAt: row.expires_at
    }
  };
}

export async function invalidateAuthToken(tokenId) {
  await revokeToken(tokenId);
}

export async function getCurrentTokenUsage(tokenId) {
  return countMonthlyUsageByToken(tokenId);
}

export async function trackTokenUsage({
  userId,
  authTokenId,
  requestTextLength,
  stylesCount,
  styles,
  context,
  objective,
  promptVariant,
  latencyMs
}) {
  await registerUsageEvent({
    userId,
    authTokenId,
    requestTextLength,
    stylesCount,
    styles,
    context,
    objective,
    promptVariant,
    latencyMs
  });
}

export async function getCurrentTokenUsageByStyle(tokenId, style) {
  return countMonthlyUsageByStyle(tokenId, style);
}

export async function getCurrentTokenUsageByContext(tokenId, context) {
  return countMonthlyUsageByContext(tokenId, context);
}
