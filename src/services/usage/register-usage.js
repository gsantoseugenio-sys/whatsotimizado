import { query } from "../../db/pool.js";
import {
  checkUsageLimit,
  IMPROVE_TEXT_ACTION,
  resolveImprovePlanId
} from "./check-usage-limit.js";

function safeText(value, maxLength = 12000) {
  return String(value || "").slice(0, maxLength);
}

function safeJson(value) {
  if (!value || typeof value !== "object") return {};
  return value;
}

export async function registerUsage({
  userId,
  authTokenId,
  anonymousId,
  originalText,
  improvedText,
  classification,
  action = IMPROVE_TEXT_ACTION,
  origin = "chrome_extension",
  source,
  domain,
  userEmail,
  plan,
  status,
  validation,
  metadata,
  allowTextStorage = false
}) {
  const resolvedPlan = resolveImprovePlanId(plan);
  const detected = classification || {};

  const result = await query(
    `
    INSERT INTO ai_text_improvement_requests (
      user_id,
      auth_token_id,
      anonymous_id,
      original_text,
      improved_text,
      detected_type,
      detected_tone,
      formality_level,
      commercial_intent,
      text_size,
      action,
      origin,
      source,
      domain,
      user_email,
      plan,
      status,
      validation,
      metadata
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14, $15, $16,
      $17, $18::jsonb, $19::jsonb
    )
    RETURNING *;
    `,
    [
      userId || null,
      authTokenId || null,
      anonymousId || null,
      allowTextStorage ? safeText(originalText) : null,
      allowTextStorage && improvedText ? safeText(improvedText) : null,
      detected.messageType || "generica",
      detected.tone || "neutro",
      detected.formalityLevel || "medio",
      Boolean(detected.commercialIntent),
      detected.textSize || "curto",
      action,
      origin || "chrome_extension",
      source || null,
      domain || null,
      userEmail || null,
      resolvedPlan,
      status || "success",
      JSON.stringify(safeJson(validation)),
      JSON.stringify(safeJson(metadata))
    ]
  );

  const usage = await checkUsageLimit({
    userId,
    anonymousId,
    plan: resolvedPlan
  });

  return {
    event: result.rows[0] || null,
    usage
  };
}

export default registerUsage;
