import { query } from "../db/pool.js";

export async function saveCheckoutSession({ userId, stripeSessionId, status }) {
  await query(
    `
    INSERT INTO checkout_sessions (user_id, stripe_session_id, status, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (stripe_session_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = NOW();
    `,
    [userId, stripeSessionId, status]
  );
}

export async function saveStripeEvent({ stripeEventId, eventType, payload }) {
  const result = await query(
    `
    INSERT INTO billing_events (stripe_event_id, event_type, payload)
    VALUES ($1, $2, $3::jsonb)
    ON CONFLICT (stripe_event_id) DO NOTHING
    RETURNING id;
    `,
    [stripeEventId, eventType, JSON.stringify(payload)]
  );
  return Boolean(result.rows[0]);
}
