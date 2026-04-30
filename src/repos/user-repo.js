import { query } from "../db/pool.js";

export async function upsertGoogleUser({ googleId, email, name }) {
  const result = await query(
    `
    INSERT INTO users (google_id, email, name, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (google_id)
    DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW()
    RETURNING *;
    `,
    [googleId, email, name || null]
  );
  return result.rows[0] || null;
}

export async function findUserById(userId) {
  const result = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1;`, [userId]);
  return result.rows[0] || null;
}

export async function findUserByStripeCustomerId(customerId) {
  const result = await query(
    `SELECT * FROM users WHERE stripe_customer_id = $1 LIMIT 1;`,
    [customerId]
  );
  return result.rows[0] || null;
}

export async function findUserByStripeSubscriptionId(subscriptionId) {
  const result = await query(
    `SELECT * FROM users WHERE stripe_subscription_id = $1 LIMIT 1;`,
    [subscriptionId]
  );
  return result.rows[0] || null;
}

export async function setStripeCustomerId(userId, customerId) {
  const result = await query(
    `
    UPDATE users
    SET stripe_customer_id = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [userId, customerId]
  );
  return result.rows[0] || null;
}

export async function setSubscriptionFromStripe({
  userId,
  plan,
  stripeSubscriptionId,
  subscriptionStatus,
  subscriptionCurrentPeriodEnd
}) {
  const result = await query(
    `
    UPDATE users
    SET
      plan = $2,
      stripe_subscription_id = $3,
      subscription_status = $4,
      subscription_current_period_end = $5,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [
      userId,
      plan,
      stripeSubscriptionId || null,
      subscriptionStatus || null,
      subscriptionCurrentPeriodEnd || null
    ]
  );
  return result.rows[0] || null;
}
