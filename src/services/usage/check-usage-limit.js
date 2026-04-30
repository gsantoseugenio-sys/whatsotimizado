import { query } from "../../db/pool.js";

export const IMPROVE_TEXT_ACTION = "improve_text";
export const TRANSLATE_RECEIVED_ACTION = "translate_received_message";

const DAILY_LIMITS = {
  free: 5,
  pro: 100,
  premium: null
};

const PREMIUM_FAIR_USE_DAILY_SOFT_LIMIT = 1000;

export function resolveImprovePlanId(planId) {
  const normalized = String(planId || "free").trim().toLowerCase();
  if (normalized === "premium") return "premium";
  if (normalized === "pro" || normalized === "personal" || normalized === "business") return "pro";
  return "free";
}

export function getDailyLimitForPlan(planId) {
  const resolvedPlan = resolveImprovePlanId(planId);
  return DAILY_LIMITS[resolvedPlan];
}

function buildOwnerFilter({ userId, anonymousId }) {
  if (userId) {
    return {
      clause: "user_id = $1",
      ownerValue: userId
    };
  }

  return {
    clause: "anonymous_id = $1 AND user_id IS NULL",
    ownerValue: anonymousId
  };
}

export async function countImproveTextUsageToday({ userId, anonymousId }) {
  if (!userId && !anonymousId) return 0;

  const owner = buildOwnerFilter({ userId, anonymousId });
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM ai_text_improvement_requests
    WHERE ${owner.clause}
      AND action = $2
      AND status = 'success'
      AND created_at >= DATE_TRUNC('day', NOW())
      AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';
    `,
    [owner.ownerValue, IMPROVE_TEXT_ACTION]
  );

  return result.rows[0]?.total || 0;
}

export async function countAiUsageToday({ userId, anonymousId }) {
  if (!userId && !anonymousId) return 0;

  const owner = buildOwnerFilter({ userId, anonymousId });
  const result = await query(
    `
    SELECT COUNT(*)::int AS total
    FROM ai_text_improvement_requests
    WHERE ${owner.clause}
      AND action = ANY($2::text[])
      AND status = 'success'
      AND created_at >= DATE_TRUNC('day', NOW())
      AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';
    `,
    [owner.ownerValue, [IMPROVE_TEXT_ACTION, TRANSLATE_RECEIVED_ACTION]]
  );

  return result.rows[0]?.total || 0;
}

export async function checkUsageLimit({ userId, anonymousId, plan }) {
  const resolvedPlan = resolveImprovePlanId(plan);
  const dailyLimit = getDailyLimitForPlan(resolvedPlan);
  const usedToday = await countAiUsageToday({ userId, anonymousId });
  const isLimitReached = Number.isFinite(dailyLimit) ? usedToday >= dailyLimit : false;

  return {
    plan: resolvedPlan,
    usedToday,
    dailyLimit,
    isLimitReached,
    fairUse:
      resolvedPlan === "premium"
        ? {
            dailySoftLimit: PREMIUM_FAIR_USE_DAILY_SOFT_LIMIT,
            isAboveSoftLimit: usedToday >= PREMIUM_FAIR_USE_DAILY_SOFT_LIMIT
          }
        : null
  };
}

export function toPublicUsage(usage) {
  return {
    plan: usage.plan,
    usedToday: usage.usedToday,
    dailyLimit: usage.dailyLimit
  };
}

export default checkUsageLimit;
