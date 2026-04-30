import { Router } from "express";
import crypto from "node:crypto";
import { exchangeCodeForGoogleUser, buildGoogleAuthUrl, validateGoogleState } from "../services/google-auth-service.js";
import { upsertGoogleUser } from "../repos/user-repo.js";
import { issueAuthToken } from "../services/token-service.js";

const router = Router();

function buildCallbackContentSecurityPolicy(nonce) {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "img-src 'self'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    "connect-src 'self'"
  ].join("; ");
}

function renderSuccessPage({ token, email, plan, extensionId, nonce }) {
  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const safeToken = JSON.stringify(token);
  const safeEmail = JSON.stringify(email);
  const safePlan = JSON.stringify(plan);
  const safeExtId = JSON.stringify(extensionId || "");
  const htmlEmail = escapeHtml(email);
  const htmlPlan = escapeHtml(plan);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Login concluido</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f7f5; margin: 0; padding: 30px; color: #172b1e; }
      .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 10px 24px rgba(0,0,0,.08); }
      h1 { margin: 0 0 10px; font-size: 20px; }
      p { margin: 8px 0; line-height: 1.4; }
      button { margin-top: 12px; border: 0; background: #0f8a5f; color: #fff; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
      code { background: #eef4ef; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Login concluido</h1>
      <p id="status">Enviando sessao para a extensao...</p>
      <p>Email: <code>${htmlEmail}</code></p>
      <p>Plano: <code>${htmlPlan}</code></p>
      <button id="closeBtn" type="button">Fechar</button>
    </div>
    <script nonce="${nonce}">
      (function () {
        const token = ${safeToken};
        const email = ${safeEmail};
        const plan = ${safePlan};
        const extensionId = ${safeExtId};
        const status = document.getElementById("status");
        const closeBtn = document.getElementById("closeBtn");
        function done(message) { status.textContent = message; }
        closeBtn.addEventListener("click", function () { window.close(); });

        if (!extensionId) {
          done("Sessao criada. Abra a extensao para continuar.");
          return;
        }
        if (!window.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
          done("Nao consegui acessar a API da extensao neste navegador.");
          return;
        }

        try {
          chrome.runtime.sendMessage(
            extensionId,
            { type: "WA_AI_AUTH_TOKEN", token, email, plan },
            function (response) {
              if (chrome.runtime.lastError) {
                done("Sessao criada, mas nao consegui enviar para extensao: " + chrome.runtime.lastError.message);
                return;
              }
              if (!response || !response.ok) {
                done("Sessao criada, mas a extensao nao confirmou recebimento.");
                return;
              }
              done("Sessao conectada com sucesso. Voce ja pode voltar ao WhatsApp Web.");
              setTimeout(function () { window.close(); }, 1200);
            }
          );
        } catch (err) {
          done("Erro ao enviar sessao para extensao.");
        }
      })();
    </script>
  </body>
</html>`;
}

router.get("/start", (req, res) => {
  const extensionId = String(req.query.ext_id || "").trim();
  const url = buildGoogleAuthUrl({ extensionId });
  res.redirect(url);
});

router.get("/callback", async (req, res, next) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    if (!code || !state) {
      return res.status(400).send("Parametros de autenticacao invalidos.");
    }

    const parsedState = validateGoogleState(state);
    if (!parsedState) {
      return res.status(400).send("Estado de autenticacao invalido ou expirado.");
    }

    const googleUser = await exchangeCodeForGoogleUser(code);
    const user = await upsertGoogleUser(googleUser);
    const { token } = await issueAuthToken({
      userId: user.id,
      sourceExtensionId: parsedState.extensionId || null
    });

    const nonce = crypto.randomBytes(16).toString("base64");
    const html = renderSuccessPage({
      token,
      email: user.email,
      plan: user.plan,
      extensionId: parsedState.extensionId,
      nonce
    });
    res.setHeader("Content-Security-Policy", buildCallbackContentSecurityPolicy(nonce));
    return res.status(200).send(html);
  } catch (error) {
    return next(error);
  }
});

export default router;
