import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  APP_BASE_URL: z.string().url(),
  WEBHOOK_BASE_URL: z.string().url(),
  ALLOWED_WEB_ORIGINS: z
    .string()
    .default("https://web.whatsapp.com,https://mail.google.com,https://www.instagram.com"),
  ALLOWED_CHROME_EXTENSION_ORIGINS: z.string().default("chrome-extension://"),
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  TOKEN_SIGNING_SECRET: z.string().min(20),
  TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  GOOGLE_CLIENT_ID: z.string().min(20),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  GOOGLE_REDIRECT_URI: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(20),
  STRIPE_WEBHOOK_SECRET: z.string().min(10),
  STRIPE_PRICE_PERSONAL_BRL_CENTS: z.coerce.number().int().positive().default(2990),
  STRIPE_PRICE_BUSINESS_BRL_CENTS: z.coerce.number().int().positive().default(4990),
  STRIPE_PRICE_PREMIUM_BRL_CENTS: z.coerce.number().int().positive().default(7990),
  USD_BRL_RATE: z.coerce.number().positive().default(5.02),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(180000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(40)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:");
  parsed.error.issues.forEach((issue) => {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export default parsed.data;
