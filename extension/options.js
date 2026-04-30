(() => {
  const STORAGE_KEY = "wa_ai_options";
  const runtimeConfig = globalThis.WA_AI_REWRITER_CONFIG || {};
  const DEFAULT_API_BASE = String(runtimeConfig.API_BASE || "").replace(/\/+$/, "");
  const DEFAULT_OPTIONS = {
    apiBaseUrl: DEFAULT_API_BASE,
    manualToken: "",
    defaultPlan: "free",
    favoriteStyles: ["professional"],
    defaultObjective: "business_ceo",
    defaultLanguage: "auto",
    autoTranslateIncoming: false
  };
  const LEGACY_OBJECTIVE_FALLBACKS = {
    personal_old_romantic_poet: "recreative_romantic_poet",
    personal_highly_polite: "personal_confident",
    personal_charming: "personal_loving"
  };
  const LEGACY_PLACEHOLDER_HOST = ["api", ["seu", "dominio"].join("-"), "com"].join(".");

  const nodes = {
    apiBaseUrl: document.getElementById("apiBaseUrl"),
    manualToken: document.getElementById("manualToken"),
    defaultPlan: document.getElementById("defaultPlan"),
    defaultObjective: document.getElementById("defaultObjective"),
    defaultLanguage: document.getElementById("defaultLanguage"),
    autoTranslateIncoming: document.getElementById("autoTranslateIncoming"),
    saveBtn: document.getElementById("saveBtn"),
    resetBtn: document.getElementById("resetBtn"),
    status: document.getElementById("status")
  };

  const styleCheckboxes = Array.from(document.querySelectorAll("fieldset input[type='checkbox']"));
  const planValues = new Set(Array.from(nodes.defaultPlan.options).map((option) => option.value));
  const objectiveValues = new Set(
    Array.from(nodes.defaultObjective.options).map((option) => option.value)
  );
  const languageValues = new Set(
    Array.from(nodes.defaultLanguage.options).map((option) => option.value)
  );

  function getSelectedStyles() {
    return styleCheckboxes.filter((item) => item.checked).map((item) => item.value);
  }

  function setSelectedStyles(styles) {
    const selected = new Set(styles);
    styleCheckboxes.forEach((item) => {
      item.checked = selected.has(item.value);
    });
  }

  function setStatus(message) {
    nodes.status.textContent = message || "";
  }

  function isLegacyPlaceholderApiUrl(value) {
    try {
      return new URL(value).hostname === LEGACY_PLACEHOLDER_HOST;
    } catch {
      return false;
    }
  }

  async function loadOptions() {
    const data = await chrome.storage.sync.get([STORAGE_KEY]);
    const options = { ...DEFAULT_OPTIONS, ...(data[STORAGE_KEY] || {}) };
    if (isLegacyPlaceholderApiUrl(options.apiBaseUrl)) {
      options.apiBaseUrl = DEFAULT_OPTIONS.apiBaseUrl;
    }

    nodes.apiBaseUrl.value = options.apiBaseUrl;
    nodes.manualToken.value = options.manualToken;
    nodes.defaultPlan.value = planValues.has(options.defaultPlan)
      ? options.defaultPlan
      : DEFAULT_OPTIONS.defaultPlan;
    const defaultObjective = LEGACY_OBJECTIVE_FALLBACKS[options.defaultObjective] || options.defaultObjective;
    nodes.defaultObjective.value = objectiveValues.has(defaultObjective)
      ? defaultObjective
      : DEFAULT_OPTIONS.defaultObjective;
    nodes.defaultLanguage.value = languageValues.has(options.defaultLanguage)
      ? options.defaultLanguage
      : DEFAULT_OPTIONS.defaultLanguage;
    nodes.autoTranslateIncoming.checked = options.autoTranslateIncoming === true;
    setSelectedStyles(options.favoriteStyles);
  }

  async function saveOptions() {
    const payload = {
      apiBaseUrl: nodes.apiBaseUrl.value.trim() || DEFAULT_OPTIONS.apiBaseUrl,
      manualToken: nodes.manualToken.value.trim(),
      defaultPlan: nodes.defaultPlan.value,
      favoriteStyles: ["professional"],
      defaultObjective: nodes.defaultObjective.value,
      defaultLanguage: nodes.defaultLanguage.value,
      autoTranslateIncoming: nodes.autoTranslateIncoming.checked
    };

    await chrome.storage.sync.set({
      [STORAGE_KEY]: payload
    });

    setStatus("Configuracoes salvas.");
  }

  async function resetOptions() {
    await chrome.storage.sync.set({
      [STORAGE_KEY]: DEFAULT_OPTIONS
    });
    await loadOptions();
    setStatus("Configuracoes resetadas.");
  }

  nodes.saveBtn.addEventListener("click", () => {
    saveOptions().catch(() => setStatus("Falha ao salvar configuracoes."));
  });
  nodes.resetBtn.addEventListener("click", () => {
    resetOptions().catch(() => setStatus("Falha ao resetar configuracoes."));
  });

  loadOptions().catch(() => setStatus("Falha ao carregar configuracoes."));
})();
