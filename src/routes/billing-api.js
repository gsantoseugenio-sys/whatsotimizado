import { Router } from "express";
import { createPremiumCheckoutSession } from "../services/stripe-service.js";
import { getEffectivePlanIdForUser, getPaidPlan, getPlan } from "../config/plans.js";

const router = Router();

router.post("/checkout", async (req, res, next) => {
  try {
    const requestedPlanId = String(req.body?.planId || "premium").trim().toLowerCase();
    const requestedPlan = getPaidPlan(requestedPlanId);
    if (!requestedPlan) {
      return res.status(400).json({
        error: "Plano de checkout invalido."
      });
    }

    const currentPlan = getPlan(getEffectivePlanIdForUser(req.user));
    if (currentPlan.id === requestedPlan.id) {
      return res.status(200).json({
        alreadyPremium: true,
        message: `Usuario ja esta no plano ${requestedPlan.displayName}.`
      });
    }

    const billingCountry = String(req.body?.billingCountry || "BR").trim().toUpperCase();
    const { session, plan, pricing } = await createPremiumCheckoutSession({
      user: req.user,
      planId: requestedPlan.id,
      billingCountry
    });

    return res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      planId: plan.id,
      planName: plan.displayName,
      amountBrl: (plan.priceBrlCents / 100).toFixed(2),
      billingCountry: pricing.billingCountry,
      currency: pricing.currency,
      amount: (pricing.unitAmount / 100).toFixed(2),
      amountLabel: pricing.amountLabel
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
