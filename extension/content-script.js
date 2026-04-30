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
    PREMIUM_PRICE_LABEL: runtimeConfig.PREMIUM_PRICE_LABEL || "R$49,90",
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
    { id: "free", label: "Free", priceLabel: "10 por dia" },
    { id: "personal", label: "Uso Pessoal/Recreativo", priceBrlCents: 1990 },
    { id: "business", label: "Uso Empresarial", priceBrlCents: 3990 },
    { id: "premium", label: "Uso Premium", priceBrlCents: 4990 }
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
    lastSticker: null,
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
    sideDockTopPercent: 50,
    sideDockDrag: null,
    suppressDockClickUntil: 0,
    settings: {
      apiBaseUrl: CONFIG.API_BASE,
      manualToken: "",
      defaultPlan: "free",
      favoriteStyles: [...CONFIG.DEFAULT_STYLES],
      defaultObjective: CONFIG.DEFAULT_OBJECTIVE,
      defaultLanguage: CONFIG.DEFAULT_LANGUAGE,
      defaultAiStyle: CONFIG.DEFAULT_AI_STYLE,
      autoTranslateIncoming: false,
      darkMode: false
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

  function clampSideDockTopPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 50;
    return Math.min(88, Math.max(12, number));
  }

  async function loadSideDockPosition() {
    const data = await chrome.storage.local.get(["wa_ai_side_dock_position"]);
    state.sideDockTopPercent = clampSideDockTopPercent(data.wa_ai_side_dock_position?.topPercent);
  }

  async function saveSideDockPosition() {
    await chrome.storage.local.set({
      wa_ai_side_dock_position: {
        topPercent: state.sideDockTopPercent,
        updatedAt: Date.now()
      }
    });
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
      autoTranslateIncoming: options.autoTranslateIncoming === true,
      darkMode: options.darkMode === true
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
        autoTranslateIncoming: state.settings.autoTranslateIncoming === true,
        darkMode: state.settings.darkMode === true
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
      "[data-wa-ai-action], [data-wa-ai='generate'], [data-wa-ai='quick-improve'], [data-wa-ai='variations'], [data-wa-ai='sticker-response'], [data-plan-id]"
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

  function applyTheme(panel = state.panel) {
    if (!panel) return;
    panel.classList.toggle("is-dark", state.settings.darkMode === true);
  }

  function renderThemeSettings(panel) {
    const darkMode = panel?.querySelector("[data-wa-ai='dark-mode']");
    if (darkMode) darkMode.checked = state.settings.darkMode === true;
    applyTheme(panel);
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
    const planMeta = getPlanMeta(plan);
    const label = plan === "pro" ? "Pro" : planMeta.label;
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
    const stickerButtons = panel.querySelectorAll("[data-wa-ai='sticker-response']");

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
    stickerButtons.forEach((button) => {
      button.disabled = state.accountLoading;
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
              <button type="button" class="wa-ai-secondary-wide wa-ai-sticker-response" data-wa-ai="sticker-response">Gerar figurinha da minha resposta</button>
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
            <div class="wa-ai-section wa-ai-theme-section">
              <label class="wa-ai-toggle-line">
                <input type="checkbox" data-wa-ai="dark-mode" />
                <span>Modo escuro</span>
              </label>
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
    renderThemeSettings(panel);
    renderHistory(panel);
    renderLearningSettings(panel);

    panel.querySelector("[data-wa-ai='quick-improve']")?.addEventListener("click", () => {
      handleQuickImprove(panel);
    });
    panel.querySelector("[data-wa-ai='variations']")?.addEventListener("click", () => {
      handleGenerateVariations(panel);
    });
    panel.querySelector("[data-wa-ai='sticker-response']")?.addEventListener("click", () => {
      handleGenerateResponseSticker(panel);
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
    panel.querySelector("[data-wa-ai='dark-mode']")?.addEventListener("change", (event) => {
      state.settings.darkMode = Boolean(event.target.checked);
      renderThemeSettings(panel);
      savePanelPreferences().catch(() => null);
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

  function escapeStickerSvgText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wrapStickerText(text, maxChars = 25, maxLines = 3) {
    const words = cleanText(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
        return;
      }
      if (current) lines.push(current);
      current = word;
    });
    if (current) lines.push(current);
    const limited = lines.slice(0, maxLines);
    if (lines.length > maxLines && limited.length) {
      limited[limited.length - 1] = `${limited[limited.length - 1].replace(/[.,;:!?]+$/g, "")}...`;
    }
    return limited.length ? limited : ["Figurinha"];
  }

  function getStickerTheme(text) {
    const normalized = normalizeForHeuristics(text);
    const score = (words) => countMatches(normalized, words);
    const has = (words) => score(words) > 0;
    const homeScore = score(["casa", "imovel", "apartamento", "terreno", "moradia", "financiamento", "chave", "corretor"]);
    const buyScore = score(["comprar", "compra", "interesse", "quero", "gostaria", "procurando", "buscando", "visitar", "negociar"]);
    const candidates = [
      {
        id: "home_purchase",
        title: "Chave na mao",
        primary: "#059669",
        secondary: "#fbbf24",
        weight: homeScore > 0 && buyScore > 0 ? homeScore * 5 + buyScore * 2 : 0
      },
      {
        id: "payment",
        title: "Conta em dia",
        primary: "#2563eb",
        secondary: "#86efac",
        weight: score(["pagamento", "pagar", "boleto", "fatura", "pix", "debito", "vencido", "pendente", "cobrar", "em aberto"]) * 5
      },
      {
        id: "meeting",
        title: "Agenda marcada",
        primary: "#7c3aed",
        secondary: "#c4b5fd",
        weight: score(["reuniao", "agenda", "horario", "marcar", "agendar", "call", "videochamada", "encontro"]) * 4
      },
      {
        id: "delivery",
        title: "Pedido a caminho",
        primary: "#ea580c",
        secondary: "#fdba74",
        weight: score(["pedido", "entrega", "enviar", "envio", "chegou", "produto", "pacote", "rastreamento", "transportadora"]) * 4
      },
      {
        id: "food",
        title: "Hora da fome",
        primary: "#dc2626",
        secondary: "#fde047",
        weight: score(["comida", "almoco", "jantar", "lanche", "pizza", "hamburguer", "restaurante", "cardapio", "delivery"]) * 4
      },
      {
        id: "travel",
        title: "Partiu viagem",
        primary: "#0284c7",
        secondary: "#bae6fd",
        weight: score(["viagem", "viajar", "hotel", "passagem", "voo", "aviao", "ferias", "destino", "aeroporto"]) * 4
      },
      {
        id: "study",
        title: "Modo estudo",
        primary: "#9333ea",
        secondary: "#f0abfc",
        weight: score(["estudar", "estudo", "aula", "prova", "curso", "faculdade", "livro", "aprender", "professor"]) * 4
      },
      {
        id: "tech",
        title: "Modo tech",
        primary: "#0f766e",
        secondary: "#67e8f9",
        weight: score(["codigo", "programa", "sistema", "site", "app", "software", "bug", "api", "backend", "frontend"]) * 4
      },
      {
        id: "support",
        title: "Pode deixar",
        primary: "#0891b2",
        secondary: "#a5f3fc",
        weight: score(["ajuda", "suporte", "duvida", "atendimento", "resolver", "orientar", "explicar"]) * 3
      },
      {
        id: "apology",
        title: "Foi mal",
        primary: "#f97316",
        secondary: "#fed7aa",
        weight: score(["desculpa", "perdao", "sinto muito", "me desculpe", "erro meu"]) * 4
      },
      {
        id: "thanks",
        title: "Valeu demais",
        primary: "#16a34a",
        secondary: "#bbf7d0",
        weight: score(["obrigado", "obrigada", "agradeco", "grato", "gratidao", "valeu", "agradecer"]) * 4
      },
      {
        id: "job",
        title: "Trabalho em foco",
        primary: "#334155",
        secondary: "#cbd5e1",
        weight: score(["curriculo", "vaga", "emprego", "trabalho", "entrevista", "contratar", "salario", "carreira"]) * 4
      },
      {
        id: "negotiation",
        title: "Bora negociar",
        primary: "#b45309",
        secondary: "#fcd34d",
        weight: score(["negociar", "negociacao", "proposta", "condicao", "desconto", "fechamento", "acordo"]) * 4
      },
      {
        id: "house",
        title: "Casa dos sonhos",
        primary: "#10b981",
        secondary: "#fbbf24",
        weight: homeScore * 4
      },
      {
        id: "love",
        title: "Com carinho",
        primary: "#ec4899",
        secondary: "#f9a8d4",
        weight: score(["amor", "saudade", "carinho", "apaixonado", "especial", "coracao", "beijo", "te amo"]) * 4
      },
      {
        id: "alert",
        title: "Atencao",
        primary: "#ef4444",
        secondary: "#f97316",
        weight: score(["problema", "reclamacao", "erro", "falha", "nervoso", "irritado", "nao esta certo", "urgente"]) * 4
      },
      {
        id: "sad",
        title: "Forca ai",
        primary: "#64748b",
        secondary: "#93c5fd",
        weight: score(["triste", "cansado", "dificil", "pesado", "desanimado", "chateado", "complicado"]) * 3
      },
      {
        id: "happy",
        title: "Que bom",
        primary: "#22c55e",
        secondary: "#fde047",
        weight: score(["feliz", "otimo", "alegria", "incrivel", "adorei", "muito bom", "perfeito", "maravilha"]) * 3
      },
      {
        id: "sales",
        title: "Bora fechar",
        primary: "#0f766e",
        secondary: "#f59e0b",
        weight: score(["comprar", "venda", "proposta", "fechar", "preco", "valor", "oferta", "cliente"]) * 2
      },
      {
        id: "business",
        title: "Profissional",
        primary: "#2563eb",
        secondary: "#38bdf8",
        weight: score(["contrato", "cliente", "projeto", "empresa", "estrategia", "resultado", "relatorio"]) * 2
      }
    ];
    const best = candidates
      .filter((candidate) => candidate.weight > 0)
      .sort((a, b) => b.weight - a.weight)[0];
    if (best) return best;
    if (has(["oi", "ola", "bom dia", "boa tarde", "boa noite", "tudo bem"])) {
      return { id: "chat", title: "Opa!", primary: "#14b8a6", secondary: "#a7f3d0", weight: 1 };
    }
    return { id: "chat", title: "Mensagem pronta", primary: "#14b8a6", secondary: "#a7f3d0" };
  }

  function createComicBurst(theme) {
    const shoutByTheme = {
      house: "UAU!",
      home_purchase: "A CHAVE!",
      love: "WOW!",
      sales: "FECHOU!",
      payment: "PAGO!",
      meeting: "MARCOU!",
      delivery: "CHEGOU!",
      food: "NHAM!",
      travel: "PARTIU!",
      study: "FOCO!",
      tech: "BUGOU!",
      support: "RESOLVO!",
      apology: "FOI MAL!",
      thanks: "VALEU!",
      job: "FOCO!",
      negotiation: "ACORDO!",
      alert: "OPA!",
      sad: "OH...",
      happy: "YEAH!",
      business: "TOP!",
      chat: "HEY!"
    };
    const shout = shoutByTheme[theme.id] || "WOW!";
    return `
      <path d="M83 308 L156 286 L118 221 L193 239 L190 161 L250 215 L286 144 L313 222 L386 181 L360 258 L446 248 L382 303 L457 354 L369 360 L409 438 L337 392 L296 464 L279 379 L197 405 L251 340 Z" fill="${theme.secondary}" opacity="0.9" stroke="#12352d" stroke-width="10" stroke-linejoin="round"/>
      <path d="M533 118 L557 176 L620 164 L580 214 L625 261 L562 254 L541 313 L520 254 L457 261 L502 214 L462 164 L525 176 Z" fill="#ffffff" stroke="${theme.primary}" stroke-width="10" stroke-linejoin="round"/>
      <path d="M118 505 L162 526 M141 466 L185 494 M574 429 L628 405 M563 472 L632 474 M191 134 L232 91 M226 155 L284 130" stroke="#12352d" stroke-width="13" stroke-linecap="round"/>
      <text x="548" y="230" text-anchor="middle" transform="rotate(-11 548 230)" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="900" fill="${theme.primary}" stroke="#ffffff" stroke-width="8" paint-order="stroke">${escapeStickerSvgText(shout)}</text>
    `;
  }

  function createStickerIcon(theme) {
    const primary = theme.primary;
    const secondary = theme.secondary;
    const face = `
      <circle cx="318" cy="354" r="18" fill="#12352d"/>
      <circle cx="404" cy="354" r="18" fill="#12352d"/>
      <circle cx="325" cy="346" r="6" fill="#ffffff"/>
      <circle cx="411" cy="346" r="6" fill="#ffffff"/>
      <path d="M316 416 Q360 463 410 416" fill="none" stroke="#12352d" stroke-width="17" stroke-linecap="round"/>
    `;
    const arms = `<path d="M219 377 Q170 351 139 396 M501 377 Q551 351 582 396" fill="none" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>`;
    if (theme.id === "home_purchase") {
      return `
        <path d="M430 230 L525 314 L525 475 H337 V314 Z" fill="#ffffff" stroke="#12352d" stroke-width="16" stroke-linejoin="round"/>
        <path d="M316 322 L430 220 L544 322" fill="${secondary}" stroke="#12352d" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="407" y="388" width="48" height="87" rx="14" fill="${primary}" stroke="#12352d" stroke-width="10"/>
        <circle cx="455" cy="433" r="6" fill="#ffffff"/>
        <g transform="translate(-18 16) rotate(-5 278 385)">
          <circle cx="274" cy="279" r="58" fill="#ffd7a8" stroke="#12352d" stroke-width="15"/>
          <path d="M214 275 Q275 205 336 275" fill="${primary}" stroke="#12352d" stroke-width="13" stroke-linejoin="round"/>
          <path d="M243 340 Q276 377 310 340" fill="none" stroke="#12352d" stroke-width="13" stroke-linecap="round"/>
          <circle cx="254" cy="287" r="10" fill="#12352d"/>
          <circle cx="297" cy="287" r="10" fill="#12352d"/>
          <path d="M219 391 Q279 350 342 391 L367 505 H194 Z" fill="${primary}" stroke="#12352d" stroke-width="15" stroke-linejoin="round"/>
          <path d="M342 393 Q402 366 438 316" fill="none" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
          <circle cx="445" cy="306" r="22" fill="${secondary}" stroke="#12352d" stroke-width="10"/>
          <rect x="459" y="299" width="68" height="16" rx="8" fill="${secondary}" stroke="#12352d" stroke-width="8"/>
          <path d="M507 315 V341 M527 315 V335" stroke="#12352d" stroke-width="8" stroke-linecap="round"/>
        </g>
      `;
    }
    if (theme.id === "payment") {
      return `
        ${arms}
        <g transform="rotate(-5 360 365)">
          <rect x="228" y="220" width="264" height="300" rx="28" fill="#ffffff" stroke="#12352d" stroke-width="17"/>
          <path d="M282 294 H438 M282 346 H416 M282 398 H382" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
          <circle cx="443" cy="454" r="72" fill="${secondary}" stroke="#12352d" stroke-width="16"/>
          <text x="443" y="481" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="78" font-weight="900" fill="${primary}" stroke="#ffffff" stroke-width="6" paint-order="stroke">$</text>
          ${face}
        </g>
      `;
    }
    if (theme.id === "meeting") {
      return `
        ${arms}
        <g transform="rotate(3 360 360)">
          <rect x="224" y="240" width="272" height="236" rx="30" fill="#ffffff" stroke="#12352d" stroke-width="17"/>
          <rect x="224" y="240" width="272" height="70" rx="28" fill="${primary}" stroke="#12352d" stroke-width="17"/>
          <path d="M282 220 V275 M438 220 V275" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
          <circle cx="306" cy="365" r="22" fill="${secondary}" stroke="#12352d" stroke-width="10"/>
          <circle cx="371" cy="365" r="22" fill="${secondary}" stroke="#12352d" stroke-width="10"/>
          <circle cx="436" cy="365" r="22" fill="${secondary}" stroke="#12352d" stroke-width="10"/>
          <path d="M296 430 H424" stroke="${primary}" stroke-width="18" stroke-linecap="round"/>
        </g>
      `;
    }
    if (theme.id === "delivery") {
      return `
        <path d="M170 412 H535" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
        <g transform="rotate(-3 360 360)">
          <rect x="192" y="300" width="230" height="146" rx="22" fill="${secondary}" stroke="#12352d" stroke-width="17"/>
          <path d="M422 342 H494 L544 390 V446 H422 Z" fill="${primary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
          <circle cx="264" cy="458" r="36" fill="#ffffff" stroke="#12352d" stroke-width="15"/>
          <circle cx="480" cy="458" r="36" fill="#ffffff" stroke="#12352d" stroke-width="15"/>
          <path d="M215 270 H330 M177 327 H252" stroke="#12352d" stroke-width="15" stroke-linecap="round"/>
          ${face}
        </g>
      `;
    }
    if (theme.id === "food") {
      return `
        ${arms}
        <ellipse cx="360" cy="450" rx="170" ry="48" fill="#ffffff" stroke="#12352d" stroke-width="16"/>
        <path d="M245 373 Q360 260 475 373 Z" fill="${secondary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
        <path d="M253 374 H467 Q459 449 360 457 Q260 449 253 374 Z" fill="${primary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
        <circle cx="317" cy="363" r="13" fill="#12352d"/>
        <circle cx="401" cy="363" r="13" fill="#12352d"/>
        <path d="M322 410 Q360 438 401 410" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>
        <path d="M513 270 C490 344 523 380 480 456" stroke="#12352d" stroke-width="13" stroke-linecap="round"/>
        <path d="M520 270 V361" stroke="#12352d" stroke-width="13" stroke-linecap="round"/>
      `;
    }
    if (theme.id === "travel") {
      return `
        <path d="M167 458 Q357 523 553 454" fill="none" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
        <g transform="rotate(-12 360 345)">
          <path d="M161 338 L545 257 Q586 249 602 278 Q615 304 583 323 L428 394 L411 510 L355 522 L352 424 L234 469 L184 448 L276 382 L172 360 Z" fill="${secondary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
          <circle cx="424" cy="312" r="17" fill="#ffffff" stroke="#12352d" stroke-width="9"/>
          <circle cx="481" cy="300" r="17" fill="#ffffff" stroke="#12352d" stroke-width="9"/>
        </g>
      `;
    }
    if (theme.id === "study") {
      return `
        ${arms}
        <path d="M214 288 Q294 252 360 307 Q426 252 506 288 V501 Q425 465 360 520 Q295 465 214 501 Z" fill="#ffffff" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
        <path d="M360 307 V520 M257 337 H320 M257 384 H318 M402 337 H465 M402 384 H465" stroke="#12352d" stroke-width="13" stroke-linecap="round"/>
        <circle cx="360" cy="263" r="48" fill="${secondary}" stroke="#12352d" stroke-width="14"/>
        <path d="M333 260 Q360 286 389 260" fill="none" stroke="${primary}" stroke-width="12" stroke-linecap="round"/>
      `;
    }
    if (theme.id === "tech") {
      return `
        ${arms}
        <rect x="218" y="250" width="284" height="194" rx="24" fill="#0b1220" stroke="#12352d" stroke-width="17"/>
        <path d="M180 468 H540 L497 520 H223 Z" fill="${secondary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
        <path d="M295 315 L252 355 L295 395 M425 315 L468 355 L425 395 M385 304 L335 408" stroke="${secondary}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="360" cy="493" r="12" fill="#12352d"/>
      `;
    }
    if (theme.id === "support") {
      return `
        ${arms}
        <circle cx="360" cy="360" r="126" fill="${secondary}" stroke="#12352d" stroke-width="18"/>
        <path d="M250 360 Q250 260 360 260 Q470 260 470 360" fill="none" stroke="#12352d" stroke-width="18" stroke-linecap="round"/>
        <rect x="218" y="348" width="54" height="82" rx="20" fill="${primary}" stroke="#12352d" stroke-width="12"/>
        <rect x="448" y="348" width="54" height="82" rx="20" fill="${primary}" stroke="#12352d" stroke-width="12"/>
        <path d="M445 424 Q410 463 360 463" fill="none" stroke="#12352d" stroke-width="13" stroke-linecap="round"/>
        ${face}
      `;
    }
    if (theme.id === "apology") {
      return `
        ${arms}
        <circle cx="360" cy="342" r="124" fill="${secondary}" stroke="#12352d" stroke-width="18"/>
        <path d="M302 327 Q320 306 338 327 M382 327 Q400 306 418 327" fill="none" stroke="#12352d" stroke-width="14" stroke-linecap="round"/>
        <path d="M318 413 Q360 386 402 413" fill="none" stroke="#12352d" stroke-width="15" stroke-linecap="round"/>
        <rect x="265" y="455" width="190" height="68" rx="18" fill="#ffffff" stroke="#12352d" stroke-width="13"/>
        <text x="360" y="501" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="900" fill="${primary}">DESCULPA</text>
      `;
    }
    if (theme.id === "thanks") {
      return `
        ${arms}
        <path d="M360 210 L398 306 L502 313 L421 377 L447 480 L360 425 L273 480 L299 377 L218 313 L322 306 Z" fill="${secondary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
        <circle cx="360" cy="362" r="78" fill="#ffffff" stroke="#12352d" stroke-width="14"/>
        <path d="M313 352 Q333 330 352 352 M368 352 Q389 330 409 352 M315 389 Q360 432 407 389" fill="none" stroke="${primary}" stroke-width="12" stroke-linecap="round"/>
      `;
    }
    if (theme.id === "job") {
      return `
        ${arms}
        <g transform="rotate(-2 360 360)">
          <rect x="226" y="286" width="268" height="202" rx="28" fill="${secondary}" stroke="#12352d" stroke-width="17"/>
          <path d="M300 286 V246 Q300 218 328 218 H392 Q420 218 420 246 V286" fill="none" stroke="#12352d" stroke-width="15"/>
          <circle cx="330" cy="365" r="35" fill="#ffffff" stroke="#12352d" stroke-width="12"/>
          <path d="M396 342 H458 M396 382 H446 M288 432 H443" stroke="#12352d" stroke-width="14" stroke-linecap="round"/>
        </g>
      `;
    }
    if (theme.id === "negotiation") {
      return `
        <path d="M226 360 Q270 312 322 357 L354 385 Q374 405 398 385 L430 357 Q482 312 526 360 Q472 448 376 456 Q280 448 226 360 Z" fill="${secondary}" stroke="#12352d" stroke-width="17" stroke-linejoin="round"/>
        <path d="M239 354 L315 429 M482 354 L408 429" stroke="${primary}" stroke-width="18" stroke-linecap="round"/>
        <circle cx="280" cy="330" r="38" fill="#ffffff" stroke="#12352d" stroke-width="13"/>
        <circle cx="440" cy="330" r="38" fill="#ffffff" stroke="#12352d" stroke-width="13"/>
        <path d="M320 506 H400" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
      `;
    }
    if (theme.id === "house") {
      return `
        ${arms}
        <g transform="rotate(-4 360 358)">
          <path d="M207 332 L360 196 L513 332 Z" fill="${secondary}" stroke="#12352d" stroke-width="18" stroke-linejoin="round"/>
          <rect x="245" y="326" width="232" height="184" rx="30" fill="#ffffff" stroke="#12352d" stroke-width="18"/>
          <rect x="333" y="402" width="58" height="108" rx="18" fill="${primary}" stroke="#12352d" stroke-width="10"/>
          <circle cx="377" cy="458" r="7" fill="#ffffff"/>
          ${face}
        </g>
      `;
    }
    if (theme.id === "love") {
      return `
        ${arms}
        <g transform="rotate(5 360 360)">
          <path d="M360 522 C222 416 184 345 225 279 C258 225 322 235 360 285 C398 235 462 225 495 279 C536 345 498 416 360 522 Z" fill="${primary}" stroke="#12352d" stroke-width="18" stroke-linejoin="round"/>
          <path d="M283 280 C306 250 341 260 360 294" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.7"/>
          ${face}
        </g>
      `;
    }
    if (theme.id === "sales") {
      return `
        ${arms}
        <g transform="rotate(-7 360 360)">
          <path d="M211 319 L321 210 H508 V397 L395 510 L211 319 Z" fill="${secondary}" stroke="#12352d" stroke-width="18" stroke-linejoin="round"/>
          <circle cx="456" cy="265" r="22" fill="#ffffff" stroke="#12352d" stroke-width="12"/>
          <text x="360" y="405" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="116" font-weight="900" fill="${primary}" stroke="#ffffff" stroke-width="8" paint-order="stroke">$</text>
          ${face}
        </g>
      `;
    }
    if (theme.id === "alert") {
      return `
        <path d="M225 262 L498 262 L540 508 H183 Z" fill="${secondary}" stroke="#12352d" stroke-width="18" stroke-linejoin="round"/>
        <path d="M292 336 L337 316 M428 336 L383 316" stroke="#12352d" stroke-width="18" stroke-linecap="round"/>
        <circle cx="316" cy="374" r="15" fill="#12352d"/>
        <circle cx="405" cy="374" r="15" fill="#12352d"/>
        <path d="M318 445 Q360 411 403 445" fill="none" stroke="#12352d" stroke-width="16" stroke-linecap="round"/>
        <text x="360" y="313" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="78" font-weight="900" fill="${primary}" stroke="#ffffff" stroke-width="8" paint-order="stroke">!</text>
      `;
    }
    if (theme.id === "sad") {
      return `
        ${arms}
        <circle cx="360" cy="368" r="138" fill="${secondary}" stroke="#12352d" stroke-width="18"/>
        <circle cx="314" cy="350" r="15" fill="#12352d"/>
        <circle cx="407" cy="350" r="15" fill="#12352d"/>
        <path d="M315 435 Q360 394 406 435" fill="none" stroke="#12352d" stroke-width="17" stroke-linecap="round"/>
        <path d="M426 374 C463 418 421 454 398 414 C384 389 408 376 426 374 Z" fill="#60a5fa" stroke="#12352d" stroke-width="8"/>
      `;
    }
    if (theme.id === "happy") {
      return `
        ${arms}
        <circle cx="360" cy="368" r="138" fill="${secondary}" stroke="#12352d" stroke-width="18"/>
        <path d="M284 342 Q315 306 344 342 M376 342 Q407 306 436 342" fill="none" stroke="#12352d" stroke-width="17" stroke-linecap="round"/>
        <path d="M289 401 Q360 486 431 401" fill="#ffffff" stroke="#12352d" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M314 423 Q360 457 405 423" fill="none" stroke="${primary}" stroke-width="10" stroke-linecap="round"/>
      `;
    }
    if (theme.id === "business") {
      return `
        ${arms}
        <g transform="rotate(4 360 365)">
          <rect x="216" y="286" width="288" height="208" rx="34" fill="${primary}" stroke="#12352d" stroke-width="18"/>
          <path d="M298 286 V249 Q298 222 326 222 H394 Q422 222 422 249 V286" fill="none" stroke="#12352d" stroke-width="16"/>
          <path d="M333 314 L360 363 L388 314" fill="#ffffff" stroke="#12352d" stroke-width="12" stroke-linejoin="round"/>
          ${face}
        </g>
      `;
    }
    return `
      ${arms}
      <path d="M223 277 Q223 208 292 208 H452 Q521 208 521 277 V394 Q521 463 452 463 H366 L278 532 V463 H292 Q223 463 223 394 Z" fill="${secondary}" stroke="#12352d" stroke-width="18" stroke-linejoin="round"/>
      <circle cx="318" cy="342" r="18" fill="#12352d"/>
      <circle cx="372" cy="342" r="18" fill="#12352d"/>
      <circle cx="426" cy="342" r="18" fill="#12352d"/>
      <path d="M304 400 Q360 438 420 400" fill="none" stroke="${primary}" stroke-width="14" stroke-linecap="round"/>
    `;
  }

  function createResponseStickerUrl(text, contextText = text) {
    const theme = getStickerTheme(contextText || text);
    const lines = wrapStickerText(text, 22, 3);
    const lineHeight = 37;
    const textNodes = lines
      .map((line, index) => {
        return `<text x="360" y="${557 + index * lineHeight}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" fill="#12352d" stroke="#ffffff" stroke-width="7" paint-order="stroke">${escapeStickerSvgText(line.toUpperCase())}</text>`;
      })
      .join("");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720">
        <defs>
          <radialGradient id="stickerBg" cx="45%" cy="35%" r="72%">
            <stop offset="0" stop-color="#ffffff"/>
            <stop offset="0.52" stop-color="#fff7d6"/>
            <stop offset="1" stop-color="${theme.secondary}"/>
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.28"/>
          </filter>
        </defs>
        <path d="M358 40 C480 38 604 105 650 223 C695 340 661 493 560 584 C459 675 301 690 181 623 C61 556 11 399 59 267 C107 135 226 44 358 40 Z" fill="url(#stickerBg)" stroke="#ffffff" stroke-width="26" filter="url(#shadow)"/>
        <path d="M96 266 C154 122 333 53 498 105" fill="none" stroke="${theme.primary}" stroke-width="18" stroke-linecap="round" opacity="0.42"/>
        ${createComicBurst(theme)}
        <text x="360" y="139" text-anchor="middle" transform="rotate(-4 360 139)" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="900" fill="${theme.primary}" stroke="#ffffff" stroke-width="8" paint-order="stroke">${escapeStickerSvgText(theme.title.toUpperCase())}</text>
        <g transform="translate(0 18)">
          ${createStickerIcon(theme)}
        </g>
        ${textNodes}
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function getResponseStickerText(panel) {
    return cleanText(
      getDraftText(panel) ||
      state.lastImproveResult?.improvedText ||
      getComposerText(state.composer || findComposer())
    );
  }

  function getResponseStickerContextText(panel) {
    return cleanText(
      [
        getResponseStickerText(panel),
        state.lastImproveResult?.improvedText || "",
        state.lastImproveRequest?.text || "",
        getComposerText(state.composer || findComposer())
      ].join(" ")
    );
  }

  async function openStickerPreview(imageUrl) {
    const response = await callBackground({
      type: "WA_AI_OPEN_STICKER_PREVIEW",
      imageUrl
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Nao consegui abrir a imagem.");
    }
  }

  function createStickerPngBlob(imageUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas indisponivel."));
          return;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Falha ao preparar PNG."));
        }, "image/png");
      };
      image.onerror = () => reject(new Error("Falha ao carregar figurinha."));
      image.src = imageUrl;
    });
  }

  async function pasteStickerBlobIntoComposer(blob) {
    const composer = getWritableComposer();
    if (!composer) return false;
    const target =
      composer.isContentEditable
        ? composer
        : composer.closest?.("[contenteditable='true'], [contenteditable]:not([contenteditable='false'])") || composer;
    const file = new File([blob], "figurinha-whatsotimizado.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    transfer.setData("text/plain", "");
    target.focus();

    let pasteEvent;
    try {
      pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer
      });
      Object.defineProperty(pasteEvent, "clipboardData", { value: transfer });
    } catch {
      pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(pasteEvent, "clipboardData", { value: transfer });
    }

    target.dispatchEvent(pasteEvent);
    await sleep(800);
    return true;
  }

  async function copyStickerBlobToClipboard(blob) {
    if (!navigator.clipboard?.write || !window.ClipboardItem) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  }

  async function clickStickerPreviewSendButton() {
    for (let attempt = 0; attempt < 28; attempt += 1) {
      const button = findMediaSendButton();
      const disabled = button?.disabled || button?.getAttribute("aria-disabled") === "true";
      if (button && !disabled) {
        button.click();
        return true;
      }
      await sleep(120);
    }
    return false;
  }

  async function sendStickerToRecipient(panel, imageUrl) {
    if (!isWhatsAppWeb()) {
      renderError(panel, "O envio automatico de figurinha esta disponivel no WhatsApp Web.");
      return;
    }

    try {
      setToast(panel, "Preparando figurinha...");
      const blob = await createStickerPngBlob(imageUrl);
      const copied = await copyStickerBlobToClipboard(blob).catch(() => false);
      const pasted = await pasteStickerBlobIntoComposer(blob);
      if (!pasted) {
        throw new Error("Campo de mensagem indisponivel.");
      }
      if (await clickStickerPreviewSendButton()) {
        setToast(panel, "Figurinha enviada.");
        trackLearningEvent("text_inserted", { assetType: "sticker" });
        return;
      }

      if (copied) {
        setToast(panel, "Figurinha copiada. Pressione Ctrl+V no WhatsApp e envie.");
        return;
      }

      setToast(panel, "Figurinha anexada. Clique no enviar do WhatsApp para concluir.");
    } catch {
      renderError(panel, "Nao consegui enviar a figurinha automaticamente. Tente abrir a imagem e enviar manualmente.");
    }
  }

  function renderResponseStickerResult(panel, imageUrl) {
    setPrimaryRowVisible(panel, true);
    const results = panel.querySelector("[data-wa-ai='results']");
    if (!results) return;
    results.innerHTML = "";
    state.lastSticker = {
      imageUrl,
      createdAt: Date.now()
    };

    const card = document.createElement("article");
    card.className = "wa-ai-conversation-card wa-ai-response-sticker-card";

    const image = document.createElement("img");
    image.className = "wa-ai-response-sticker";
    image.alt = "Figurinha da resposta";
    image.src = imageUrl;

    const actions = document.createElement("div");
    actions.className = "wa-ai-result-actions";

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "wa-ai-mini-action";
    openButton.textContent = "Abrir imagem";
    openButton.addEventListener("click", async () => {
      try {
        await openStickerPreview(imageUrl);
      } catch {
        setToast(panel, "Nao consegui abrir a imagem em nova aba.");
      }
    });

    const sendButton = document.createElement("button");
    sendButton.type = "button";
    sendButton.className = "wa-ai-use";
    sendButton.textContent = "Enviar figurinha";
    sendButton.addEventListener("click", async () => {
      sendButton.disabled = true;
      await sendStickerToRecipient(panel, imageUrl);
      sendButton.disabled = false;
    });

    actions.appendChild(sendButton);
    actions.appendChild(openButton);
    card.appendChild(image);
    card.appendChild(actions);
    results.appendChild(card);
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

  function handleGenerateResponseSticker(panel) {
    const text = getResponseStickerText(panel);
    if (!text) {
      renderError(panel, "Digite ou gere uma resposta antes de criar a figurinha.");
      focusDraftInput({ prefill: false });
      return;
    }
    renderResponseStickerResult(panel, createResponseStickerUrl(text, getResponseStickerContextText(panel)));
    setToast(panel, "Figurinha da resposta gerada.");
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

  function findMediaSendButton() {
    const buttons = Array.from(document.querySelectorAll("button [data-icon='send']"))
      .map((icon) => icon.closest("button"))
      .filter(isVisible);
    return (
      buttons.find((button) => {
        const dialog = button.closest("[role='dialog'], [aria-modal='true'], [data-animate-modal-popup]");
        return dialog && isVisible(dialog);
      }) || null
    );
  }

  function applySideDockPosition() {
    const topPercent = clampSideDockTopPercent(state.sideDockTopPercent);
    state.sideDockTopPercent = topPercent;
    if (state.root) {
      state.root.style.top = `${topPercent}%`;
      state.root.style.left = "";
    }
    if (state.panel) {
      state.panel.style.top = `${Math.min(80, Math.max(20, topPercent))}%`;
    }
  }

  function handleSideDockPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const root = event.currentTarget.closest("#wa-ai-rewriter-root");
    if (!root) return;
    state.sideDockDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTopPercent: state.sideDockTopPercent,
      moved: false
    };
    root.classList.add("is-dragging");
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleSideDockPointerMove(event) {
    const drag = state.sideDockDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaY) > 4) drag.moved = true;
    if (!drag.moved) return;
    event.preventDefault();
    const viewportHeight = Math.max(window.innerHeight || 1, 1);
    state.sideDockTopPercent = clampSideDockTopPercent(
      drag.startTopPercent + (deltaY / viewportHeight) * 100
    );
    applySideDockPosition();
  }

  function finishSideDockDrag(event) {
    const drag = state.sideDockDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    state.root?.classList.remove("is-dragging");
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    state.sideDockDrag = null;
    if (drag.moved) {
      state.suppressDockClickUntil = Date.now() + 350;
      saveSideDockPosition().catch(() => null);
    }
  }

  function bindSideDockButtonEvents(button) {
    if (!button || button.dataset.waAiDockBound === "true") return;
    button.dataset.waAiDockBound = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (Date.now() < state.suppressDockClickUntil) return;
      showPanel();
      focusDraftInput({ prefill: true });
    });
    button.addEventListener("pointerdown", handleSideDockPointerDown);
    button.addEventListener("pointermove", handleSideDockPointerMove);
    button.addEventListener("pointerup", finishSideDockDrag);
    button.addEventListener("pointercancel", finishSideDockDrag);
    button.addEventListener("contextmenu", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.sideDockDrag?.moved) return;
      await openAdjustmentPanel(state.panel);
    });
  }

  function updateFloatingControls(composer) {
    if (!state.root) return;
    state.root.classList.add("wa-ai-side-dock");
    state.root.classList.remove("wa-ai-send-root", "wa-ai-floating-root");
    applySideDockPosition();
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

    let root = document.querySelector("#wa-ai-rewriter-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "wa-ai-rewriter-root";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "wa-ai-button";
      button.setAttribute("aria-label", "Aperfeicoar mensagem");
      button.appendChild(createPremiumSymbol("button"));
      button.title = "Clique para escrever. Enter aperfeicoa; Enter novamente envia.";
      bindSideDockButtonEvents(button);
      root.appendChild(button);
      document.body.appendChild(root);
    } else if (root.parentElement !== document.body) {
      document.body.appendChild(root);
    }
    bindSideDockButtonEvents(root.querySelector(".wa-ai-button"));
    root.classList.add("wa-ai-side-dock");
    root.classList.remove("wa-ai-send-root", "wa-ai-floating-root");
    state.root = root;

    let panel = document.querySelector("#wa-ai-rewriter-panel");
    if (!panel) {
      panel = createPanel();
      panel.classList.add("wa-ai-floating-panel");
      document.body.appendChild(panel);
    } else if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
      panel.classList.add("wa-ai-floating-panel");
    }
    panel.classList.add("wa-ai-floating-panel");
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
            renderThemeSettings(state.panel);
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
    await loadSideDockPosition().catch(() => {});
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
