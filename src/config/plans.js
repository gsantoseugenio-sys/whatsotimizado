import env from "./env.js";

const UNLIMITED_USER_EMAILS = new Set(["gsantoseugenio@gmail.com"]);

const PLAN_CONFIG = {
  free: {
    id: "free",
    displayName: "Gratuito",
    monthlyRewriteLimit: 10,
    maxStylesPerRequest: 4,
    maxTextLength: 1200,
    priceBrlCents: 0,
    styleMonthlyLimits: {
      professional: 10,
      persuasive: 10,
      emotional: 10,
      creative: 10
    },
    contextMonthlyLimits: {
      business: 10,
      personal: 10,
      recreative: 10,
      quick_improve: 10
    },
    allowedContexts: ["business", "personal", "recreative", "quick_improve"]
  },
  personal: {
    id: "personal",
    displayName: "Uso Pessoal/Recreativo",
    monthlyRewriteLimit: Number.POSITIVE_INFINITY,
    maxStylesPerRequest: 8,
    maxTextLength: 4000,
    priceBrlCents: env.STRIPE_PRICE_PERSONAL_BRL_CENTS,
    styleMonthlyLimits: {},
    contextMonthlyLimits: {},
    allowedContexts: ["personal", "recreative", "quick_improve"]
  },
  business: {
    id: "business",
    displayName: "Empresarial",
    monthlyRewriteLimit: Number.POSITIVE_INFINITY,
    maxStylesPerRequest: 8,
    maxTextLength: 4000,
    priceBrlCents: env.STRIPE_PRICE_BUSINESS_BRL_CENTS,
    styleMonthlyLimits: {},
    contextMonthlyLimits: {},
    allowedContexts: ["business", "quick_improve"]
  },
  premium: {
    id: "premium",
    displayName: "Premium",
    monthlyRewriteLimit: Number.POSITIVE_INFINITY,
    maxStylesPerRequest: 8,
    maxTextLength: 4000,
    priceBrlCents: env.STRIPE_PRICE_PREMIUM_BRL_CENTS,
    styleMonthlyLimits: {},
    contextMonthlyLimits: {},
    allowedContexts: ["business", "personal", "recreative", "quick_improve"]
  }
};

export function getPlan(tier) {
  const normalized = (tier || "free").toLowerCase();
  if (normalized === "pro") return PLAN_CONFIG.premium;
  return PLAN_CONFIG[normalized] || PLAN_CONFIG.free;
}

export function getPaidPlan(tier) {
  const plan = getPlan(tier);
  return plan.id === "free" ? null : plan;
}

export function getRequiredPlanForContext(context) {
  if (context === "personal") return PLAN_CONFIG.personal;
  if (context === "business") return PLAN_CONFIG.business;
  if (context === "recreative") return PLAN_CONFIG.personal;
  return PLAN_CONFIG.premium;
}

export function getEffectivePlanIdForUser(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (UNLIMITED_USER_EMAILS.has(email)) return "premium";
  return user?.plan || "free";
}

export default PLAN_CONFIG;
