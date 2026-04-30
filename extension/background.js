const STORAGE_KEY = "wa_ai_session";

function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (data) => {
      resolve(data[STORAGE_KEY] || null);
    });
  });
}

function setSession(session) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: session }, () => resolve());
  });
}

function clearSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([STORAGE_KEY], () => resolve());
  });
}

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "WA_AI_AUTH_TOKEN" || !message.token) {
    sendResponse({ ok: false, error: "Mensagem externa invalida." });
    return;
  }

  setSession({
    token: String(message.token),
    email: String(message.email || ""),
    plan: String(message.plan || "free"),
    updatedAt: Date.now()
  })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "WA_AI_GET_SESSION") {
    getSession()
      .then((session) => sendResponse({ ok: true, session }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "WA_AI_SET_SESSION" && message.session) {
    setSession(message.session)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "WA_AI_CLEAR_SESSION") {
    clearSession()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
