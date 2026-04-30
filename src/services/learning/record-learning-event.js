import { query } from "../../db/pool.js";
import { calculatePromptPerformance } from "./calculate-prompt-performance.js";
import { updateUserPreferences } from "./update-user-preferences.js";

const ACCEPTED_EVENTS = new Set(["suggestion_accepted", "variation_selected", "text_inserted", "feedback_positive"]);
const REJECTED_EVENTS = new Set(["suggestion_rejected", "feedback_negative"]);

function normalizeEventType(eventType) {
  return String(eventType || "").trim().toLowerCase();
}

function safeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const clone = { ...metadata };
  delete clone.originalText;
  delete clone.improvedText;
  delete clone.text;
  delete clone.prompt;
  return clone;
}

export async function recordLearningEvent({
  userId,
  anonymousId,
  requestId,
  eventType,
  metadata
}) {
  const normalizedEventType = normalizeEventType(eventType);
  const safe = safeMetadata(metadata);
  const accepted = ACCEPTED_EVENTS.has(normalizedEventType);
  const rejected = REJECTED_EVENTS.has(normalizedEventType);

  const result = await query(
    `
    INSERT INTO learning_events (
      user_id,
      anonymous_id,
      request_id,
      event_type,
      message_type,
      style_selected,
      variation_selected,
      domain,
      accepted,
      rejected,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    RETURNING *;
    `,
    [
      userId || null,
      userId ? null : anonymousId || null,
      requestId || null,
      normalizedEventType,
      safe.messageType || null,
      safe.styleSelected || null,
      Number.isInteger(safe.variationSelected) ? safe.variationSelected : null,
      safe.domain || null,
      accepted,
      rejected,
      JSON.stringify(safe)
    ]
  );

  await calculatePromptPerformance({
    eventType: normalizedEventType,
    messageType: safe.messageType,
    styleSelected: safe.styleSelected,
    variationStyle: safe.variationStyle,
    domain: safe.domain
  });

  if (accepted || rejected) {
    await updateUserPreferences({ userId, anonymousId }).catch(() => null);
  }

  return result.rows[0] || null;
}

export default recordLearningEvent;
