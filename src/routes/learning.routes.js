import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import {
  ensurePreferenceRecord,
  getAdaptivePreferences,
  patchUserPreferences,
  recordLearningEvent
} from "../services/learning/index.js";

const router = Router();

const EVENT_TYPES = [
  "suggestion_shown",
  "suggestion_accepted",
  "suggestion_rejected",
  "variation_selected",
  "retry_clicked",
  "feedback_positive",
  "feedback_negative",
  "text_inserted"
];

const learningEventSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  requestId: z.string().uuid().optional().nullable(),
  metadata: z
    .object({
      platform: z.string().trim().max(80).optional(),
      domain: z.string().trim().max(255).optional(),
      messageType: z.string().trim().max(60).optional(),
      styleSelected: z.string().trim().max(60).optional(),
      variationSelected: z.number().int().min(0).max(20).optional(),
      variationStyle: z.string().trim().max(60).optional(),
      textLength: z.string().trim().max(40).optional(),
      textSize: z.string().trim().max(40).optional(),
      usedEmoji: z.boolean().optional()
    })
    .passthrough()
    .default({})
});

const preferencesPatchSchema = z.object({
  reset: z.boolean().optional(),
  preferences: z
    .object({
      preferredStyle: z.enum(["direct", "persuasive", "friendly", "professional"]).optional(),
      preferredLength: z.enum(["curto", "medio", "longo", "similar_to_original"]).optional(),
      prefersEmojis: z.boolean().optional(),
      prefersDirectMessages: z.boolean().optional(),
      persuasiveIntensity: z.enum(["low", "normal", "high"]).optional(),
      allowLearning: z.boolean().optional(),
      allowTextStorage: z.boolean().optional()
    })
    .default({})
});

function getAnonymousId(req) {
  const anonymousId = String(req.header("x-anonymous-id") || "").trim();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(anonymousId)) return null;
  return anonymousId;
}

function getIdentity(req) {
  const isAuthenticated = Boolean(req.user && req.authToken);
  return {
    isAuthenticated,
    userId: isAuthenticated ? req.user.id : null,
    anonymousId: isAuthenticated ? null : getAnonymousId(req)
  };
}

function requireIdentity(identity, res) {
  if (identity.userId || identity.anonymousId) return true;
  res.status(400).json({
    error: "IDENTITY_REQUIRED",
    message: "Identificador anonimo ausente."
  });
  return false;
}

router.post("/events", async (req, res, next) => {
  try {
    const payload = learningEventSchema.parse(req.body);
    const identity = getIdentity(req);
    if (!requireIdentity(identity, res)) return;

    const preferences = await getAdaptivePreferences({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      messageType: payload.metadata.messageType || "generica",
      style: payload.metadata.styleSelected || null,
      domain: payload.metadata.domain || "unknown"
    });
    if (preferences.allowLearning === false) {
      return res.json({
        ok: true,
        skipped: true
      });
    }

    const event = await recordLearningEvent({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      requestId: payload.requestId || null,
      eventType: payload.eventType,
      metadata: payload.metadata
    });

    return res.json({
      ok: true,
      eventId: event?.id || null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "INVALID_LEARNING_EVENT",
        message: "Evento de aprendizado invalido."
      });
    }
    return next(error);
  }
});

router.get("/preferences", async (req, res, next) => {
  try {
    const identity = getIdentity(req);
    if (!requireIdentity(identity, res)) return;

    const preferences = await getAdaptivePreferences({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      messageType: String(req.query.messageType || "generica"),
      style: req.query.style ? String(req.query.style) : null,
      domain: String(req.query.domain || "unknown")
    });

    return res.json({ preferences });
  } catch (error) {
    return next(error);
  }
});

router.patch("/preferences", async (req, res, next) => {
  try {
    const payload = preferencesPatchSchema.parse(req.body);
    const identity = getIdentity(req);
    if (!requireIdentity(identity, res)) return;

    if (payload.reset) {
      if (identity.userId) {
        await query(`DELETE FROM user_style_preferences WHERE user_id = $1;`, [identity.userId]);
      } else {
        await query(`DELETE FROM user_style_preferences WHERE anonymous_id = $1;`, [identity.anonymousId]);
      }
      const preferences = await ensurePreferenceRecord({
        userId: identity.userId,
        anonymousId: identity.anonymousId
      });
      return res.json({ preferences });
    }

    await patchUserPreferences({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      preferences: payload.preferences
    });

    const preferences = await getAdaptivePreferences({
      userId: identity.userId,
      anonymousId: identity.anonymousId,
      messageType: "generica",
      domain: "unknown"
    });

    return res.json({ preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "INVALID_PREFERENCES",
        message: "Preferencias invalidas."
      });
    }
    return next(error);
  }
});

export default router;
