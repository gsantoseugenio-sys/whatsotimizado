import rateLimit from "express-rate-limit";
import env from "../config/env.js";

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${req.header("x-extension-id") || "no-ext"}:${req.header("authorization") || req.ip}`,
  message: {
    error: "Muitas requisicoes. Tente novamente em instantes."
  }
});
