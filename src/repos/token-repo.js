import { query } from "../db/pool.js";

export async function createAuthTokenRecord({
  userId,
  tokenHash,
  tokenPreview,
  sourceExtensionId,
  expiresAt
}) {
  const result = await query(
    `
    INSERT INTO auth_tokens (user_id, token_hash, token_preview, source_extension_id, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [userId, tokenHash, tokenPreview, sourceExtensionId || null, expiresAt]
  );
  return result.rows[0] || null;
}

export async function findActiveTokenWithUser(tokenHash) {
  const result = await query(
    `
    SELECT
      t.id AS token_id,
      t.user_id,
      t.token_preview,
      t.source_extension_id,
      t.expires_at,
      t.revoked_at,
      u.id AS user_id_ref,
      u.email,
      u.name,
      u.plan,
      u.stripe_customer_id,
      u.stripe_subscription_id,
      u.subscription_status,
      u.subscription_current_period_end
    FROM auth_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = $1
      AND t.revoked_at IS NULL
      AND t.expires_at > NOW()
    LIMIT 1;
    `,
    [tokenHash]
  );
  return result.rows[0] || null;
}

export async function touchToken(tokenId) {
  await query(`UPDATE auth_tokens SET last_used_at = NOW() WHERE id = $1;`, [tokenId]);
}

export async function revokeToken(tokenId) {
  await query(`UPDATE auth_tokens SET revoked_at = NOW() WHERE id = $1;`, [tokenId]);
}

export async function countMonthlyUsageByToken(tokenId) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM usage_events
    WHERE auth_token_id = $1
      AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW());
    `,
    [tokenId]
  );
  return result.rows[0]?.total || 0;
}

export async function countMonthlyUsageByStyle(tokenId, style) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM usage_events
    WHERE auth_token_id = $1
      AND styles @> $2::jsonb
      AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW());
    `,
    [tokenId, JSON.stringify([style])]
  );
  return result.rows[0]?.total || 0;
}

export async function countMonthlyUsageByContext(tokenId, context) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM usage_events
    WHERE auth_token_id = $1
      AND context = $2
      AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW());
    `,
    [tokenId, context]
  );
  return result.rows[0]?.total || 0;
}

export async function registerUsageEvent({
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
  await query(
    `
    INSERT INTO usage_events (
      user_id,
      auth_token_id,
      request_text_length,
      styles_count,
      styles,
      context,
      objective,
      prompt_variant,
      latency_ms
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9);
    `,
    [
      userId,
      authTokenId,
      requestTextLength,
      stylesCount,
      JSON.stringify(styles || []),
      context || "business",
      objective || "none",
      promptVariant || "A",
      Number.isFinite(latencyMs) ? latencyMs : null
    ]
  );
}
