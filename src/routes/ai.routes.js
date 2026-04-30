import { Router } from "express";
import { z } from "zod";
import { getEffectivePlanIdForUser } from "../config/plans.js";
import { classifyMessage, improveText } from "../services/text-intelligence/index.js";
import { checkUsageLimit, toPublicUsage } from "../services/usage/check-usage-limit.js";
import { getAdaptivePreferences } from "../services/learning/index.js";
import { registerUsage } from "../services/usage/register-usage.js";

const router = Router();

const metadataSchema = z
  .object({
    platform: z.string().trim().max(80).optional(),
    source: z.string().trim().max(120).optional(),
    domain: z.string().trim().max(255).optional()
  })
  .default({});

const userPreferencesSchema = z
  .object({
    language: z.string().trim().max(20).default("pt-BR"),
    context: z.string().trim().max(60).optional(),
    objective: z.string().trim().max(80).optional(),
    style: z.string().trim().max(40).default("natural"),
    quick: z.boolean().optional(),
    maxLength: z.enum(["similar_to_original", "shorter", "expanded"]).default("similar_to_original"),
    generateVariations: z.boolean().optional(),
    allowLearning: z.boolean().default(true),
    allowTextStorage: z.boolean().default(false)
  })
  .default({});

const classificationSchema = z
  .object({
    messageType: z
      .enum([
        "venda",
        "atendimento",
        "cobranca",
        "profissional",
        "informal",
        "emocional",
        "reclamacao",
        "desculpa",
        "generica"
      ])
      .optional(),
    tone: z.enum(["direto", "cordial", "persuasivo", "profissional", "emocional", "neutro"]).optional(),
    formalityLevel: z.enum(["baixo", "medio", "alto"]).optional(),
    commercialIntent: z.boolean().optional(),
    textSize: z.enum(["curto", "medio", "longo"]).optional()
  })
  .optional();

const improveTextSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  classification: classificationSchema,
  metadata: metadataSchema,
  userPreferences: userPreferencesSchema
});

function getAnonymousId(req) {
  const anonymousId = String(req.header("x-anonymous-id") || "").trim();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(anonymousId)) return null;
  return anonymousId;
}

function normalizeMetadata(metadata) {
  return {
    platform: metadata.platform || "chrome_extension",
    source: metadata.source || "active_text_field",
    domain: metadata.domain || null
  };
}

function getRequestIdentity(req) {
  const isAuthenticated = Boolean(req.user && req.authToken);
  return {
    isAuthenticated,
    userId: isAuthenticated ? req.user.id : null,
    authTokenId: isAuthenticated ? req.authToken.id : null,
    anonymousId: isAuthenticated ? null : getAnonymousId(req),
    userEmail: isAuthenticated ? req.user.email : null,
    plan: isAuthenticated ? getEffectivePlanIdForUser(req.user) : "free"
  };
}

async function registerRequestStatus({
  identity,
  payload,
  metadata,
  classification,
  improvedText,
  status,
  validation,
  extraMetadata,
  allowTextStorage
}) {
  return registerUsage({
    userId: identity.userId,
    authTokenId: identity.authTokenId,
    anonymousId: identity.anonymousId,
    originalText: payload.text,
    improvedText,
    classification,
    origin: metadata.platform,
    source: metadata.source,
    domain: metadata.domain,
    userEmail: identity.userEmail,
    plan: identity.plan,
    status,
    validation,
    allowTextStorage,
    metadata: {
      requestMetadata: metadata,
      userPreferences: payload.userPreferences,
      ...extraMetadata
    }
  });
}

router.post("/improve-text", async (req, res, next) => {
  let payload = null;
  let metadata = null;
  let identity = null;
  let classification = null;

  try {
    payload = improveTextSchema.parse(req.body);
    metadata = normalizeMetadata(payload.metadata);
    identity = getRequestIdentity(req);

    if (!identity.isAuthenticated && !identity.anonymousId) {
      return res.status(400).json({
        error: "ANONYMOUS_ID_REQUIRED",
        message: "Identificador anonimo ausente."
      });
    }

    classification = {
      ...classifyMessage(payload.text),
      ...(payload.classification || {})
    };
    const usageBefore = await checkUsageLimit({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      plan: identity.plan
    });

    if (usageBefore.isLimitReached) {
      await registerRequestStatus({
        identity,
        payload,
        metadata,
        classification,
        improvedText: null,
        status: "blocked_daily_limit",
        validation: {
          blocked: true,
          reason: "daily_limit_reached"
        },
        extraMetadata: {
          usageBefore: toPublicUsage(usageBefore)
        }
      });

      return res.status(429).json({
        error: "DAILY_LIMIT_REACHED",
        message: "Você atingiu o limite diário do seu plano.",
        usage: toPublicUsage(usageBefore)
      });
    }

    const adaptivePreferences = await getAdaptivePreferences({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      messageType: classification.messageType,
      style: payload.userPreferences.style,
      domain: metadata.domain,
      allowLearning: payload.userPreferences.allowLearning !== false
    });

    const improved = await improveText(
      payload.text,
      {
        ...payload.userPreferences,
        adaptivePreferences
      },
      {
        metadata,
        classification,
        generateVariations: Boolean(payload.userPreferences.generateVariations)
      }
    );

    const registered = await registerRequestStatus({
      identity,
      payload,
      metadata,
      classification: improved.classification,
      improvedText: improved.improvedText,
      status: "success",
      validation: improved.validation,
      extraMetadata: {
        attempts: improved.attempts,
        adaptivePreferencesUsed: payload.userPreferences.allowLearning !== false
      },
      allowTextStorage: payload.userPreferences.allowTextStorage === true
    });

    return res.json({
      requestId: registered.event?.id || null,
      improvedText: improved.improvedText,
      ...(improved.variations?.length ? { variations: improved.variations } : {}),
      usage: toPublicUsage(registered.usage)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "INVALID_PAYLOAD",
        message: "Payload invalido."
      });
    }

    if (payload && identity && classification) {
      await registerRequestStatus({
        identity,
        payload,
        metadata: metadata || normalizeMetadata({}),
        classification,
        improvedText: null,
        status: "failed",
        validation: {
          error: error.message || "Falha ao melhorar texto."
        },
        extraMetadata: {
          failureCode: error.code || null
        }
      }).catch(() => null);
    }

    return next(error);
  }
});

export default router;
