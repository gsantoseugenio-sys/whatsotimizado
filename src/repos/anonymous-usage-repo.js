import { query } from "../db/pool.js";

export async function countMonthlyAnonymousUsage(anonymousId) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM anonymous_usage_events
    WHERE anonymous_id = $1
      AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW());
    `,
    [anonymousId]
  );
  return result.rows[0]?.total || 0;
}

export async function countMonthlyAnonymousUsageByStyle(anonymousId, style) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM anonymous_usage_events
    WHERE anonymous_id = $1
      AND styles @> $2::jsonb
      AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW());
    `,
    [anonymousId, JSON.stringify([style])]
  );
  return result.rows[0]?.total || 0;
}

export async function countMonthlyAnonymousUsageByContext(anonymousId, context) {
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM anonymous_usage_events
    WHERE anonymous_id = $1
      AND context = $2
      AND DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NOW());
    `,
    [anonymousId, context]
  );
  return result.rows[0]?.total || 0;
}

export async function registerAnonymousUsageEvent({
  anonymousId,
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
    INSERT INTO anonymous_usage_events (
      anonymous_id,
      request_text_length,
      styles_count,
      styles,
      context,
      objective,
      prompt_variant,
      latency_ms
    )
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8);
    `,
    [
      anonymousId,
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
