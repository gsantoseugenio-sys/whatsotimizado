import { query } from "./pool.js";

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  google_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT,
  subscription_current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_preview TEXT NOT NULL,
  source_extension_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_token_id UUID NOT NULL REFERENCES auth_tokens(id) ON DELETE CASCADE,
  request_text_length INTEGER NOT NULL,
  styles_count INTEGER NOT NULL,
  styles JSONB NOT NULL DEFAULT '[]'::jsonb,
  context TEXT NOT NULL DEFAULT 'business',
  objective TEXT NOT NULL DEFAULT 'none',
  prompt_variant TEXT NOT NULL DEFAULT 'A',
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anonymous_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT NOT NULL,
  request_text_length INTEGER NOT NULL,
  styles_count INTEGER NOT NULL,
  styles JSONB NOT NULL DEFAULT '[]'::jsonb,
  context TEXT NOT NULL DEFAULT 'business',
  objective TEXT NOT NULL DEFAULT 'none',
  prompt_variant TEXT NOT NULL DEFAULT 'A',
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS styles JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'business';
ALTER TABLE usage_events ALTER COLUMN context SET DEFAULT 'business';
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS objective TEXT NOT NULL DEFAULT 'none';
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS prompt_variant TEXT NOT NULL DEFAULT 'A';
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  auth_token_id UUID REFERENCES auth_tokens(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  context TEXT,
  objective TEXT,
  style TEXT,
  prompt_variant TEXT,
  latency_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_text_improvement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  auth_token_id UUID REFERENCES auth_tokens(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  original_text TEXT NOT NULL,
  improved_text TEXT,
  detected_type TEXT NOT NULL DEFAULT 'generica',
  detected_tone TEXT NOT NULL DEFAULT 'neutro',
  formality_level TEXT NOT NULL DEFAULT 'medio',
  commercial_intent BOOLEAN NOT NULL DEFAULT FALSE,
  text_size TEXT NOT NULL DEFAULT 'curto',
  action TEXT NOT NULL DEFAULT 'improve_text',
  origin TEXT NOT NULL DEFAULT 'chrome_extension',
  source TEXT,
  domain TEXT,
  user_email TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'success',
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_text_improvement_requests ALTER COLUMN original_text DROP NOT NULL;

CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  request_id UUID REFERENCES ai_text_improvement_requests(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message_type TEXT,
  style_selected TEXT,
  variation_selected INTEGER,
  domain TEXT,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  rejected BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_style_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  preferred_style TEXT NOT NULL DEFAULT 'friendly',
  preferred_length TEXT NOT NULL DEFAULT 'curto',
  prefers_emojis BOOLEAN NOT NULL DEFAULT FALSE,
  prefers_direct_messages BOOLEAN NOT NULL DEFAULT FALSE,
  persuasive_intensity TEXT NOT NULL DEFAULT 'normal',
  allow_learning BOOLEAN NOT NULL DEFAULT TRUE,
  allow_text_storage BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_style_preferences_owner CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_style_preferences_user
  ON user_style_preferences(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_style_preferences_anon
  ON user_style_preferences(anonymous_id)
  WHERE anonymous_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS prompt_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type TEXT NOT NULL,
  style TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'unknown',
  variation_style TEXT NOT NULL DEFAULT '',
  total_shown INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  total_rejected INTEGER NOT NULL DEFAULT 0,
  acceptance_rate NUMERIC(6, 5) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_type, style, domain, variation_style)
);

ALTER TABLE prompt_performance ADD COLUMN IF NOT EXISTS variation_style TEXT NOT NULL DEFAULT '';
UPDATE prompt_performance SET variation_style = '' WHERE variation_style IS NULL;
ALTER TABLE prompt_performance ALTER COLUMN variation_style SET DEFAULT '';
ALTER TABLE prompt_performance ALTER COLUMN variation_style SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usage_events_token_created
  ON usage_events(auth_token_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON usage_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anonymous_usage_events_anon_created
  ON anonymous_usage_events(anonymous_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_created
  ON telemetry_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_text_improvement_user_created
  ON ai_text_improvement_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_text_improvement_anon_created
  ON ai_text_improvement_requests(anonymous_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_text_improvement_status_created
  ON ai_text_improvement_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_created
  ON learning_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_anon_created
  ON learning_events(anonymous_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_events_request
  ON learning_events(request_id);

CREATE INDEX IF NOT EXISTS idx_learning_events_type_created
  ON learning_events(event_type, created_at DESC);
`;

export async function initSchema() {
  await query(SCHEMA_SQL);
}
