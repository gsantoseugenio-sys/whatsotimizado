import { getPlan } from "../config/plans.js";
import {
  getCurrentTokenUsage,
  getCurrentTokenUsageByContext,
  getCurrentTokenUsageByStyle
} from "./token-service.js";
import {
  countMonthlyAnonymousUsage,
  countMonthlyAnonymousUsageByContext,
  countMonthlyAnonymousUsageByStyle
} from "../repos/anonymous-usage-repo.js";

export async function getUsageSnapshot({ userPlan, tokenId }) {
  const plan = getPlan(userPlan);
  const used = await getCurrentTokenUsage(tokenId);
  return buildUsageSnapshot({ plan, used });
}

export async function getAnonymousUsageSnapshot({ anonymousId }) {
  const plan = getPlan("free");
  const used = await countMonthlyAnonymousUsage(anonymousId);
  return buildUsageSnapshot({ plan, used });
}

function buildUsageSnapshot({ plan, used }) {
  const remaining = Number.isFinite(plan.monthlyRewriteLimit)
    ? Math.max(plan.monthlyRewriteLimit - used, 0)
    : null;

  return {
    planId: plan.id,
    planName: plan.displayName,
    used,
    limit: Number.isFinite(plan.monthlyRewriteLimit) ? plan.monthlyRewriteLimit : null,
    remaining,
    isLimitReached: Number.isFinite(plan.monthlyRewriteLimit)
      ? used >= plan.monthlyRewriteLimit
      : false
  };
}

export async function getStyleUsageSnapshot({ userPlan, tokenId, styles }) {
  const plan = getPlan(userPlan);
  const checks = [];
  for (const style of styles) {
    const limit = plan.styleMonthlyLimits?.[style];
    if (!Number.isFinite(limit)) continue;
    const used = await getCurrentTokenUsageByStyle(tokenId, style);
    checks.push({
      style,
      used,
      limit,
      remaining: Math.max(limit - used, 0),
      isLimitReached: used >= limit
    });
  }
  return checks;
}

export async function getAnonymousStyleUsageSnapshot({ anonymousId, styles }) {
  const plan = getPlan("free");
  const checks = [];
  for (const style of styles) {
    const limit = plan.styleMonthlyLimits?.[style];
    if (!Number.isFinite(limit)) continue;
    const used = await countMonthlyAnonymousUsageByStyle(anonymousId, style);
    checks.push({
      style,
      used,
      limit,
      remaining: Math.max(limit - used, 0),
      isLimitReached: used >= limit
    });
  }
  return checks;
}

export async function getContextUsageSnapshot({ userPlan, tokenId, context }) {
  const plan = getPlan(userPlan);
  const limit = plan.contextMonthlyLimits?.[context];
  if (!Number.isFinite(limit)) {
    return {
      context,
      used: null,
      limit: null,
      remaining: null,
      isLimitReached: false
    };
  }
  const used = await getCurrentTokenUsageByContext(tokenId, context);
  return {
    context,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    isLimitReached: used >= limit
  };
}

export async function getAnonymousContextUsageSnapshot({ anonymousId, context }) {
  const plan = getPlan("free");
  const limit = plan.contextMonthlyLimits?.[context];
  if (!Number.isFinite(limit)) {
    return {
      context,
      used: null,
      limit: null,
      remaining: null,
      isLimitReached: false
    };
  }
  const used = await countMonthlyAnonymousUsageByContext(anonymousId, context);
  return {
    context,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
    isLimitReached: used >= limit
  };
}
