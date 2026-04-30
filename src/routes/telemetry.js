import { Router } from "express";
import { z } from "zod";
import { trackEvent } from "../services/telemetry-service.js";

const router = Router();

const telemetrySchema = z.object({
  eventName: z.enum(["rewrite_generated", "suggestion_used", "checkout_started"]),
  context: z.string().trim().max(40).optional(),
  objective: z.string().trim().max(60).optional(),
  style: z.string().trim().max(40).optional(),
  promptVariant: z.enum(["A", "B"]).optional(),
  latencyMs: z.coerce.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional()
});

router.post("/event", async (req, res, next) => {
  try {
    const payload = telemetrySchema.parse(req.body);
    await trackEvent({
      userId: req.user.id,
      authTokenId: req.authToken.id,
      ...payload
    });
    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Evento de telemetria invalido."
      });
    }
    return next(error);
  }
});

export default router;
