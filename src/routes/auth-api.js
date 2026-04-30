import { Router } from "express";
import { getEffectivePlanIdForUser, getPlan } from "../config/plans.js";
import { invalidateAuthToken } from "../services/token-service.js";
import { getUsageSnapshot } from "../services/usage-service.js";

const router = Router();

router.get("/me", async (req, res, next) => {
  try {
    const effectivePlanId = getEffectivePlanIdForUser(req.user);
    const usage = await getUsageSnapshot({
      userPlan: effectivePlanId,
      tokenId: req.authToken.id
    });
    const plan = getPlan(effectivePlanId);

    return res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        plan: effectivePlanId
      },
      usage,
      limits: {
        styleMonthlyLimits: plan.styleMonthlyLimits,
        contextMonthlyLimits: plan.contextMonthlyLimits,
        maxStylesPerRequest: plan.maxStylesPerRequest,
        maxTextLength: plan.maxTextLength
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await invalidateAuthToken(req.authToken.id);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
