import { query } from "../../db/pool.js";

function normalizeOwner({ userId, anonymousId }) {
  return {
    userId: userId || null,
    anonymousId: userId ? null : anonymousId || null
  };
}

function getOwnerWhere(owner) {
  if (owner.userId) {
    return {
      clause: "user_id = $1",
      params: [owner.userId]
    };
  }
  return {
    clause: "anonymous_id = $1 AND user_id IS NULL",
    params: [owner.anonymousId]
  };
}

function pickMostAcceptedStyle(rows) {
  const accepted = new Map();
  rows.forEach((row) => {
    if (!row.accepted || !row.style_selected) return;
    accepted.set(row.style_selected, (accepted.get(row.style_selected) || 0) + 1);
  });
  return [...accepted.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "friendly";
}

function inferPreferredLength(rows) {
  const acceptedLengths = rows
    .filter((row) => row.accepted)
    .map((row) => row.metadata?.textLength || row.metadata?.textSize)
    .filter(Boolean);
  const shortCount = acceptedLengths.filter((value) => value === "curto" || value === "short").length;
  return shortCount >= Math.max(2, acceptedLengths.length / 2) ? "curto" : "similar_to_original";
}

function inferPersuasiveIntensity(rows) {
  const persuasiveRows = rows.filter((row) => row.style_selected === "persuasive");
  const accepted = persuasiveRows.filter((row) => row.accepted).length;
  const rejected = persuasiveRows.filter((row) => row.rejected).length;
  if (rejected >= 2 && rejected > accepted) return "low";
  return "normal";
}

export async function updateUserPreferences({ userId, anonymousId }) {
  const owner = normalizeOwner({ userId, anonymousId });
  if (!owner.userId && !owner.anonymousId) return null;

  const where = getOwnerWhere(owner);
  const events = await query(
    `
    SELECT
      event_type,
      style_selected,
      accepted,
      rejected,
      metadata
    FROM learning_events
    WHERE ${where.clause}
      AND created_at >= NOW() - INTERVAL '60 days'
    ORDER BY created_at DESC
    LIMIT 120;
    `,
    where.params
  );

  const rows = events.rows;
  const preferredStyle = pickMostAcceptedStyle(rows);
  const preferredLength = inferPreferredLength(rows);
  const persuasiveIntensity = inferPersuasiveIntensity(rows);
  const prefersDirectMessages =
    rows.filter((row) => row.accepted && row.style_selected === "direct").length >= 2 ||
    preferredStyle === "direct";
  const prefersEmojis =
    rows.filter((row) => row.accepted && row.metadata?.usedEmoji === true).length >= 3;

  const result = await query(
    `
    INSERT INTO user_style_preferences (
      user_id,
      anonymous_id,
      preferred_style,
      preferred_length,
      prefers_emojis,
      prefers_direct_messages,
      persuasive_intensity,
      metadata,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
    ON CONFLICT ${owner.userId ? "(user_id) WHERE user_id IS NOT NULL" : "(anonymous_id) WHERE anonymous_id IS NOT NULL"}
    DO UPDATE SET
      preferred_style = EXCLUDED.preferred_style,
      preferred_length = EXCLUDED.preferred_length,
      prefers_emojis = EXCLUDED.prefers_emojis,
      prefers_direct_messages = EXCLUDED.prefers_direct_messages,
      persuasive_intensity = EXCLUDED.persuasive_intensity,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *;
    `,
    [
      owner.userId,
      owner.anonymousId,
      preferredStyle,
      preferredLength,
      prefersEmojis,
      prefersDirectMessages,
      persuasiveIntensity,
      JSON.stringify({
        sampleSize: rows.length,
        recalculatedAt: new Date().toISOString()
      })
    ]
  );

  return result.rows[0] || null;
}

export async function patchUserPreferences({ userId, anonymousId, preferences }) {
  const owner = normalizeOwner({ userId, anonymousId });
  if (!owner.userId && !owner.anonymousId) return null;

  const current = preferences || {};
  const result = await query(
    `
    INSERT INTO user_style_preferences (
      user_id,
      anonymous_id,
      preferred_style,
      preferred_length,
      prefers_emojis,
      prefers_direct_messages,
      persuasive_intensity,
      allow_learning,
      allow_text_storage,
      metadata,
      updated_at
    )
    VALUES ($1, $2, COALESCE($3, 'friendly'), COALESCE($4, 'curto'), COALESCE($5, FALSE), COALESCE($6, FALSE), COALESCE($7, 'normal'), COALESCE($8, TRUE), COALESCE($9, FALSE), $10::jsonb, NOW())
    ON CONFLICT ${owner.userId ? "(user_id) WHERE user_id IS NOT NULL" : "(anonymous_id) WHERE anonymous_id IS NOT NULL"}
    DO UPDATE SET
      preferred_style = COALESCE($3, user_style_preferences.preferred_style),
      preferred_length = COALESCE($4, user_style_preferences.preferred_length),
      prefers_emojis = COALESCE($5, user_style_preferences.prefers_emojis),
      prefers_direct_messages = COALESCE($6, user_style_preferences.prefers_direct_messages),
      persuasive_intensity = COALESCE($7, user_style_preferences.persuasive_intensity),
      allow_learning = COALESCE($8, user_style_preferences.allow_learning),
      allow_text_storage = COALESCE($9, user_style_preferences.allow_text_storage),
      metadata = user_style_preferences.metadata || $10::jsonb,
      updated_at = NOW()
    RETURNING *;
    `,
    [
      owner.userId,
      owner.anonymousId,
      current.preferredStyle || null,
      current.preferredLength || null,
      typeof current.prefersEmojis === "boolean" ? current.prefersEmojis : null,
      typeof current.prefersDirectMessages === "boolean" ? current.prefersDirectMessages : null,
      current.persuasiveIntensity || null,
      typeof current.allowLearning === "boolean" ? current.allowLearning : null,
      typeof current.allowTextStorage === "boolean" ? current.allowTextStorage : null,
      JSON.stringify(current.metadata || {})
    ]
  );

  return result.rows[0] || null;
}

export default updateUserPreferences;
