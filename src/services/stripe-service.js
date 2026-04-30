import Stripe from "stripe";
import env from "../config/env.js";
import { getPaidPlan } from "../config/plans.js";
import { saveCheckoutSession } from "../repos/billing-repo.js";
import { setStripeCustomerId } from "../repos/user-repo.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

export function getStripeClient() {
  return stripe;
}

function formatAmountLabel({ currency, unitAmount }) {
  const amount = (unitAmount / 100).toFixed(2);
  if (currency === "brl") return `R$${amount.replace(".", ",")}`;
  return `US$${amount}`;
}

function resolveCheckoutPricing({ plan, billingCountry }) {
  const country = String(billingCountry || "BR").trim().toUpperCase();
  const isBrazil = country === "BR";
  const currency = isBrazil ? "brl" : "usd";
  const unitAmount = isBrazil
    ? plan.priceBrlCents
    : Math.max(50, Math.round(plan.priceBrlCents / env.USD_BRL_RATE));

  return {
    billingCountry: isBrazil ? "BR" : country || "US",
    currency,
    unitAmount,
    amountLabel: formatAmountLabel({ currency, unitAmount })
  };
}

async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: {
      userId: user.id
    }
  });

  await setStripeCustomerId(user.id, customer.id);
  return customer.id;
}

export async function createPremiumCheckoutSession({ user, planId = "premium", billingCountry = "BR" }) {
  const customerId = await ensureStripeCustomer(user);
  const plan = getPaidPlan(planId);
  if (!plan) {
    const error = new Error("Plano de checkout invalido.");
    error.status = 400;
    throw error;
  }
  const pricing = resolveCheckoutPricing({ plan, billingCountry });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card"],
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      planId: plan.id,
      billingCountry: pricing.billingCountry,
      currency: pricing.currency,
      usdBrlRate: String(env.USD_BRL_RATE)
    },
    line_items: [
      {
        price_data: {
          currency: pricing.currency,
          unit_amount: pricing.unitAmount,
          recurring: { interval: "month" },
          product_data: {
            name: `WhatsApp IA Rewriter - ${plan.displayName}`
          }
        },
        quantity: 1
      }
    ],
    subscription_data: {
      metadata: {
        userId: user.id,
        planId: plan.id,
        billingCountry: pricing.billingCountry,
        currency: pricing.currency,
        usdBrlRate: String(env.USD_BRL_RATE)
      }
    },
    success_url: `${env.APP_BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_BASE_URL}/billing/cancel`
  });

  await saveCheckoutSession({
    userId: user.id,
    stripeSessionId: session.id,
    status: session.status || "created"
  });

  return { session, plan, pricing };
}

export function constructStripeEvent({ rawBody, signature }) {
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
