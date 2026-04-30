import { Router } from "express";
import { z } from "zod";
import { getEffectivePlanIdForUser, getPlan, getRequiredPlanForContext } from "../config/plans.js";
import { generateRewrites } from "../services/rewrite-service.js";
import { trackTokenUsage } from "../services/token-service.js";
import { registerAnonymousUsageEvent } from "../repos/anonymous-usage-repo.js";
import {
  getAnonymousContextUsageSnapshot,
  getAnonymousStyleUsageSnapshot,
  getAnonymousUsageSnapshot,
  getContextUsageSnapshot,
  getStyleUsageSnapshot,
  getUsageSnapshot
} from "../services/usage-service.js";
import { trackEvent } from "../services/telemetry-service.js";

const router = Router();

const OBJECTIVE_CONTEXTS = {
  business_ceo: "business",
  business_sales_manager: "business",
  business_marketing_analyst: "business",
  business_digital_influencer: "business",
  technical_terms: "business",
  simple_language: "business",
  personal_loving: "personal",
  personal_happy: "personal",
  personal_nervous: "personal",
  personal_cold_calculating: "personal",
  personal_sad: "personal",
  personal_confident: "personal",
  personal_parable_analogy: "personal",
  personal_old_romantic_poet: "personal",
  personal_highly_polite: "personal",
  personal_charming: "personal",
  recreative_ancient_king: "recreative",
  recreative_existentialist: "recreative",
  recreative_war_general: "recreative",
  recreative_romantic_poet: "recreative",
  quick_improve: "quick_improve"
};

function getAnonymousId(req) {
  const anonymousId = String(req.header("x-anonymous-id") || "").trim();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(anonymousId)) return null;
  return anonymousId;
}

function getObjectiveContext(objective) {
  return OBJECTIVE_CONTEXTS[objective] || "business";
}

const rewriteSchema = z.object({
  text: z.string().trim().min(1).max(3000),
  styles: z
    .array(z.enum(["professional", "persuasive", "emotional", "creative"]))
    .min(1)
    .max(8),
  context: z
    .enum(["business", "personal", "recreative", "quick_improve"])
    .default("business"),
  objective: z
    .enum([
      "business_ceo",
      "business_sales_manager",
      "business_marketing_analyst",
      "business_digital_influencer",
      "personal_loving",
      "personal_happy",
      "personal_nervous",
      "personal_cold_calculating",
      "personal_sad",
      "personal_confident",
      "personal_parable_analogy",
      "personal_old_romantic_poet",
      "personal_highly_polite",
      "personal_charming",
      "recreative_ancient_king",
      "recreative_existentialist",
      "recreative_war_general",
      "recreative_romantic_poet",
      "technical_terms",
      "simple_language",
      "quick_improve"
    ])
    .default("business_ceo"),
  outputLanguage: z.enum(["auto", "pt-BR", "en", "hi", "id", "es"]).default("auto"),
  creativePersona: z.string().trim().max(80).optional()
});

router.post("/rewrite", async (req, res, next) => {
  try {
    const payload = rewriteSchema.parse(req.body);
    const objectiveContext = getObjectiveContext(payload.objective);
    if (objectiveContext !== payload.context) {
      return res.status(400).json({
        error: "Objetivo de reescrita incompativel com o modo de uso selecionado."
      });
    }

    const isAuthenticated = Boolean(req.user && req.authToken);
    const anonymousId = isAuthenticated ? null : getAnonymousId(req);
    if (!isAuthenticated && !anonymousId) {
      return res.status(400).json({
        error: "Identificador anonimo ausente."
      });
    }

    const userPlan = isAuthenticated ? getEffectivePlanIdForUser(req.user) : "free";
    const plan = getPlan(userPlan);
    const usage = isAuthenticated
      ? await getUsageSnapshot({
          userPlan,
          tokenId: req.authToken.id
        })
      : await getAnonymousUsageSnapshot({ anonymousId });

    if (payload.styles.length > plan.maxStylesPerRequest) {
      return res.status(403).json({
        error: `Plano ${plan.id} permite ate ${plan.maxStylesPerRequest} estilos por requisicao.`
      });
    }

    if (payload.text.length > plan.maxTextLength) {
      return res.status(403).json({
        error: `Plano ${plan.id} permite mensagens de ate ${plan.maxTextLength} caracteres.`
      });
    }

    if (!plan.allowedContexts.includes(payload.context)) {
      const requiredPlan = getRequiredPlanForContext(payload.context);
      return res.status(403).json({
        error: `Contexto "${payload.context}" nao disponivel para o plano ${plan.id}.`,
        upsell: {
          requiredPlan: requiredPlan.id,
          priceBrl: (requiredPlan.priceBrlCents / 100).toFixed(2)
        }
      });
    }

    const styleUsageChecks = isAuthenticated
      ? await getStyleUsageSnapshot({
          userPlan,
          tokenId: req.authToken.id,
          styles: payload.styles
        })
      : await getAnonymousStyleUsageSnapshot({
          anonymousId,
          styles: payload.styles
        });
    const blockedStyle = styleUsageChecks.find((check) => check.isLimitReached);
    if (blockedStyle) {
      return res.status(402).json({
        error: `Limite diario do estilo "${blockedStyle.style}" atingido no plano ${plan.id}.`,
        upsell: {
          requiredPlan: "premium",
          priceBrl: "79.90"
        },
        usage,
        styleUsage: styleUsageChecks
      });
    }

    const contextUsage = isAuthenticated
      ? await getContextUsageSnapshot({
          userPlan,
          tokenId: req.authToken.id,
          context: payload.context
        })
      : await getAnonymousContextUsageSnapshot({
          anonymousId,
          context: payload.context
        });
    if (contextUsage.isLimitReached) {
      return res.status(402).json({
        error: `Limite diario do contexto "${payload.context}" atingido no plano ${plan.id}.`,
        upsell: {
          requiredPlan: "premium",
          priceBrl: "79.90"
        },
        usage,
        contextUsage
      });
    }

    if (usage.isLimitReached) {
      return res.status(402).json({
        error: "Limite do plano gratuito atingido (5 reescritas por dia).",
        upsell: {
          requiredPlan: "premium",
          priceBrl: "79.90"
        },
        usage
      });
    }

    const startedAt = Date.now();
    const { suggestions, cached, promptVariant } = await generateRewrites({
      text: payload.text,
      styles: payload.styles,
      context: payload.context,
      objective: payload.objective,
      outputLanguage: payload.outputLanguage,
      creativePersona: payload.creativePersona,
      cacheScope: isAuthenticated ? req.user.id : anonymousId
    });

    if (!cached) {
      if (isAuthenticated) {
        await trackTokenUsage({
          userId: req.user.id,
          authTokenId: req.authToken.id,
          requestTextLength: payload.text.length,
          stylesCount: payload.styles.length,
          styles: payload.styles,
          context: payload.context,
          objective: payload.objective,
          outputLanguage: payload.outputLanguage,
          promptVariant,
          latencyMs: Date.now() - startedAt
        });
      } else {
        await registerAnonymousUsageEvent({
          anonymousId,
          requestTextLength: payload.text.length,
          stylesCount: payload.styles.length,
          styles: payload.styles,
          context: payload.context,
          objective: payload.objective,
          outputLanguage: payload.outputLanguage,
          promptVariant,
          latencyMs: Date.now() - startedAt
        });
      }
    }

    const usageAfter = isAuthenticated
      ? await getUsageSnapshot({
          userPlan,
          tokenId: req.authToken.id
        })
      : await getAnonymousUsageSnapshot({ anonymousId });

    if (isAuthenticated) {
      await trackEvent({
        userId: req.user.id,
        authTokenId: req.authToken.id,
        eventName: "rewrite_generated",
        context: payload.context,
        objective: payload.objective,
        outputLanguage: payload.outputLanguage,
        promptVariant,
        latencyMs: Date.now() - startedAt,
        metadata: {
          cached,
          styles: payload.styles
        }
      });
    }

    return res.json({
      cached,
      suggestions,
      meta: {
        elapsedMs: Date.now() - startedAt,
        plan: plan.id,
        context: payload.context,
        objective: payload.objective,
        outputLanguage: payload.outputLanguage,
        promptVariant,
        styleUsage: styleUsageChecks,
        contextUsage,
        usage: usageAfter
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Payload invalido.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }
    return next(error);
  }
});

export default router;
