(() => {
  "use strict";

  const runtimeConfig = globalThis.WA_AI_REWRITER_CONFIG || {};
  const configuredApiBase = String(runtimeConfig.API_BASE || "").replace(/\/+$/, "");
  const LEGACY_PLACEHOLDER_HOST = ["api", ["seu", "dominio"].join("-"), "com"].join(".");
  const CONFIG = Object.freeze({
    API_BASE: configuredApiBase,
    API_TRANSLATE_URL:
      runtimeConfig.API_TRANSLATE_URL || `${configuredApiBase}/api/v1/ai/translate-text`,
    API_IMPROVE_URL:
      runtimeConfig.API_IMPROVE_URL || `${configuredApiBase}/api/v1/ai/improve-text`,
    API_REWRITE_URL: runtimeConfig.API_REWRITE_URL || `${configuredApiBase}/api/v1/rewrite`,
    API_LEARNING_EVENTS_URL:
      runtimeConfig.API_LEARNING_EVENTS_URL || `${configuredApiBase}/api/v1/learning/events`,
    API_LEARNING_PREFERENCES_URL:
      runtimeConfig.API_LEARNING_PREFERENCES_URL ||
      `${configuredApiBase}/api/v1/learning/preferences`,
    API_ME_URL: runtimeConfig.API_ME_URL || `${configuredApiBase}/api/v1/auth/me`,
    API_LOGOUT_URL: runtimeConfig.API_LOGOUT_URL || `${configuredApiBase}/api/v1/auth/logout`,
    API_CHECKOUT_URL:
      runtimeConfig.API_CHECKOUT_URL || `${configuredApiBase}/api/v1/billing/checkout`,
    API_TELEMETRY_URL:
      runtimeConfig.API_TELEMETRY_URL || `${configuredApiBase}/api/v1/telemetry/event`,
    GOOGLE_LOGIN_START_URL:
      runtimeConfig.GOOGLE_LOGIN_START_URL || `${configuredApiBase}/auth/google/start`,
    REQUEST_TIMEOUT_MS: runtimeConfig.REQUEST_TIMEOUT_MS || 20000,
    CACHE_TTL_MS: runtimeConfig.CACHE_TTL_MS || 120000,
    DEFAULT_CONTEXT: runtimeConfig.DEFAULT_CONTEXT || "business",
    DEFAULT_OBJECTIVE: runtimeConfig.DEFAULT_OBJECTIVE || "business_ceo",
    DEFAULT_LANGUAGE: runtimeConfig.DEFAULT_LANGUAGE || "auto",
    DEFAULT_CREATIVE_PERSONA: runtimeConfig.DEFAULT_CREATIVE_PERSONA || "poeta",
    DEFAULT_STYLES: Array.isArray(runtimeConfig.DEFAULT_STYLES)
      ? runtimeConfig.DEFAULT_STYLES
      : ["professional"],
    DEFAULT_AI_STYLE: runtimeConfig.DEFAULT_AI_STYLE || "natural",
    PREMIUM_PRICE_LABEL: runtimeConfig.PREMIUM_PRICE_LABEL || "R$79,90",
    USD_BRL_RATE: Number(runtimeConfig.USD_BRL_RATE || 5.02)
  });

  function isLegacyPlaceholderApiUrl(value) {
    try {
      return new URL(value).hostname === LEGACY_PLACEHOLDER_HOST;
    } catch {
      return false;
    }
  }

  const CONTEXT_OPTIONS = [
    { id: "business", label: "Uso Empresarial" },
    { id: "personal", label: "Uso Pessoal" },
    { id: "recreative", label: "Uso Recreativo" }
  ];

  const LANGUAGE_OPTIONS = [
    { id: "auto", label: "Autodeclarar" },
    { id: "pt-BR", label: "Portugues - Brasil" },
    { id: "en", label: "Ingles" },
    { id: "hi", label: "Hindi" },
    { id: "id", label: "Indonesia" },
    { id: "es", label: "Espanhol" }
  ];

  const BRAZIL_TIME_ZONES = new Set([
    "America/Sao_Paulo",
    "America/Rio_Branco",
    "America/Manaus",
    "America/Boa_Vista",
    "America/Campo_Grande",
    "America/Cuiaba",
    "America/Porto_Velho",
    "America/Recife",
    "America/Belem",
    "America/Fortaleza",
    "America/Maceio",
    "America/Bahia",
    "America/Noronha"
  ]);

  const PAYMENT_PLANS = [
    { id: "free", label: "Free", priceLabel: "5 por dia" },
    { id: "personal", label: "Uso Pessoal", priceBrlCents: 2990 },
    { id: "business", label: "Empresarial", priceBrlCents: 4990 },
    { id: "premium", label: "Uso Premium", priceBrlCents: 7990 }
  ];

  const PREMIUM_SYMBOL_PATH = "assets/premium-symbol.png";

  const REWRITE_OPTIONS_BY_CONTEXT = {
    business: [
      { id: "business_ceo", label: "CEO / Empresario" },
      { id: "business_sales_manager", label: "Gestor de vendas" },
      { id: "business_marketing_analyst", label: "Analista de marketing" },
      { id: "business_digital_influencer", label: "Copywriter" },
      { id: "technical_terms", label: "Termos tecnicos" },
      { id: "simple_language", label: "Linguagem simples" }
    ],
    personal: [
      { id: "personal_loving", label: "Amoroso" },
      { id: "personal_happy", label: "Feliz" },
      { id: "personal_nervous", label: "Nervoso" },
      { id: "personal_cold_calculating", label: "Frio e Calculista" },
      { id: "personal_sad", label: "Triste" },
      { id: "personal_confident", label: "Confiante" },
      { id: "personal_parable_analogy", label: "Parabola / Analogia" }
    ],
    recreative: [
      { id: "recreative_ancient_king", label: "Rei Antigo" },
      { id: "recreative_existentialist", label: "Filosofo Existencialista" },
      { id: "recreative_war_general", label: "General em Guerra" },
      { id: "recreative_romantic_poet", label: "Poeta Romantico" }
    ]
  };

  const LEGACY_OBJECTIVE_FALLBACKS = {
    business_digital_influencer: "business_digital_influencer",
    personal_old_romantic_poet: "recreative_romantic_poet",
    personal_highly_polite: "personal_confident",
    personal_charming: "personal_loving"
  };

  const state = {
    composer: null,
    footer: null,
    root: null,
    panel: null,
    targetComposer: null,
    observer: null,
    refreshTimer: null,
    heartbeat: null,
    selectedStyles: new Set(CONFIG.DEFAULT_STYLES),
    selectedContext: CONFIG.DEFAULT_CONTEXT,
    selectedObjective: CONFIG.DEFAULT_OBJECTIVE,
    selectedLanguage: CONFIG.DEFAULT_LANGUAGE,
    selectedAiStyle: CONFIG.DEFAULT_AI_STYLE,
    selectedPersona: CONFIG.DEFAULT_CREATIVE_PERSONA,
    cache: new Map(),
    translationCache: new Map(),
    translationPending: new Set(),
    translationScanTimer: null,
    translationLastLimitToastAt: 0,
    history: [],
    lastImproveRequest: null,
    lastImproveResult: null,
    learningSettings: {
      allowLearning: true,
      allowTextStorage: false
    },
    adaptivePreferences: null,
    panelOpen: false,
    session: null,
    anonymousId: "",
    usage: null,
    accountLoading: false,
    panelDraftReady: false,
    currentPromptVariant: "A",
    currentRequestContext: CONFIG.DEFAULT_CONTEXT,
    currentRequestObjective: CONFIG.DEFAULT_OBJECTIVE,
    settings: {
      apiBaseUrl: CONFIG.API_BASE,
      manualToken: "",
      defaultPlan: "free",
      favoriteStyles: [...CONFIG.DEFAULT_STYLES],
      defaultObjective: CONFIG.DEFAULT_OBJECTIVE,
      defaultLanguage: CONFIG.DEFAULT_LANGUAGE,
      defaultAiStyle: CONFIG.DEFAULT_AI_STYLE,
      autoTranslateIncoming: false
    }
  };

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 10 && rect.height > 10;
  }

  function cleanText(text) {
    return (text || "")
      .replace(/\u200b/g, "")
      .replace(/\r/g, "")
      .trim();
  }

  function getComposerText(composer) {
    if (!composer) return "";
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      return cleanText(composer.value || "");
    }
    return cleanText(composer.innerText || composer.textContent || "");
  }

  function normalizeForHeuristics(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function countMatches(normalizedText, keywords) {
    return keywords.reduce((score, keyword) => {
      const normalizedKeyword = normalizeForHeuristics(keyword);
      if (!normalizedKeyword || !normalizedText.includes(normalizedKeyword)) return score;
      return score + (normalizedKeyword.includes(" ") ? 2 : 1);
    }, 0);
  }

  function classifyMessage(text) {
    const normalized = normalizeForHeuristics(text);
    const wordCount = (normalized.match(/[a-z0-9]+/g) || []).length;
    const typeKeywords = {
      venda: ["comprar", "preco", "valor", "orcamento", "desconto", "fechar", "venda", "plano", "cliente"],
      atendimento: ["ajuda", "suporte", "atendimento", "duvida", "pedido", "retorno", "resolver"],
      cobranca: ["cobrar", "pagamento", "pendente", "vencido", "boleto", "fatura", "debito", "em aberto"],
      profissional: ["reuniao", "projeto", "prazo", "contrato", "proposta", "relatorio", "equipe"],
      informal: ["oi", "ola", "beleza", "valeu", "blz", "top", "show", "kkk", "tudo bem"],
      emocional: ["sinto", "saudade", "feliz", "triste", "chateado", "amor", "carinho", "magoado"],
      reclamacao: ["problema", "reclamacao", "insatisfeito", "decepcionado", "erro", "falha", "nao funcionou"]
    };
    const priority = [
      "cobranca",
      "reclamacao",
      "venda",
      "atendimento",
      "profissional",
      "emocional",
      "informal"
    ];
    const scores = Object.fromEntries(
      Object.entries(typeKeywords).map(([type, keywords]) => [type, countMatches(normalized, keywords)])
    );
    const messageType = priority.reduce(
      (current, type) => (scores[type] > scores[current] ? type : current),
      "venda"
    );
    const selectedType = scores[messageType] > 0 ? messageType : "generica";
    const commercialIntent =
      selectedType === "venda" ||
      selectedType === "cobranca" ||
      countMatches(normalized, ["cliente", "contratar", "comprar", "orcamento", "pagamento"]) >= 2;
    const tone = commercialIntent
      ? "persuasivo"
      : selectedType === "emocional"
        ? "emocional"
        : countMatches(normalized, ["por favor", "obrigado", "obrigada", "gentileza"]) > 0
          ? "cordial"
          : selectedType === "profissional"
            ? "profissional"
            : wordCount <= 18
              ? "direto"
              : "cordial";
    const formalityLevel =
      countMatches(normalized, ["prezado", "cordialmente", "atenciosamente", "solicito"]) > 0
        ? "alto"
        : countMatches(normalized, ["oi", "blz", "valeu", "kkk", "mano"]) > 0
          ? "baixo"
          : "medio";
    const textSize = text.length <= 180 || wordCount <= 28 ? "curto" : text.length <= 800 ? "medio" : "longo";

    return {
      messageType: selectedType,
      tone,
      formalityLevel,
      commercialIntent,
      textSize
    };
  }

  function getPlatformMetadata() {
    const domain = window.location.hostname || "";
    return {
      platform: "chrome_extension",
      source: "active_text_field",
      domain
    };
  }

  function isWhatsAppWeb() {
    return window.location.hostname.toLowerCase().includes("web.whatsapp.com");
  }

  function getLengthPreference() {
    const domain = window.location.hostname.toLowerCase();
    if (domain.includes("whatsapp") || domain.includes("instagram")) return "shorter";
    return "similar_to_original";
  }

  function validateImprovedText(original, improved) {
    const originalText = cleanText(original);
    const improvedText = cleanText(improved);
    const normalized = normalizeForHeuristics(improvedText);
    const roboticPhrases = [
      "prezados",
      "caro cliente",
      "venho por meio desta",
      "sem mais para o momento",
      "coloco-me a disposicao"
    ];
    const issues = [];

    if (!improvedText) issues.push("empty");
    if (originalText && improvedText.length > Math.max(originalText.length * 2, originalText.length + 220)) {
      issues.push("too_long");
    }
    if (roboticPhrases.some((phrase) => normalized.includes(phrase) && !normalizeForHeuristics(originalText).includes(phrase))) {
      issues.push("robotic");
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  function scoreComposer(element) {
    let score = 0;
    const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();
    const title = (element.getAttribute("title") || "").toLowerCase();

    if (state.panel?.contains(element) || state.root?.contains(element)) return -100;
    if (element.closest("footer")) score += 8;
    if (element === document.activeElement) score += 10;
    if (element.getAttribute("role") === "textbox") score += 2;
    if (element instanceof HTMLTextAreaElement) score += 4;
    if (element instanceof HTMLInputElement) score += 3;
    if (element.isContentEditable) score += 3;
    if (element.hasAttribute("data-tab")) score += 1;
    if (
      ariaLabel.includes("mensagem") ||
      ariaLabel.includes("message") ||
      ariaLabel.includes("email") ||
      ariaLabel.includes("comentario") ||
      ariaLabel.includes("comment")
    ) {
      score += 4;
    }
    if (title.includes("mensagem") || title.includes("message") || title.includes("email")) score += 2;
    if (element.closest("header")) score -= 8;
    if (element.closest("[data-testid='chat-list-search']")) score -= 8;
    if (element.closest("[role='search']")) score -= 8;

    return score;
  }

  function findComposer() {
    const selector =
      "textarea:not([disabled]), input[type='text']:not([disabled]), input[type='search']:not([disabled]), input[type='email']:not([disabled]), div[contenteditable='true'][role='textbox'], footer div[contenteditable='true'], div[contenteditable='true'][data-tab], [contenteditable='true'], [contenteditable]:not([contenteditable='false'])";
    const active = document.activeElement;
    const activeCandidate =
      active?.matches?.(selector) && isVisible(active) && !active.readOnly ? active : null;
    const candidates = Array.from(document.querySelectorAll(selector)).filter(
      (element) => isVisible(element) && !element.readOnly
    );
    if (activeCandidate && !candidates.includes(activeCandidate)) candidates.unshift(activeCandidate);
    if (candidates.length === 0) return null;

    const ranked = candidates
      .map((element) => ({ element, score: scoreComposer(element) }))
      .filter((item) => item.score >= 2)
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.element || null;
  }

  function buildCacheKey(payload) {
    return JSON.stringify({
      text: payload.text,
      styles: [...payload.styles].sort(),
      context: payload.context,
      objective: payload.objective || "",
      outputLanguage: payload.outputLanguage || CONFIG.DEFAULT_LANGUAGE,
      creativePersona: payload.creativePersona || ""
    });
  }

  function pruneCache() {
    const now = Date.now();
    for (const [key, entry] of state.cache.entries()) {
      if (now - entry.createdAt > CONFIG.CACHE_TTL_MS) state.cache.delete(key);
    }
    if (state.cache.size <= 40) return;
    const ordered = [...state.cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (let i = 0; i < ordered.length - 40; i += 1) {
      state.cache.delete(ordered[i][0]);
    }
  }

  function callBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response || null);
      });
    });
  }

  async function loadSession() {
    try {
      const response = await callBackground({ type: "WA_AI_GET_SESSION" });
      state.session = response?.session || null;
    } catch {
      state.session = null;
    }
  }

  async function loadAnonymousId() {
    const storageKey = "wa_ai_anonymous_id";
    const data = await chrome.storage.local.get([storageKey]);
    const existing = String(data[storageKey] || "").trim();
    if (existing) {
      state.anonymousId = existing;
      return;
    }

    const random = new Uint8Array(18);
    crypto.getRandomValues(random);
    const generated = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
    state.anonymousId = `anon_${generated}`;
    await chrome.storage.local.set({ [storageKey]: state.anonymousId });
  }

  async function loadOptions() {
    const data = await chrome.storage.sync.get(["wa_ai_options"]);
    const options = data.wa_ai_options || {};
    const savedApiBaseUrl = String(options.apiBaseUrl || CONFIG.API_BASE).replace(/\/+$/, "");
    const apiBaseUrl = isLegacyPlaceholderApiUrl(savedApiBaseUrl) ? CONFIG.API_BASE : savedApiBaseUrl;
    const savedObjective = String(options.defaultObjective || CONFIG.DEFAULT_OBJECTIVE);
    const objectiveFromOptions = LEGACY_OBJECTIVE_FALLBACKS[savedObjective] || savedObjective;
    const contextFromOptions = getContextForObjective(objectiveFromOptions) || CONFIG.DEFAULT_CONTEXT;
    const validContext = CONTEXT_OPTIONS.some((item) => item.id === contextFromOptions)
      ? contextFromOptions
      : CONFIG.DEFAULT_CONTEXT;
    const validObjective = isObjectiveAvailable(validContext, objectiveFromOptions)
      ? objectiveFromOptions
      : getDefaultObjective(validContext);
    const languageFromOptions = String(options.defaultLanguage || CONFIG.DEFAULT_LANGUAGE);
    const validLanguage = LANGUAGE_OPTIONS.some((item) => item.id === languageFromOptions)
      ? languageFromOptions
      : CONFIG.DEFAULT_LANGUAGE;
    const validAiStyle = CONFIG.DEFAULT_AI_STYLE;

    state.settings = {
      apiBaseUrl,
      manualToken: String(options.manualToken || "").trim(),
      defaultPlan: String(options.defaultPlan || "free"),
      favoriteStyles: ["professional"],
      defaultObjective: validObjective,
      defaultLanguage: validLanguage,
      defaultAiStyle: validAiStyle,
      autoTranslateIncoming: options.autoTranslateIncoming === true
    };

    state.selectedStyles = new Set(["professional"]);
    state.selectedContext = validContext;
    state.selectedObjective = state.settings.defaultObjective;
    state.selectedLanguage = state.settings.defaultLanguage;
    state.selectedAiStyle = state.settings.defaultAiStyle;
  }

  async function savePanelPreferences() {
    const data = await chrome.storage.sync.get(["wa_ai_options"]);
    const options = data.wa_ai_options || {};
    await chrome.storage.sync.set({
      wa_ai_options: {
        ...options,
        defaultObjective: state.selectedObjective,
        defaultLanguage: state.selectedLanguage,
        defaultAiStyle: state.selectedAiStyle,
        autoTranslateIncoming: state.settings.autoTranslateIncoming === true
      }
    });
  }

  async function loadHistory() {
    const data = await chrome.storage.local.get(["wa_ai_improve_history"]);
    state.history = Array.isArray(data.wa_ai_improve_history) ? data.wa_ai_improve_history.slice(0, 5) : [];
  }

  async function loadLearningSettings() {
    const data = await chrome.storage.local.get(["wa_ai_learning_settings"]);
    state.learningSettings = {
      allowLearning: data.wa_ai_learning_settings?.allowLearning !== false,
      allowTextStorage: data.wa_ai_learning_settings?.allowTextStorage === true
    };
  }

  async function saveLearningSettings() {
    await chrome.storage.local.set({
      wa_ai_learning_settings: state.learningSettings
    });
  }

  async function syncLearningPreferences() {
    try {
      const response = await fetchWithTimeout(getApiUrl("/api/v1/learning/preferences"), {
        method: "PATCH",
        headers: {
          ...buildAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          preferences: {
            allowLearning: state.learningSettings.allowLearning,
            allowTextStorage: state.learningSettings.allowTextStorage,
            preferredStyle: state.selectedAiStyle
          }
        })
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) state.adaptivePreferences = body.preferences || null;
    } catch {
      // Preferencias remotas nao podem bloquear a extensao.
    }
  }

  async function saveHistory() {
    await chrome.storage.local.set({
      wa_ai_improve_history: state.history.slice(0, 5)
    });
  }

  async function addHistoryItem(originalText, improvedText) {
    const item = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      originalText: cleanText(originalText).slice(0, 500),
      improvedText: cleanText(improvedText).slice(0, 1000),
      domain: window.location.hostname,
      createdAt: Date.now()
    };
    state.history = [item, ...state.history.filter((entry) => entry.improvedText !== item.improvedText)].slice(0, 5);
    await saveHistory().catch(() => null);
    if (state.panel) renderHistory(state.panel);
  }

  async function saveFeedback(value) {
    const data = await chrome.storage.local.get(["wa_ai_feedback"]);
    const feedback = Array.isArray(data.wa_ai_feedback) ? data.wa_ai_feedback : [];
    feedback.unshift({
      value,
      originalText: state.lastImproveRequest?.text || "",
      improvedText: state.lastImproveResult?.improvedText || "",
      domain: window.location.hostname,
      createdAt: Date.now()
    });
    await chrome.storage.local.set({ wa_ai_feedback: feedback.slice(0, 30) });
  }

  function buildLearningMetadata(extra = {}) {
    const request = state.lastImproveRequest || {};
    const classification = request.classification || {};
    return {
      platform: "chrome_extension",
      domain: window.location.hostname,
      messageType: classification.messageType || "generica",
      styleSelected: request.userPreferences?.style || state.selectedAiStyle,
      textLength: classification.textSize || "curto",
      ...extra
    };
  }

  async function trackLearningEvent(eventType, metadata = {}) {
    if (!state.learningSettings.allowLearning) return;
    try {
      await fetchWithTimeout(getApiUrl("/api/v1/learning/events"), {
        method: "POST",
        headers: {
          ...buildAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventType,
          requestId: state.lastImproveResult?.requestId || null,
          metadata: buildLearningMetadata(metadata)
        })
      });
    } catch {
      // Aprendizado nao pode atrapalhar a escrita.
    }
  }

  function getLanguageLabel(language) {
    return LANGUAGE_OPTIONS.find((item) => item.id === language)?.label || "Portugues - Brasil";
  }

  function getTranslationTargetLanguage() {
    return state.selectedLanguage && state.selectedLanguage !== "auto" ? state.selectedLanguage : "pt-BR";
  }

  function shouldAutoTranslateIncoming() {
    return state.settings.autoTranslateIncoming === true && isWhatsAppWeb() && !isUsageLimitReached();
  }

  function hashText(value) {
    let hash = 0;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function buildTranslationCacheKey(text, targetLanguage) {
    return `${targetLanguage}:${hashText(cleanText(text).toLowerCase())}`;
  }

  function normalizeComparableText(text) {
    return normalizeForHeuristics(text).replace(/[^\p{L}\p{N}]+/gu, "");
  }

  function getIncomingMessageTextElements() {
    if (!isWhatsAppWeb()) return [];
    const selector = [
      ".message-in .selectable-text.copyable-text",
      ".message-in .selectable-text",
      "[class*='message-in'] .selectable-text.copyable-text",
      "[class*='message-in'] .copyable-text"
    ].join(",");
    const seen = new Set();
    return Array.from(document.querySelectorAll(selector)).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (!isVisible(element)) return false;
      if (element.closest("#wa-ai-rewriter-panel, #wa-ai-rewriter-root, .wa-ai-translation-card")) return false;
      const text = cleanText(element.innerText || element.textContent || "");
      if (text.length < 2 || text.length > 1200) return false;
      const key = `${text}:${element.getBoundingClientRect().top}:${element.getBoundingClientRect().left}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getTranslationCardAnchor(textElement) {
    return textElement.closest(".copyable-text") || textElement;
  }

  function renderTranslationCard(textElement, message, stateName = "done") {
    const anchor = getTranslationCardAnchor(textElement);
    if (!anchor) return null;
    let card = anchor.nextElementSibling?.classList?.contains("wa-ai-translation-card")
      ? anchor.nextElementSibling
      : null;
    if (!card) {
      card = document.createElement("div");
      card.className = "wa-ai-translation-card";
      anchor.insertAdjacentElement("afterend", card);
    }
    card.dataset.waAiTranslationState = stateName;
    card.textContent = "";
    const label = document.createElement("span");
    label.className = "wa-ai-translation-label";
    label.textContent = stateName === "loading" ? "Traduzindo" : "Traducao";
    const body = document.createElement("span");
    body.className = "wa-ai-translation-text";
    body.textContent = message;
    card.appendChild(label);
    card.appendChild(body);
    return card;
  }

  function removeTranslationCard(textElement) {
    const anchor = getTranslationCardAnchor(textElement);
    const card = anchor?.nextElementSibling;
    if (card?.classList?.contains("wa-ai-translation-card")) card.remove();
  }

  async function requestTranslation(text, targetLanguage) {
    const response = await fetchWithTimeout(getApiUrl("/api/v1/ai/translate-text"), {
      method: "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        metadata: {
          ...getPlatformMetadata(),
          source: "incoming_message"
        },
        userPreferences: {
          targetLanguage,
          allowLearning: state.learningSettings.allowLearning,
          allowTextStorage: state.learningSettings.allowTextStorage
        }
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || body.error || "Falha ao traduzir mensagem.");
      error.status = response.status;
      error.payload = body;
      throw error;
    }
    state.usage = body.usage || state.usage;
    return cleanText(body.translatedText || "");
  }

  async function translateIncomingMessageElement(textElement) {
    const originalText = cleanText(textElement.innerText || textElement.textContent || "");
    if (!originalText) return;

    const targetLanguage = getTranslationTargetLanguage();
    const cacheKey = buildTranslationCacheKey(originalText, targetLanguage);
    if (textElement.dataset.waAiTranslationKey === cacheKey) return;

    const cached = state.translationCache.get(cacheKey);
    if (cached) {
      if (cached.sameLanguage) removeTranslationCard(textElement);
      else renderTranslationCard(textElement, cached.text);
      textElement.dataset.waAiTranslationKey = cacheKey;
      return;
    }

    if (state.translationPending.has(cacheKey)) return;
    state.translationPending.add(cacheKey);
    textElement.dataset.waAiTranslationKey = cacheKey;
    renderTranslationCard(textElement, `para ${getLanguageLabel(targetLanguage)}...`, "loading");

    try {
      const translatedText = await requestTranslation(originalText, targetLanguage);
      const sameLanguage =
        normalizeComparableText(translatedText) === normalizeComparableText(originalText);
      state.translationCache.set(cacheKey, {
        text: translatedText,
        sameLanguage,
        createdAt: Date.now()
      });
      if (sameLanguage || !translatedText) {
        removeTranslationCard(textElement);
      } else {
        renderTranslationCard(textElement, translatedText);
      }
      if (state.panel) applyAccountState(state.panel);
    } catch (error) {
      if (error.status === 402 || error.status === 429 || error.payload?.error === "DAILY_LIMIT_REACHED") {
        state.usage = error.payload?.usage || state.usage;
        renderTranslationCard(textElement, "Limite diario atingido.", "error");
        const now = Date.now();
        if (state.panel && now - state.translationLastLimitToastAt > 30000) {
          state.translationLastLimitToastAt = now;
          applyAccountState(state.panel);
          setToast(state.panel, "Limite diario atingido para traducao automatica.");
        }
      } else {
        renderTranslationCard(textElement, "Nao foi possivel traduzir.", "error");
      }
    } finally {
      state.translationPending.delete(cacheKey);
    }
  }

  function scanIncomingMessagesForTranslation() {
    if (!shouldAutoTranslateIncoming()) return;
    const candidates = getIncomingMessageTextElements().slice(-4);
    candidates.forEach((element) => {
      translateIncomingMessageElement(element);
    });
  }

  function scheduleIncomingTranslationScan() {
    clearTimeout(state.translationScanTimer);
    state.translationScanTimer = setTimeout(scanIncomingMessagesForTranslation, 450);
  }

  function getApiUrl(path) {
    return `${state.settings.apiBaseUrl}${path}`;
  }

  function getEffectiveToken() {
    return state.session?.token || state.settings.manualToken || "";
  }

  function getDefaultObjective(context) {
    return REWRITE_OPTIONS_BY_CONTEXT[context]?.[0]?.id || CONFIG.DEFAULT_OBJECTIVE;
  }

  function getContextForObjective(objective) {
    return CONTEXT_OPTIONS.find((context) =>
      REWRITE_OPTIONS_BY_CONTEXT[context.id]?.some((option) => option.id === objective)
    )?.id;
  }

  function isObjectiveAvailable(context, objective) {
    return Boolean(
      REWRITE_OPTIONS_BY_CONTEXT[context]?.some((option) => option.id === objective)
    );
  }

  function getPlanMeta(planId) {
    const normalized = planId === "pro" ? "premium" : String(planId || "free").toLowerCase();
    return PAYMENT_PLANS.find((plan) => plan.id === normalized) || PAYMENT_PLANS[0];
  }

  function inferBillingCountry() {
    const languages = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ""];
    if (languages.some((language) => /^pt-BR$/i.test(language))) return "BR";

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (BRAZIL_TIME_ZONES.has(timeZone)) return "BR";

    return "US";
  }

  function isBrazilBilling() {
    return inferBillingCountry() === "BR";
  }

  function formatMoneyFromCents(cents, currency) {
    const value = (cents / 100).toFixed(2);
    if (currency === "BRL") return `R$${value.replace(".", ",")}`;
    return `US$${value}`;
  }

  function getPlanPriceLabel(plan) {
    if (plan.id === "free") return plan.priceLabel;
    if (isBrazilBilling()) return formatMoneyFromCents(plan.priceBrlCents, "BRL");
    const usdCents = Math.max(50, Math.round(plan.priceBrlCents / CONFIG.USD_BRL_RATE));
    return formatMoneyFromCents(usdCents, "USD");
  }

  function getPremiumPriceLabel() {
    return getPlanPriceLabel(getPlanMeta("premium"));
  }

  function getExtensionAssetUrl(path) {
    try {
      return chrome.runtime.getURL(path);
    } catch (_) {
      return path;
    }
  }

  function createPremiumSymbol(size = "md") {
    const symbol = document.createElement("span");
    symbol.className = `wa-ai-premium-symbol is-${size}`;
    symbol.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    image.src = getExtensionAssetUrl(PREMIUM_SYMBOL_PATH);
    symbol.appendChild(image);
    return symbol;
  }

  function setPremiumText(element, text, size = "sm") {
    if (!element) return;
    element.textContent = "";
    element.appendChild(createPremiumSymbol(size));
    element.appendChild(document.createTextNode(text));
  }

  function selectContext(context, panel) {
    state.selectedContext = context;
    if (!isObjectiveAvailable(context, state.selectedObjective)) {
      state.selectedObjective = getDefaultObjective(context);
    }
    renderContextOptions(panel);
    renderRewriteOptions(panel);
    savePanelPreferences().catch(() => null);
  }

  function selectObjective(objective, panel) {
    state.selectedObjective = objective;
    renderRewriteOptions(panel);
    savePanelPreferences().catch(() => null);
  }

  async function saveSession(session) {
    await callBackground({ type: "WA_AI_SET_SESSION", session });
    state.session = session;
  }

  async function clearSession() {
    await callBackground({ type: "WA_AI_CLEAR_SESSION" });
    state.session = null;
    state.usage = null;
  }

  function setToast(panel, message) {
    const toast = panel?.querySelector("[data-wa-ai='toast']");
    if (toast) toast.textContent = message || "";
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getDraftInput(panel = state.panel) {
    return panel?.querySelector("[data-wa-ai='draft-input']") || null;
  }

  function getDraftText(panel = state.panel) {
    return cleanText(getDraftInput(panel)?.value || "");
  }

  function setDraftText(panel, text) {
    const input = getDraftInput(panel);
    if (!input) return;
    input.value = text || "";
  }

  function focusDraftInput({ prefill = true } = {}) {
    const input = getDraftInput();
    if (!input) return;
    if (prefill && !cleanText(input.value)) {
      const composerText = getComposerText(state.composer || findComposer());
      if (composerText) input.value = composerText;
    }
    input.focus();
    input.setSelectionRange?.(input.value.length, input.value.length);
  }

  function setPanelLoading(panel, loading) {
    const buttons = panel?.querySelectorAll(
      "[data-wa-ai-action], [data-wa-ai='generate'], [data-wa-ai='quick-improve'], [data-wa-ai='variations'], [data-plan-id]"
    );
    if (!buttons) return;
    buttons.forEach((button) => {
      button.disabled = Boolean(loading);
    });
  }

  function setPrimaryRowVisible(panel, visible) {
    const primaryRow = panel?.querySelector("[data-wa-ai='primary-row']");
    if (primaryRow) primaryRow.hidden = !visible;
  }

  function renderContextOptions(panel) {
    const wrapper = panel?.querySelector("[data-wa-ai='context-options']");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    CONTEXT_OPTIONS.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wa-ai-mode-card";
      button.dataset.contextId = option.id;
      button.textContent = option.label;
      button.setAttribute("aria-pressed", option.id === state.selectedContext ? "true" : "false");
      if (option.id === state.selectedContext) button.classList.add("is-active");
      button.addEventListener("click", () => selectContext(option.id, panel));
      wrapper.appendChild(button);
    });
  }

  function renderRewriteOptions(panel) {
    const section = panel?.querySelector("[data-wa-ai='rewrite-section']");
    const wrapper = panel?.querySelector("[data-wa-ai='rewrite-options']");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const options = REWRITE_OPTIONS_BY_CONTEXT[state.selectedContext] || [];
    if (section) {
      section.hidden = options.length <= 1;
    }
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wa-ai-voice-chip";
      button.dataset.objectiveId = option.id;
      button.textContent = option.label;
      button.setAttribute("aria-pressed", option.id === state.selectedObjective ? "true" : "false");
      if (option.id === state.selectedObjective) button.classList.add("is-active");
      button.addEventListener("click", () => selectObjective(option.id, panel));
      wrapper.appendChild(button);
    });
  }

  function renderLanguageOptions(panel) {
    const select = panel?.querySelector("[data-wa-ai='language']");
    if (!select) return;
    select.innerHTML = "";

    LANGUAGE_OPTIONS.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.id;
      item.textContent = option.label;
      select.appendChild(item);
    });
    select.value = state.selectedLanguage;
  }

  function renderTranslationSettings(panel) {
    const autoTranslate = panel?.querySelector("[data-wa-ai='auto-translate-incoming']");
    if (autoTranslate) autoTranslate.checked = state.settings.autoTranslateIncoming === true;
  }

  function renderHistory(panel) {
    const wrapper = panel?.querySelector("[data-wa-ai='history-list']");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    if (!state.history.length) {
      const empty = document.createElement("p");
      empty.className = "wa-ai-history-empty";
      empty.textContent = "Sem historico recente.";
      wrapper.appendChild(empty);
      return;
    }

    state.history.slice(0, 5).forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "wa-ai-history-item";
      row.textContent = item.improvedText;
      row.title = "Usar novamente";
      row.addEventListener("click", async () => {
        if (await setComposerText(item.improvedText)) {
          setToast(panel, "Texto do historico aplicado.");
        } else {
          setToast(panel, getApplyFailureMessage("inserir"));
        }
      });
      wrapper.appendChild(row);
    });
  }

  function renderLearningSettings(panel) {
    const allowLearning = panel?.querySelector("[data-wa-ai='allow-learning']");
    const allowTextStorage = panel?.querySelector("[data-wa-ai='allow-text-storage']");
    if (allowLearning) allowLearning.checked = state.learningSettings.allowLearning;
    if (allowTextStorage) allowTextStorage.checked = state.learningSettings.allowTextStorage;
  }

  function renderPaymentPlans(panel) {
    const wrapper = panel?.querySelector("[data-wa-ai='payment-plans']");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const isLogged = Boolean(getEffectiveToken());
    const currentPlan = getPlanMeta(isLogged ? state.session?.plan || state.settings.defaultPlan : "free");
    PAYMENT_PLANS.forEach((plan) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wa-ai-plan-option";
      button.dataset.planId = plan.id;
      if (plan.id === "premium") button.classList.add("is-premium");
      if (plan.id === currentPlan.id) button.classList.add("is-current");
      button.disabled = !isLogged || plan.id === "free" || plan.id === currentPlan.id;
      const label = document.createElement("span");
      label.className = "wa-ai-plan-label";
      if (plan.id === "premium") {
        label.appendChild(createPremiumSymbol("sm"));
        label.appendChild(document.createTextNode(plan.label));
      } else {
        label.textContent = plan.label;
      }
      const price = document.createElement("strong");
      price.textContent = getPlanPriceLabel(plan);
      button.appendChild(label);
      button.appendChild(price);
      button.addEventListener("click", () => {
        if (plan.id !== "free") handleUpgrade(panel, plan.id);
      });
      wrapper.appendChild(button);
    });
  }

  function renderUsageText() {
    if (!state.usage) return "Uso: --";
    const plan = String(state.usage.plan || state.usage.planId || "free");
    const label = plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : plan === "business" ? "Pro" : plan === "personal" ? "Pro" : "Free";
    const used = Number.isFinite(state.usage.usedToday) ? state.usage.usedToday : state.usage.used;
    const limit = state.usage.dailyLimit ?? state.usage.limit;
    if (limit === null) return `${label}: ilimitado`;
    if (Number.isFinite(used) && Number.isFinite(limit)) return `${label}: ${used}/${limit} usos hoje`;
    return "Uso: --";
  }

  function isUsageLimitReached() {
    if (!state.usage) return false;
    const used = Number.isFinite(state.usage.usedToday) ? state.usage.usedToday : state.usage.used;
    const limit = state.usage.dailyLimit ?? state.usage.limit;
    if (limit === null) return false;
    return Boolean(state.usage.isLimitReached) || (Number.isFinite(used) && Number.isFinite(limit) && used >= limit);
  }

  function applyAccountState(panel) {
    const accountValue = panel.querySelector("[data-wa-ai='account-value']");
    const badge = panel.querySelector("[data-wa-ai='plan-badge']");
    const usageValue = panel.querySelector("[data-wa-ai='usage-value']");
    const loginBtn = panel.querySelector("[data-wa-ai-action='login']");
    const refreshBtn = panel.querySelector("[data-wa-ai-action='refresh']");
    const logoutBtn = panel.querySelector("[data-wa-ai-action='logout']");
    const generateButtons = panel.querySelectorAll("[data-wa-ai='generate']");
    const quickButtons = panel.querySelectorAll("[data-wa-ai='quick-improve']");
    const variationsButtons = panel.querySelectorAll("[data-wa-ai='variations']");

    const isLogged = Boolean(getEffectiveToken());
    const planMeta = getPlanMeta(isLogged ? state.session?.plan || state.settings.defaultPlan : "free");
    const isPaidPlan = planMeta.id !== "free";
    const isPremiumPlan = planMeta.id === "premium";
    const usageReached = isUsageLimitReached();

    if (accountValue) {
      if (!isLogged) {
        accountValue.textContent = "Free sem login";
      } else {
        accountValue.textContent = state.session?.email || "Token manual";
      }
    }
    if (badge) {
      if (isPremiumPlan) {
        setPremiumText(badge, planMeta.label, "xs");
      } else {
        badge.textContent = planMeta.label;
      }
      badge.classList.remove("free", "premium");
      badge.classList.add(isPaidPlan ? "premium" : "free");
    }
    if (usageValue) {
      usageValue.textContent = renderUsageText();
    }
    const headerUsage = panel.querySelector("[data-wa-ai='header-usage']");
    if (headerUsage) {
      headerUsage.textContent = renderUsageText();
    }
    if (loginBtn) loginBtn.style.display = isLogged ? "none" : "inline-flex";
    if (refreshBtn) refreshBtn.style.display = isLogged ? "inline-flex" : "none";
    if (logoutBtn) logoutBtn.style.display = isLogged ? "inline-flex" : "none";
    generateButtons.forEach((button) => {
      button.disabled = usageReached || state.accountLoading;
    });
    quickButtons.forEach((button) => {
      button.disabled = usageReached || state.accountLoading;
    });
    variationsButtons.forEach((button) => {
      button.disabled = usageReached || state.accountLoading;
    });
    if (usageReached) {
      setToast(panel, "Voce atingiu o limite diario. Faca upgrade para continuar.");
    }
    renderPaymentPlans(panel);
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "wa-ai-rewriter-panel";
    panel.className = "wa-ai-panel";
    panel.hidden = true;

    panel.innerHTML = `
      <div class="wa-ai-panel-header">
        <div class="wa-ai-brand">
          <span class="wa-ai-brand-symbol" data-wa-ai="brand-symbol"></span>
          <div class="wa-ai-brand-copy">
            <div class="wa-ai-panel-title">Aperfei\u00e7oar IA</div>
            <div class="wa-ai-panel-subtitle">Agente de mensagens</div>
          </div>
        </div>
        <div class="wa-ai-header-side">
          <span class="wa-ai-header-usage" data-wa-ai="header-usage">Uso: --</span>
          <button type="button" class="wa-ai-close" aria-label="Fechar">X</button>
        </div>
      </div>
      <div class="wa-ai-app-shell">
        <nav class="wa-ai-rail" aria-label="Secoes do painel">
          <button type="button" class="is-active" data-wa-ai-jump="agent" aria-label="Agente">IA</button>
          <button type="button" data-wa-ai-jump="account" aria-label="Conta">Conta</button>
          <button type="button" data-wa-ai-jump="history" aria-label="Historico">Hist.</button>
        </nav>
        <div class="wa-ai-main">
          <section class="wa-ai-agent-card" data-wa-ai-section="agent">
            <div class="wa-ai-agent-status">
              <span class="wa-ai-agent-dot"></span>
              <span>Pronto para reescrever</span>
            </div>
            <textarea
              class="wa-ai-draft-input"
              data-wa-ai="draft-input"
              rows="4"
              placeholder="Digite sua mensagem aqui. Enter para aperfeiçoar, Enter novamente para enviar."
            ></textarea>
            <div class="wa-ai-primary-row" data-wa-ai="primary-row">
              <button type="button" class="wa-ai-quick" data-wa-ai="quick-improve">Aperfeicoar</button>
              <button type="button" class="wa-ai-secondary-wide" data-wa-ai="variations">Gerar variacoes</button>
            </div>
            <div class="wa-ai-results" data-wa-ai="results">
              <p class="wa-ai-empty">Digite uma mensagem no campo da pagina e acione o agente.</p>
            </div>
          </section>
          <div class="wa-ai-controls">
            <div class="wa-ai-section">
              <div class="wa-ai-section-title">Modo de uso</div>
              <div class="wa-ai-mode-toggle" data-wa-ai="context-options"></div>
            </div>
            <div class="wa-ai-section" data-wa-ai="rewrite-section">
              <div class="wa-ai-section-title">Reescrever texto</div>
              <div class="wa-ai-voice-grid" data-wa-ai="rewrite-options"></div>
            </div>
            <div class="wa-ai-section">
              <div class="wa-ai-section-title">Idioma</div>
              <select class="wa-ai-select" data-wa-ai="language"></select>
              <label class="wa-ai-toggle-line wa-ai-translation-toggle">
                <input type="checkbox" data-wa-ai="auto-translate-incoming" />
                <span>Traduzir mensagens recebidas</span>
              </label>
            </div>
            <div class="wa-ai-account" data-wa-ai-section="account">
              <div class="wa-ai-account-line">
                <span class="wa-ai-account-label">Conta</span>
                <span class="wa-ai-account-value" data-wa-ai="account-value">Carregando...</span>
              </div>
              <div class="wa-ai-account-line">
                <span class="wa-ai-badge free" data-wa-ai="plan-badge">Free</span>
                <span class="wa-ai-account-label" data-wa-ai="usage-value">Uso: --</span>
              </div>
              <div class="wa-ai-actions">
                <button type="button" class="wa-ai-action-btn primary" data-wa-ai-action="login">Conectar Google</button>
                <button type="button" class="wa-ai-action-btn" data-wa-ai-action="refresh">Atualizar status</button>
                <button type="button" class="wa-ai-action-btn warn" data-wa-ai-action="logout">Sair</button>
              </div>
            </div>
            <div class="wa-ai-section">
              <div class="wa-ai-section-title">Formas de pagamento</div>
              <div class="wa-ai-plan-grid" data-wa-ai="payment-plans"></div>
            </div>
            <div class="wa-ai-section" data-wa-ai-section="history">
              <div class="wa-ai-section-title">Historico recente</div>
              <div class="wa-ai-history-list" data-wa-ai="history-list"></div>
            </div>
            <div class="wa-ai-section">
              <div class="wa-ai-section-title">Aprendizado</div>
              <label class="wa-ai-toggle-line">
                <input type="checkbox" data-wa-ai="allow-learning" />
                <span>Aprender com minhas escolhas</span>
              </label>
              <label class="wa-ai-toggle-line">
                <input type="checkbox" data-wa-ai="allow-text-storage" />
                <span>Permitir salvar textos para melhorar analise</span>
              </label>
              <button type="button" class="wa-ai-link-button" data-wa-ai-action="privacy">Privacidade e dados</button>
            </div>
            <div class="wa-ai-toast" data-wa-ai="toast"></div>
          </div>
        </div>
      </div>
    `;

    panel.querySelector(".wa-ai-close")?.addEventListener("click", () => hidePanel());
    panel.querySelector("[data-wa-ai='brand-symbol']")?.appendChild(createPremiumSymbol("sm"));
    panel.querySelectorAll("[data-wa-ai-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = panel.querySelector(`[data-wa-ai-section='${button.dataset.waAiJump}']`);
        if (target) target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        panel.querySelectorAll("[data-wa-ai-jump]").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
      });
    });

    renderContextOptions(panel);
    renderRewriteOptions(panel);
    renderLanguageOptions(panel);
    renderTranslationSettings(panel);
    renderHistory(panel);
    renderLearningSettings(panel);

    panel.querySelector("[data-wa-ai='quick-improve']")?.addEventListener("click", () => {
      handleQuickImprove(panel);
    });
    panel.querySelector("[data-wa-ai='variations']")?.addEventListener("click", () => {
      handleGenerateVariations(panel);
    });
    panel.querySelector("[data-wa-ai='draft-input']")?.addEventListener("input", () => {
      state.panelDraftReady = false;
    });
    panel.querySelector("[data-wa-ai='draft-input']")?.addEventListener("keydown", (event) => {
      handleDraftKeydown(event, panel);
    });
    panel.querySelector("[data-wa-ai='language']")?.addEventListener("change", (event) => {
      state.selectedLanguage = event.target.value || CONFIG.DEFAULT_LANGUAGE;
      savePanelPreferences().catch(() => null);
      if (state.settings.autoTranslateIncoming) scheduleIncomingTranslationScan();
    });
    panel.querySelector("[data-wa-ai='auto-translate-incoming']")?.addEventListener("change", (event) => {
      state.settings.autoTranslateIncoming = Boolean(event.target.checked);
      savePanelPreferences().catch(() => null);
      setToast(
        panel,
        state.settings.autoTranslateIncoming
          ? "Traducao automatica de recebidas ativada."
          : "Traducao automatica de recebidas desativada."
      );
      if (state.settings.autoTranslateIncoming) scheduleIncomingTranslationScan();
    });
    panel.querySelector("[data-wa-ai='allow-learning']")?.addEventListener("change", async (event) => {
      state.learningSettings.allowLearning = Boolean(event.target.checked);
      await saveLearningSettings().catch(() => null);
      await syncLearningPreferences();
      setToast(panel, state.learningSettings.allowLearning ? "Aprendizado ativado." : "Aprendizado desativado.");
    });
    panel.querySelector("[data-wa-ai='allow-text-storage']")?.addEventListener("change", async (event) => {
      state.learningSettings.allowTextStorage = Boolean(event.target.checked);
      await saveLearningSettings().catch(() => null);
      await syncLearningPreferences();
      setToast(
        panel,
        state.learningSettings.allowTextStorage
          ? "Armazenamento de texto ativado."
          : "Textos nao serao salvos no backend."
      );
    });
    panel.querySelector("[data-wa-ai-action='login']")?.addEventListener("click", () => {
      handleGoogleLogin(panel);
    });
    panel.querySelector("[data-wa-ai-action='refresh']")?.addEventListener("click", () => {
      refreshAccountState(panel, true);
    });
    panel.querySelector("[data-wa-ai-action='logout']")?.addEventListener("click", () => {
      handleLogout(panel);
    });
    panel.querySelector("[data-wa-ai-action='privacy']")?.addEventListener("click", () => {
      window.open(chrome.runtime.getURL("privacy-policy.html"), "_blank", "noopener,noreferrer");
    });

    applyAccountState(panel);
    return panel;
  }

  function renderLoading(panel, message = "Gerando reescrita...") {
    setPrimaryRowVisible(panel, true);
    const results = panel.querySelector("[data-wa-ai='results']");
    if (!results) return;
    results.innerHTML = `
      <div class="wa-ai-loader">
        <span class="wa-ai-spinner" aria-hidden="true"></span>
        <span>${message}</span>
      </div>
    `;
  }

  function renderError(panel, message) {
    setPrimaryRowVisible(panel, true);
    const results = panel.querySelector("[data-wa-ai='results']");
    if (!results) return;
    results.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.className = "wa-ai-empty";
    paragraph.textContent = message;
    results.appendChild(paragraph);
  }

  function renderLimitReached(panel) {
    setPrimaryRowVisible(panel, true);
    const results = panel.querySelector("[data-wa-ai='results']");
    if (!results) return;
    results.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "wa-ai-limit-card";
    const message = document.createElement("p");
    message.textContent = "Voce atingiu o limite diario.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wa-ai-use";
    button.appendChild(createPremiumSymbol("sm"));
    button.appendChild(document.createTextNode("Upgrade"));
    button.addEventListener("click", () => handleUpgrade(panel, "premium"));
    wrapper.appendChild(message);
    wrapper.appendChild(button);
    results.appendChild(wrapper);
  }

  function renderSuggestions(panel, suggestions) {
    setPrimaryRowVisible(panel, true);
    const results = panel.querySelector("[data-wa-ai='results']");
    if (!results) return;
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      results.innerHTML = "<p class='wa-ai-empty'>Nenhuma sugestao foi retornada.</p>";
      return;
    }

    results.innerHTML = "";
    suggestions.forEach((item) => {
      const card = document.createElement("article");
      card.className = "wa-ai-item";
      const styleLabel = cleanText(item.label || item.style || "Sugestao");
      const goal = cleanText(item.strategy || "Foco em resultado");
      const suggestionText = cleanText(item.text || "");

      const meta = document.createElement("div");
      meta.className = "wa-ai-meta";

      const label = document.createElement("span");
      label.className = "wa-ai-label";
      label.textContent = styleLabel;

      const goalText = document.createElement("span");
      goalText.className = "wa-ai-goal";
      goalText.textContent = goal;

      const text = document.createElement("p");
      text.className = "wa-ai-text";
      text.textContent = suggestionText || "(vazio)";

      const useButton = document.createElement("button");
      useButton.type = "button";
      useButton.className = "wa-ai-use";
      useButton.textContent = "Usar texto";
      useButton.addEventListener("click", async () => {
        if (!suggestionText) return;
        if (!(await setComposerText(suggestionText))) {
          setToast(panel, getApplyFailureMessage("inserir"));
          return;
        }
        setToast(panel, "Texto aplicado. Revise e envie.");
        sendTelemetryEvent({
          eventName: "suggestion_used",
          context: state.currentRequestContext,
          objective: state.currentRequestObjective,
          style: item.style || "",
          promptVariant: state.currentPromptVariant,
          metadata: {
            suggestionLength: suggestionText.length
          }
        });
      });

      meta.appendChild(label);
      meta.appendChild(goalText);
      card.appendChild(meta);
      card.appendChild(text);
      card.appendChild(useButton);
      results.appendChild(card);
    });
  }

  function isWritableComposer(element) {
    if (!element || !document.contains(element) || !isVisible(element) || element.readOnly) return false;
    if (state.panel?.contains(element) || state.root?.contains(element)) return false;
    return (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLInputElement ||
      element.isContentEditable ||
      element.getAttribute("contenteditable") !== null
    );
  }

  function getWritableComposer() {
    const current = [state.targetComposer, state.composer].find(isWritableComposer);
    if (current) return current;

    const composer = findComposer();
    if (composer) {
      state.composer = composer;
      state.targetComposer = composer;
    }
    return composer;
  }

  function normalizeInsertedText(text) {
    return cleanText(text)
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isComposerTextUpdated(composer, text) {
    return normalizeInsertedText(getComposerText(composer)) === normalizeInsertedText(text);
  }

  function getApplyFailureMessage(action = "inserir") {
    return `Nao consegui ${action}. Clique no campo de texto e tente novamente.`;
  }

  function dispatchComposerEvents(composer) {
    composer.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    composer.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  function selectComposerContents(element) {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function placeCaretAtEnd(element) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function setNativeInputValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
  }

  function clearContentEditableText(composer) {
    try {
      composer.focus();
      selectComposerContents(composer);
      if (document.queryCommandSupported?.("delete")) {
        document.execCommand("delete", false, null);
      }
    } catch {
      // Continua com limpeza direta abaixo.
    }
    if (cleanText(getComposerText(composer))) composer.replaceChildren();
    dispatchComposerEvents(composer);
  }

  function setContentEditableDomText(composer, text) {
    composer.focus();
    composer.replaceChildren();
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) composer.appendChild(document.createElement("br"));
      composer.appendChild(document.createTextNode(line));
    });
    placeCaretAtEnd(composer);
    dispatchComposerEvents(composer);
    composer.focus();
    placeCaretAtEnd(composer);
    return isComposerTextUpdated(composer, text);
  }

  async function replaceInputText(composer, text) {
    composer.focus();
    setNativeInputValue(composer, text);
    dispatchComposerEvents(composer);
    composer.focus();
    return isComposerTextUpdated(composer, text);
  }

  function isRepeatedInsertion(composer, text) {
    const current = normalizeInsertedText(getComposerText(composer));
    const expected = normalizeInsertedText(text);
    if (!current || !expected || current === expected) return false;
    return current.split(expected).join("").trim() === "";
  }

  function tryExecCommandInsertOnce(composer, text) {
    try {
      composer.focus();
      selectComposerContents(composer);
      const inserted = document.queryCommandSupported?.("insertText")
        ? document.execCommand("insertText", false, text)
        : false;
      if (!inserted) return false;
      placeCaretAtEnd(composer);
      if (isRepeatedInsertion(composer, text)) return setContentEditableDomText(composer, text);
      return isComposerTextUpdated(composer, text);
    } catch {
      return false;
    }
  }

  async function replaceContentEditableText(composer, text) {
    const editable =
      composer.isContentEditable
        ? composer
        : composer.closest?.("[contenteditable='true'], [contenteditable]:not([contenteditable='false'])") || composer;
    state.targetComposer = editable;
    editable.focus();
    if (setContentEditableDomText(editable, text)) return true;
    clearContentEditableText(editable);
    return tryExecCommandInsertOnce(editable, text);
  }

  async function setComposerText(text) {
    const composer = getWritableComposer();
    if (!composer) return false;

    const normalized = String(text || "").replace(/\r/g, "");
    if (!cleanText(normalized)) return false;

    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const replaced = await replaceInputText(composer, normalized);
      if (replaced) return true;
      return false;
    }

    const replaced = await replaceContentEditableText(composer, normalized);
    if (replaced) return true;
    return false;
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  function getFriendlyRequestError(error) {
    const message = String(error?.message || "");
    if (error?.name === "AbortError") {
      return "A IA demorou para responder. Tente novamente.";
    }
    if (message.includes("Failed to fetch") || error instanceof TypeError) {
      return `Nao consegui conectar ao backend (${state.settings.apiBaseUrl}). Verifique se o backend esta rodando e recarregue a extensao.`;
    }
    return message || "Erro ao aperfeicoar texto.";
  }

  function buildAuthHeaders() {
    const headers = {
      "X-Extension-Id": chrome.runtime.id,
      "X-Anonymous-Id": state.anonymousId
    };
    const token = getEffectiveToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function sendTelemetryEvent(event) {
    if (!getEffectiveToken()) return;
    try {
      await fetchWithTimeout(getApiUrl("/api/v1/telemetry/event"), {
        method: "POST",
        headers: {
          ...buildAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });
    } catch {
      // Telemetria nao pode bloquear UX.
    }
  }

  async function refreshAccountState(panel, showToast) {
    if (!getEffectiveToken()) {
      applyAccountState(panel);
      if (showToast) setToast(panel, "Modo Free ativo sem login.");
      return;
    }

    state.accountLoading = true;
    applyAccountState(panel);
    setPanelLoading(panel, true);
    try {
      const response = await fetchWithTimeout(getApiUrl("/api/v1/auth/me"), {
        method: "GET",
        headers: buildAuthHeaders()
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          await clearSession();
          applyAccountState(panel);
          renderError(panel, "Sessao expirada. Conecte novamente.");
          return;
        }
        throw new Error(body.error || "Falha ao carregar conta.");
      }

      const session = {
        ...(state.session || {}),
        email: body.user?.email || state.session?.email || "",
        plan: body.user?.plan || state.session?.plan || "free",
        updatedAt: Date.now(),
        token: state.session?.token || ""
      };
      await saveSession(session);
      state.usage = body.usage || null;
      applyAccountState(panel);
      if (showToast) setToast(panel, "Conta atualizada.");
    } catch (error) {
      if (error.name === "AbortError") {
        setToast(panel, "Tempo excedido ao consultar conta.");
      } else {
        setToast(panel, error.message || "Erro ao consultar conta.");
      }
    } finally {
      state.accountLoading = false;
      applyAccountState(panel);
      setPanelLoading(panel, false);
    }
  }

  async function handleGoogleLogin(panel) {
    const url = `${getApiUrl("/auth/google/start")}?ext_id=${encodeURIComponent(chrome.runtime.id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setToast(panel, "Conclua o login na nova aba e depois clique em atualizar status.");
  }

  async function handleLogout(panel) {
    setPanelLoading(panel, true);
    try {
      if (getEffectiveToken()) {
        await fetchWithTimeout(getApiUrl("/api/v1/auth/logout"), {
          method: "POST",
          headers: {
            ...buildAuthHeaders(),
            "Content-Type": "application/json"
          },
          body: "{}"
        }).catch(() => null);
      }
      await clearSession();
      applyAccountState(panel);
      renderError(panel, "Sessao encerrada.");
      setToast(panel, "Voce saiu da conta.");
    } finally {
      setPanelLoading(panel, false);
    }
  }

  async function handleUpgrade(panel, planId = "premium") {
    if (!getEffectiveToken()) {
      setToast(panel, "Conecte sua conta antes de assinar.");
      return;
    }

    const plan = getPlanMeta(planId);
    setPanelLoading(panel, true);
    try {
      const response = await fetchWithTimeout(getApiUrl("/api/v1/billing/checkout"), {
        method: "POST",
        headers: {
          ...buildAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCountry: inferBillingCountry()
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Falha ao abrir checkout.");

      if (body.alreadyPremium) {
        setToast(panel, `Sua conta ja esta no plano ${plan.label}.`);
        return;
      }
      if (!body.checkoutUrl) throw new Error("Checkout indisponivel.");

      sendTelemetryEvent({
        eventName: "checkout_started",
        context: state.selectedContext,
        objective: state.selectedObjective,
        metadata: {
          planId: body.planId || plan.id,
          amount: body.amount || "",
          amountLabel: body.amountLabel || getPlanPriceLabel(plan),
          currency: body.currency || (isBrazilBilling() ? "brl" : "usd")
        }
      });
      window.open(body.checkoutUrl, "_blank", "noopener,noreferrer");
      setToast(
        panel,
        `Checkout ${plan.label} aberto (${body.amountLabel || getPlanPriceLabel(plan)}). Depois clique em atualizar status.`
      );
    } catch (error) {
      setToast(panel, error.message || "Erro ao abrir checkout.");
    } finally {
      setPanelLoading(panel, false);
      applyAccountState(panel);
    }
  }

  async function requestSuggestions(payload) {
    pruneCache();
    const cacheKey = buildCacheKey(payload);
    const cached = state.cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt <= CONFIG.CACHE_TTL_MS) {
      return { suggestions: cached.value, usage: state.usage };
    }

    const response = await fetchWithTimeout(getApiUrl("/api/v1/rewrite"), {
      method: "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || "Falha ao reescrever mensagem.");
      error.status = response.status;
      error.payload = body;
      throw error;
    }
    if (!Array.isArray(body.suggestions)) {
      throw new Error("Resposta invalida da API.");
    }

    state.cache.set(cacheKey, {
      createdAt: Date.now(),
      value: body.suggestions
    });
    state.usage = body.meta?.usage || state.usage;
    state.currentPromptVariant = body.meta?.promptVariant || "A";
    return { suggestions: body.suggestions, usage: state.usage };
  }

  async function requestImprovedText(payload) {
    const response = await fetchWithTimeout(getApiUrl("/api/v1/ai/improve-text"), {
      method: "POST",
      headers: {
        ...buildAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || body.error || "Falha ao melhorar mensagem.");
      error.status = response.status;
      error.payload = body;
      throw error;
    }
    if (!body.improvedText) {
      throw new Error("Resposta invalida da IA.");
    }

    state.usage = body.usage || state.usage;
    return body;
  }

  function buildImprovePayload(text, { quick = false, variations = false } = {}) {
    const classification = classifyMessage(text);
    const style = state.selectedAiStyle || CONFIG.DEFAULT_AI_STYLE;
    return {
      text,
      classification,
      metadata: getPlatformMetadata(),
      userPreferences: {
        language:
          state.selectedObjective === "translate" && state.selectedLanguage === "auto"
            ? "pt-BR"
            : state.selectedLanguage,
        context: state.selectedContext,
        objective: state.selectedObjective,
        style,
        quick,
        maxLength: getLengthPreference(),
        generateVariations: Boolean(variations),
        allowLearning: state.learningSettings.allowLearning,
        allowTextStorage: state.learningSettings.allowTextStorage
      }
    };
  }

  function normalizeVariationForPanel(variation, index) {
    if (typeof variation === "string") {
      return {
        style: "",
        label: `Variacao ${index + 1}`,
        text: cleanText(variation)
      };
    }

    if (!variation || typeof variation !== "object") {
      return {
        style: "",
        label: `Variacao ${index + 1}`,
        text: ""
      };
    }

    return {
      style: String(variation.style || "").trim(),
      label: String(variation.label || `Variacao ${index + 1}`).trim(),
      text: cleanText(variation.text || variation.improvedText || variation.value || variation.message || variation.content || "")
    };
  }

  function renderImproveResult(panel, { originalText, improvedText, variations = [] }) {
    setPrimaryRowVisible(panel, true);
    const results = panel.querySelector("[data-wa-ai='results']");
    if (!results) return;
    const validation = validateImprovedText(originalText, improvedText);
    if (!validation.isValid) {
      renderError(panel, "A resposta ficou longa ou artificial. Tente novamente.");
      return;
    }

    results.innerHTML = "";

    const card = document.createElement("article");
    card.className = "wa-ai-conversation-card";

    const originalBlock = document.createElement("div");
    originalBlock.className = "wa-ai-message-block";
    const originalLabel = document.createElement("span");
    originalLabel.className = "wa-ai-message-label";
    originalLabel.textContent = "Original";
    const originalTextNode = document.createElement("p");
    originalTextNode.className = "wa-ai-message-text";
    originalTextNode.textContent = originalText;
    originalBlock.appendChild(originalLabel);
    originalBlock.appendChild(originalTextNode);

    const improvedBlock = document.createElement("div");
    improvedBlock.className = "wa-ai-message-block improved";
    const improvedLabel = document.createElement("span");
    improvedLabel.className = "wa-ai-message-label";
    improvedLabel.textContent = "Melhorado";
    const improvedTextNode = document.createElement("p");
    improvedTextNode.className = "wa-ai-message-text";
    improvedTextNode.textContent = improvedText;
    improvedBlock.appendChild(improvedLabel);
    improvedBlock.appendChild(improvedTextNode);
    let selectedImprovedText = improvedText;

    const actions = document.createElement("div");
    actions.className = "wa-ai-result-actions";

    const replaceButton = document.createElement("button");
    replaceButton.type = "button";
    replaceButton.className = "wa-ai-use";
    replaceButton.textContent = "Substituir";
    replaceButton.addEventListener("click", async () => {
      if (!(await setComposerText(selectedImprovedText))) {
        setToast(panel, getApplyFailureMessage("substituir"));
        return;
      }
      setToast(panel, "Texto substituido. Revise antes de enviar.");
      trackLearningEvent("suggestion_accepted");
      trackLearningEvent("text_inserted");
    });

    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "wa-ai-mini-action";
    retryButton.textContent = "Tentar novamente";
    retryButton.addEventListener("click", () => {
      trackLearningEvent("retry_clicked");
      runRewrite(panel, { retry: true });
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "wa-ai-mini-action";
    cancelButton.textContent = "Cancelar";
    cancelButton.addEventListener("click", () => {
      trackLearningEvent("suggestion_rejected");
      hidePanel();
    });

    actions.appendChild(replaceButton);
    actions.appendChild(retryButton);
    actions.appendChild(cancelButton);

    const feedback = document.createElement("div");
    feedback.className = "wa-ai-feedback";
    ["up", "down"].forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = value === "up" ? "👍" : "👎";
      button.setAttribute("aria-label", value === "up" ? "Feedback positivo" : "Feedback negativo");
      button.addEventListener("click", async () => {
        await saveFeedback(value).catch(() => null);
        await trackLearningEvent(value === "up" ? "feedback_positive" : "feedback_negative");
        setToast(panel, "Feedback registrado.");
      });
      feedback.appendChild(button);
    });

    card.appendChild(originalBlock);
    card.appendChild(improvedBlock);
    if (Array.isArray(variations) && variations.length) {
      const variationsWrapper = document.createElement("div");
      variationsWrapper.className = "wa-ai-variations";
      variations.map(normalizeVariationForPanel).filter((variation) => variation.text).forEach((variation, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "wa-ai-variation-card";
        option.setAttribute("aria-pressed", "false");
        option.innerHTML = `<strong></strong><span></span>`;
        option.querySelector("strong").textContent = variation.label || "Variacao";
        option.querySelector("span").textContent = variation.text || "";
        option.addEventListener("click", () => {
          if (!variation.text) return;
          selectedImprovedText = variation.text;
          improvedTextNode.textContent = variation.text;
          setDraftText(panel, variation.text);
          state.panelDraftReady = true;
          replaceButton.textContent = "Substituir com esta versao";
          variationsWrapper
            .querySelectorAll(".wa-ai-variation-card")
            .forEach((item) => {
              item.classList.remove("is-active");
              item.setAttribute("aria-pressed", "false");
            });
          option.classList.add("is-active");
          option.setAttribute("aria-pressed", "true");
          setToast(panel, "Variacao selecionada. Clique em Substituir para aplicar.");
          trackLearningEvent("variation_selected", {
            variationSelected: index,
            variationStyle: variation.style || "",
            styleSelected: variation.style || state.selectedAiStyle
          });
        });
        variationsWrapper.appendChild(option);
      });
      card.appendChild(variationsWrapper);
    }

    card.appendChild(actions);
    card.appendChild(feedback);
    results.appendChild(card);
    trackLearningEvent("suggestion_shown", {
      variationCount: Array.isArray(variations) ? variations.length : 0
    });
  }

  async function runRewrite(panel, { quick = false, variations = false, retry = false, textOverride = "" } = {}) {
    if (isUsageLimitReached()) {
      renderLimitReached(panel);
      setToast(panel, `Faca upgrade para continuar (${getPremiumPriceLabel()}).`);
      return;
    }

    const composer = state.composer || findComposer();
    if (!composer) {
      renderError(panel, "Campo de mensagem nao encontrado.");
      return;
    }
    state.targetComposer = composer;

    const draftText = getDraftText(panel);
    const text = cleanText(textOverride || draftText || getComposerText(composer));
    if (!text) {
      renderError(panel, "Digite uma mensagem no campo da extensao antes de reescrever.");
      focusDraftInput({ prefill: false });
      return;
    }

    const payload = buildImprovePayload(text, { quick, variations });
    state.currentRequestContext = "ai_improve_text";
    state.currentRequestObjective = payload.userPreferences.objective || payload.userPreferences.style;
    state.lastImproveRequest = payload;

    setPanelLoading(panel, true);
    state.panelDraftReady = false;
    setToast(panel, "");
    renderLoading(
      panel,
      variations
        ? "Gerando variacoes..."
        : retry
          ? "Tentando novamente..."
          : quick
            ? "Aperfeicoando texto..."
            : "Melhorando mensagem..."
    );

    try {
      const body = await requestImprovedText(payload);
      const validation = validateImprovedText(text, body.improvedText);
      if (!validation.isValid) {
        throw new Error("A resposta ficou longa ou artificial. Tente novamente.");
      }
      state.lastImproveResult = body;
      await addHistoryItem(text, body.improvedText);
      setDraftText(panel, body.improvedText);
      state.panelDraftReady = Boolean(body.improvedText);
      renderImproveResult(panel, {
        originalText: text,
        improvedText: body.improvedText,
        variations: body.variations || []
      });
      applyAccountState(panel);
      if (getEffectiveToken()) {
        sendTelemetryEvent({
          eventName: "rewrite_generated",
          context: "ai_improve_text",
          objective: payload.userPreferences.objective || payload.userPreferences.style,
          promptVariant: state.currentPromptVariant,
          metadata: {
            quick,
            variations,
            classification: payload.classification
          }
        });
      }
    } catch (error) {
      if (error.status === 401) {
        await clearSession();
        applyAccountState(panel);
        renderError(panel, "Sessao expirada. Conecte novamente.");
      } else if (error.status === 402 || error.status === 429 || error.payload?.error === "DAILY_LIMIT_REACHED") {
        state.usage = error.payload?.usage || state.usage;
        applyAccountState(panel);
        renderLimitReached(panel);
        setToast(panel, `Upgrade disponivel por ${getPremiumPriceLabel()}.`);
      } else if (error.name === "AbortError") {
        renderError(panel, getFriendlyRequestError(error));
      } else {
        renderError(panel, getFriendlyRequestError(error));
      }
    } finally {
      setPanelLoading(panel, false);
      applyAccountState(panel);
    }
  }

  async function handleGenerate(panel) {
    await runRewrite(panel);
  }

  async function handleQuickImprove(panel) {
    await runRewrite(panel, { quick: true });
  }

  async function handleGenerateVariations(panel) {
    await runRewrite(panel, { variations: true });
  }

  async function clickCurrentSendButton() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const button = findSendButton(document);
      const disabled = button?.disabled || button?.getAttribute("aria-disabled") === "true";
      if (button && !disabled) {
        button.click();
        return true;
      }
      await sleep(80);
    }
    return false;
  }

  async function sendDraftToRecipient(panel) {
    const text = getDraftText(panel);
    if (!text) {
      renderError(panel, "Digite uma mensagem antes de enviar.");
      focusDraftInput({ prefill: false });
      return;
    }

    if (!(await setComposerText(text))) {
      setToast(panel, getApplyFailureMessage("enviar"));
      return;
    }

    if (await clickCurrentSendButton()) {
      state.panelDraftReady = false;
      setDraftText(panel, "");
      setToast(panel, "Mensagem melhorada enviada.");
      trackLearningEvent("suggestion_accepted");
      trackLearningEvent("text_inserted");
      return;
    }

    setToast(panel, "Texto melhorado aplicado. Use o botao de enviar da conversa.");
  }

  function handleDraftKeydown(event, panel) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();

    if (state.panelDraftReady && getDraftText(panel)) {
      sendDraftToRecipient(panel);
      return;
    }

    runRewrite(panel, { quick: true, textOverride: getDraftText(panel) });
  }

  async function openAdjustmentPanel(panel) {
    showPanel();
    await refreshAccountState(panel, false);
  }

  function getControlsContainer(composer) {
    return composer.closest("footer") || document.body;
  }

  function findSendButton(container = document) {
    const scopes = container && container !== document ? [container, document] : [document];
    for (const scope of scopes) {
      const button = scope.querySelector("button [data-icon='send']")?.closest("button");
      if (isVisible(button)) return button;
    }
    return null;
  }

  function updateFloatingControls(composer) {
    if (!state.root) return;

    if (state.root.classList.contains("wa-ai-send-root")) {
      const sendButton = findSendButton(state.footer);
      const targetRect = (sendButton || composer)?.getBoundingClientRect();
      if (!targetRect) return;

      const rootRect = state.root.getBoundingClientRect();
      const rootWidth = rootRect.width || 44;
      const rootHeight = rootRect.height || 44;
      const top = Math.max(8, targetRect.top - rootHeight - 4);
      const left = Math.min(
        Math.max(8, targetRect.left + targetRect.width / 2 - rootWidth / 2),
        window.innerWidth - rootWidth - 8
      );
      state.root.style.top = `${top}px`;
      state.root.style.left = `${left}px`;
      return;
    }

    if (!state.root.classList.contains("wa-ai-floating-root")) return;
    const rect = composer.getBoundingClientRect();
    const top = Math.max(8, rect.top - 44);
    const left = Math.min(Math.max(8, rect.right - 150), window.innerWidth - 170);
    state.root.style.top = `${top}px`;
    state.root.style.left = `${left}px`;
  }

  function ensureControls(composer) {
    const container = getControlsContainer(composer);

    if (state.footer && state.footer !== container) teardownControls();

    state.footer = container;
    state.composer = composer;
    if (!state.panelOpen) state.targetComposer = composer;

    if (container !== document.body && window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const sendButton = findSendButton(container);
    const shouldAnchorAboveSend = isWhatsAppWeb() && Boolean(sendButton);

    let root = container.querySelector("#wa-ai-rewriter-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "wa-ai-rewriter-root";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "wa-ai-button";
      button.setAttribute("aria-label", "Aperfeicoar mensagem");
      button.appendChild(createPremiumSymbol("button"));
      button.title = "Clique para escrever. Enter aperfeicoa; Enter novamente envia.";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        showPanel();
        focusDraftInput({ prefill: true });
      });
      button.addEventListener("contextmenu", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await openAdjustmentPanel(state.panel);
      });
      root.appendChild(button);

      if (container !== document.body && sendButton?.parentElement) {
        sendButton.parentElement.insertAdjacentElement("beforebegin", root);
      } else {
        container.appendChild(root);
      }
    }
    root.classList.toggle("wa-ai-send-root", shouldAnchorAboveSend);
    root.classList.toggle("wa-ai-floating-root", container === document.body && !shouldAnchorAboveSend);
    if (!shouldAnchorAboveSend && container !== document.body) {
      root.style.top = "";
      root.style.left = "";
    }
    state.root = root;

    let panel = container.querySelector("#wa-ai-rewriter-panel");
    if (!panel) {
      panel = createPanel();
      if (container === document.body) panel.classList.add("wa-ai-floating-panel");
      container.appendChild(panel);
    }
    state.panel = panel;
    updateFloatingControls(composer);
    applyAccountState(panel);
  }

  function teardownControls() {
    if (state.root?.isConnected) state.root.remove();
    if (state.panel?.isConnected) state.panel.remove();
    state.root = null;
    state.panel = null;
    state.footer = null;
    state.composer = null;
    state.targetComposer = null;
    state.panelOpen = false;
  }

  function showPanel() {
    if (!state.panel || !state.composer || !document.contains(state.composer)) return;
    state.panel.hidden = false;
    state.panelOpen = true;
    focusDraftInput({ prefill: true });
  }

  function hidePanel() {
    if (!state.panel) return;
    state.panel.hidden = true;
    state.panelOpen = false;
  }

  function refresh() {
    const composer = findComposer();
    if (!composer) {
      teardownControls();
      return;
    }
    ensureControls(composer);
    scheduleIncomingTranslationScan();
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = setTimeout(refresh, 120);
  }

  function handleDocumentClick(event) {
    if (!state.panelOpen || !state.panel || !state.root) return;
    // O painel fica aberto para permitir digitar, reescrever e enviar com Enter.
  }

  function startObserver() {
    if (state.observer) return;
    state.observer = new MutationObserver(() => {
      scheduleRefresh();
      scheduleIncomingTranslationScan();
    });
    state.observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("focus", scheduleRefresh, true);
    window.addEventListener("scroll", scheduleRefresh, true);
    window.addEventListener("resize", scheduleRefresh, true);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) scheduleRefresh();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.wa_ai_session) {
        state.session = changes.wa_ai_session.newValue || null;
        if (state.panel) applyAccountState(state.panel);
        return;
      }
      if (areaName === "sync" && changes.wa_ai_options) {
        loadOptions().then(() => {
          if (state.panel) {
            renderContextOptions(state.panel);
            renderRewriteOptions(state.panel);
            renderLanguageOptions(state.panel);
            renderTranslationSettings(state.panel);
            applyAccountState(state.panel);
          }
          scheduleIncomingTranslationScan();
        });
      }
    });

    state.heartbeat = window.setInterval(scheduleRefresh, 3000);
  }

  async function boot() {
    await loadOptions().catch(() => {});
    await loadLearningSettings().catch(() => {});
    await loadAnonymousId().catch(() => {});
    await loadHistory().catch(() => {});
    await loadSession();
    await syncLearningPreferences();
    startObserver();
    refresh();
    scheduleIncomingTranslationScan();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        boot();
      },
      { once: true }
    );
  } else {
    boot();
  }
})();
