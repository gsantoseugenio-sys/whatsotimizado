import { Router } from "express";
import { processStripeEvent } from "../services/billing-service.js";
import { constructStripeEvent } from "../services/stripe-service.js";

const router = Router();

router.post("/webhook", async (req, res, next) => {
  try {
    const signature = req.header("stripe-signature");
    if (!signature) {
      return res.status(400).send("Assinatura Stripe ausente.");
    }

    const event = constructStripeEvent({
      rawBody: req.body,
      signature
    });
    await processStripeEvent(event);

    return res.json({ received: true });
  } catch (error) {
    if (error.type === "StripeSignatureVerificationError") {
      return res.status(400).send("Assinatura Stripe invalida.");
    }
    return next(error);
  }
});

export default router;
