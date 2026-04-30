import { query } from "../../db/pool.js";

const DEFAULT_PREFERENCES = {
  preferredStyle: "friendly",
  preferredLength: "curto",
  prefersEmojis: false,
  prefersDirectMessages: false,
  persuasiveIntensity: "normal",
  allowLearning: true,
  allowTextStorage: false
};

function normalizeOwner({ userId, anonymousId }) {
  return {
    userId: userId || null,
    anonymousId: userId ? null : anonymousId || null
  };
}

function mapPreferenceRow(row) {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return {
    preferredStyle: row.preferred_style || DEFAULT_PREFERENCES.preferredStyle,
    preferredLength: row.preferred_length || DEFAULT_PREFERENCES.preferredLength,
    prefersEmojis: Boolean(row.prefers_emojis),
    prefersDirectMessages: Boolean(row.prefers_direct_messages),
    persuasiveIntensity: row.persuasive_intensity || DEFAULT_PREFERENCES.persuasiveIntensity,
    allowLearning: row.allow_learning !== false,
    allowTextStorage: row.allow_text_storage === true,
    metadata: row.metadata || {}
  };
}

async function findPreferenceRow({ userId, anonymousId }) {
  const owner = normalizeOwner({ userId, anonymousId });
  if (!owner.userId && !owner.anonymousId) return null;

  const result = owner.userId
    ? await query(`SELECT * FROM user_style_preferences WHERE user_id = $1 LIMIT 1;`, [owner.userId])
    : await query(`SELECT * FROM user_style_preferences WHERE anonymous_id = $1 LIMIT 1;`, [
        owner.anonymousId
      ]);

  return result.rows[0] || null;
}

export async function getPromptPerformanceSnapshot({ messageType, style, domain }) {
  const normalizedDomain = String(domain || "unknown").toLowerCase();
  const result = await query(
    `
    SELECT *
    FROM prompt_performance
    WHERE message_type = $1
      AND domain = $2
      AND ($3::text IS NULL OR style = $3)
    ORDER BY acceptance_rate DESC, total_accepted DESC, updated_at DESC
    LIMIT 5;
    `,
    [messageType || "generica", normalizedDomain, style || null]
  );

  return result.rows.map((row) => ({
    messageType: row.message_type,
    style: row.style,
    domain: row.domain,
    variationStyle: row.variation_style,
    totalShown: row.total_shown,
    totalAccepted: row.total_accepted,
    totalRejected: row.total_rejected,
    acceptanceRate: Number(row.acceptance_rate || 0)
  }));
}

export async function getAdaptivePreferences({
  userId,
  anonymousId,
  messageType,
  style,
  domain,
  allowLearning = true
}) {
  const preferences = allowLearning
    ? mapPreferenceRow(await findPreferenceRow({ userId, anonymousId }))
    : {
        ...DEFAULT_PREFERENCES,
        allowLearning: false
      };
  const performance = await getPromptPerformanceSnapshot({ messageType, style, domain });

  return {
    ...preferences,
    promptPerformance: performance
  };
}

export async function ensurePreferenceRecord({ userId, anonymousId, defaults = {} }) {
  const owner = normalizeOwner({ userId, anonymousId });
  if (!owner.userId && !owner.anonymousId) return null;

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
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
    ON CONFLICT ${owner.userId ? "(user_id) WHERE user_id IS NOT NULL" : "(anonymous_id) WHERE anonymous_id IS NOT NULL"}
    DO UPDATE SET
      updated_at = NOW()
    RETURNING *;
    `,
    [
      owner.userId,
      owner.anonymousId,
      defaults.preferredStyle || DEFAULT_PREFERENCES.preferredStyle,
      defaults.preferredLength || DEFAULT_PREFERENCES.preferredLength,
      Boolean(defaults.prefersEmojis),
      Boolean(defaults.prefersDirectMessages),
      defaults.persuasiveIntensity || DEFAULT_PREFERENCES.persuasiveIntensity,
      defaults.allowLearning !== false,
      defaults.allowTextStorage === true,
      JSON.stringify(defaults.metadata || {})
    ]
  );

  return mapPreferenceRow(result.rows[0]);
}

export default getAdaptivePreferences;
