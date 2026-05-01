import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { optionalUserAuth, requireUserAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRateLimit } from "./middleware/rate-limit.js";
import authApiRouter from "./routes/auth-api.js";
import authPublicRouter from "./routes/auth-public.js";
import aiRouter from "./routes/ai.routes.js";
import billingApiRouter from "./routes/billing-api.js";
import billingPagesRouter from "./routes/billing-pages.js";
import env from "./config/env.js";
import learningRouter from "./routes/learning.routes.js";
import publicPagesRouter from "./routes/public-pages.js";
import rewriteRouter from "./routes/rewrite.js";
import stripeWebhookRouter from "./routes/stripe-webhook.js";
import telemetryRouter from "./routes/telemetry.js";

const app = express();

function parseOriginList(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedWebOrigins = new Set(parseOriginList(env.ALLOWED_WEB_ORIGINS));
const allowedChromeExtensionOrigins = parseOriginList(env.ALLOWED_CHROME_EXTENSION_ORIGINS);

function isAllowedChromeExtensionOrigin(origin) {
  if (!origin.startsWith("chrome-extension://")) return false;
  return (
    allowedChromeExtensionOrigins.includes("chrome-extension://") ||
    allowedChromeExtensionOrigins.includes(origin)
  );
}

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (isAllowedChromeExtensionOrigin(origin)) return callback(null, true);
      if (allowedWebOrigins.has(origin)) return callback(null, true);
      if (env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/i.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin nao permitida."));
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Extension-Id",
      "X-Anonymous-Id",
      "Stripe-Signature"
    ]
  })
);

app.use(morgan("tiny"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});

app.use(publicPagesRouter);

app.use("/api/v1/stripe", express.raw({ type: "application/json" }), stripeWebhookRouter);
app.use(express.json({ limit: "1mb" }));

app.use("/auth/google", authPublicRouter);
app.use("/billing", billingPagesRouter);

app.use("/api/v1", apiRateLimit);
app.use("/api/v1/auth", requireUserAuth, authApiRouter);
app.use("/api/v1/billing", requireUserAuth, billingApiRouter);
app.use("/api/v1/telemetry", requireUserAuth, telemetryRouter);
app.use("/api/v1/ai", optionalUserAuth, aiRouter);
app.use("/api/v1/learning", optionalUserAuth, learningRouter);
app.use("/api/v1", optionalUserAuth, rewriteRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
