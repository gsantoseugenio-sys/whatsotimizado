import { saveCheckoutSession, saveStripeEvent } from "../repos/billing-repo.js";
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  setStripeCustomerId,
  setSubscriptionFromStripe
} from "../repos/user-repo.js";
import { getStripeClient } from "./stripe-service.js";
import { getPaidPlan } from "../config/plans.js";

const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

function resolvePlanFromSubscription(subscription, status) {
  if (!PREMIUM_STATUSES.has(status)) return "free";
  const plan = getPaidPlan(subscription.metadata?.planId || "premium");
  return plan?.id || "premium";
}

async function resolveUserForSubscription(subscription) {
  const customerId = String(subscription.customer || "");
  const metadataUserId = subscription.metadata?.userId || null;

  if (customerId) {
    const byCustomer = await findUserByStripeCustomerId(customerId);
    if (byCustomer) return byCustomer;
  }

  if (metadataUserId) {
    const byId = await findUserById(metadataUserId);
    if (byId) {
      if (customerId && !byId.stripe_customer_id) {
        await setStripeCustomerId(byId.id, customerId);
      }
      return byId;
    }
  }

  if (subscription.id) {
    const bySub = await findUserByStripeSubscriptionId(subscription.id);
    if (bySub) return bySub;
  }

  return null;
}

export async function processStripeEvent(event) {
  const isNew = await saveStripeEvent({
    stripeEventId: event.id,
    eventType: event.type,
    payload: event
  });
  if (!isNew) return;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.client_reference_id) {
      await saveCheckoutSession({
        userId: session.client_reference_id,
        stripeSessionId: session.id,
        status: session.status || "completed"
      });
    }
    if (session.subscription) {
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      await syncSubscription(subscription);
    }
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    await syncSubscription(subscription);
    return;
  }

  if (event.type === "invoice.payment_failed" || event.type === "invoice.paid") {
    const invoice = event.data.object;
    if (!invoice.subscription) return;
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(String(invoice.subscription));
    await syncSubscription(subscription);
  }
}

export async function syncSubscription(subscription) {
  const user = await resolveUserForSubscription(subscription);
  if (!user) return null;

  const status = String(subscription.status || "incomplete");
  const plan = resolvePlanFromSubscription(subscription, status);
  const periodEnd = subscription.current_period_end
    ? new Date(Number(subscription.current_period_end) * 1000)
    : null;

  return setSubscriptionFromStripe({
    userId: user.id,
    plan,
    stripeSubscriptionId: subscription.id || null,
    subscriptionStatus: status,
    subscriptionCurrentPeriodEnd: periodEnd
  });
}
