import { query } from "../../db/pool.js";

function normalizeMetric(value, fallback = "unknown") {
  return String(value || fallback).trim().toLowerCase() || fallback;
}

function getEventCounters(eventType) {
  const accepted = ["suggestion_accepted", "variation_selected", "text_inserted", "feedback_positive"].includes(
    eventType
  );
  const rejected = ["suggestion_rejected", "feedback_negative"].includes(eventType);
  const shown = eventType === "suggestion_shown";

  return {
    shown: shown ? 1 : 0,
    accepted: accepted ? 1 : 0,
    rejected: rejected ? 1 : 0
  };
}

export async function calculatePromptPerformance({
  eventType,
  messageType,
  styleSelected,
  variationStyle,
  domain
}) {
  const counters = getEventCounters(eventType);
  if (!counters.shown && !counters.accepted && !counters.rejected) return null;

  const normalizedMessageType = normalizeMetric(messageType, "generica");
  const normalizedStyle = normalizeMetric(styleSelected, "friendly");
  const normalizedDomain = normalizeMetric(domain, "unknown");
  const normalizedVariationStyle = variationStyle ? normalizeMetric(variationStyle) : "";

  const result = await query(
    `
    INSERT INTO prompt_performance (
      message_type,
      style,
      domain,
      variation_style,
      total_shown,
      total_accepted,
      total_rejected,
      acceptance_rate,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, NOW())
    ON CONFLICT (message_type, style, domain, variation_style)
    DO UPDATE SET
      total_shown = prompt_performance.total_shown + EXCLUDED.total_shown,
      total_accepted = prompt_performance.total_accepted + EXCLUDED.total_accepted,
      total_rejected = prompt_performance.total_rejected + EXCLUDED.total_rejected,
      acceptance_rate =
        CASE
          WHEN (prompt_performance.total_accepted + EXCLUDED.total_accepted + prompt_performance.total_rejected + EXCLUDED.total_rejected) = 0
          THEN 0
          ELSE ROUND(
            ((prompt_performance.total_accepted + EXCLUDED.total_accepted)::numeric /
              (prompt_performance.total_accepted + EXCLUDED.total_accepted + prompt_performance.total_rejected + EXCLUDED.total_rejected)::numeric),
            5
          )
        END,
      updated_at = NOW()
    RETURNING *;
    `,
    [
      normalizedMessageType,
      normalizedStyle,
      normalizedDomain,
      normalizedVariationStyle,
      counters.shown,
      counters.accepted,
      counters.rejected
    ]
  );

  return result.rows[0] || null;
}

export default calculatePromptPerformance;
