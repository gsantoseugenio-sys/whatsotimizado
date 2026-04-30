import { query } from "../db/pool.js";

export async function saveTelemetryEvent({
  userId,
  authTokenId,
  eventName,
  context,
  objective,
  style,
  promptVariant,
  latencyMs,
  metadata
}) {
  await query(
    `
    INSERT INTO telemetry_events (
      user_id,
      auth_token_id,
      event_name,
      context,
      objective,
      style,
      prompt_variant,
      latency_ms,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb);
    `,
    [
      userId || null,
      authTokenId || null,
      eventName,
      context || null,
      objective || null,
      style || null,
      promptVariant || null,
      Number.isFinite(latencyMs) ? latencyMs : null,
      JSON.stringify(metadata || {})
    ]
  );
}
