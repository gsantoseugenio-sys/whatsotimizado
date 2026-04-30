(() => {
  const API_BASE = "https://api.whatsotimizado.com.br";
  const config = {
    API_BASE,
    API_TRANSLATE_URL: `${API_BASE}/api/v1/ai/translate-text`,
    API_REWRITE_URL: `${API_BASE}/api/v1/rewrite`,
    API_LEARNING_EVENTS_URL: `${API_BASE}/api/v1/learning/events`,
    API_LEARNING_PREFERENCES_URL: `${API_BASE}/api/v1/learning/preferences`,
    API_ME_URL: `${API_BASE}/api/v1/auth/me`,
    API_LOGOUT_URL: `${API_BASE}/api/v1/auth/logout`,
    API_CHECKOUT_URL: `${API_BASE}/api/v1/billing/checkout`,
    API_TELEMETRY_URL: `${API_BASE}/api/v1/telemetry/event`,
    GOOGLE_LOGIN_START_URL: `${API_BASE}/auth/google/start`,
    REQUEST_TIMEOUT_MS: 20000,
    CACHE_TTL_MS: 120000,
    DEFAULT_CONTEXT: "business",
    DEFAULT_OBJECTIVE: "business_ceo",
    DEFAULT_LANGUAGE: "auto",
    DEFAULT_CREATIVE_PERSONA: "poeta",
    DEFAULT_STYLES: ["professional"],
    PREMIUM_PRICE_LABEL: "R$49,90",
    USD_BRL_RATE: 5.02
  };

  globalThis.WA_AI_REWRITER_CONFIG = Object.freeze(config);
})();
