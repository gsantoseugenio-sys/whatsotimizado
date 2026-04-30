# WhatsApp IA Rewriter (Chrome Extension + Node.js + PostgreSQL + Stripe)

## Estrutura

```text
.
|- extension/
|  |- manifest.json
|  |- background.js
|  |- config.js
|  |- content-script.js
|  |- styles.css
|  |- options.html
|  |- options.css
|  `- options.js
|- backend/
|  |- .env.example
|  |- .gitignore
|  |- package.json
|  `- src/
|     |- app.js
|     |- server.js
|     |- config/
|     |  |- env.js
|     |  `- plans.js
|     |- db/
|     |  |- pool.js
|     |  `- init-schema.js
|     |- middleware/
|     |  |- auth.js
|     |  |- error-handler.js
|     |  `- rate-limit.js
|     |- repos/
|     |  |- user-repo.js
|     |  |- token-repo.js
|     |  |- billing-repo.js
|     |  `- telemetry-repo.js
|     |- routes/
|     |  |- auth-public.js
|     |  |- auth-api.js
|     |  |- billing-api.js
|     |  |- billing-pages.js
|     |  |- stripe-webhook.js
|     |  |- telemetry.js
|     |  `- rewrite.js
|     |- services/
|     |  |- openai-client.js
|     |  |- rewrite-service.js
|     |  |- token-service.js
|     |  |- usage-service.js
|     |  |- cache-service.js
|     |  |- google-auth-service.js
|     |  |- stripe-service.js
|     |  |- billing-service.js
|     |  `- telemetry-service.js
|     `- utils/
|        `- hash.js
`- README.md
```

## Stack entregue

1. Extensao Chrome Manifest V3 com `content script`, `background` e tela de configuracao.
2. Login Google real via backend.
3. Banco real PostgreSQL (schema auto-criado no startup).
4. Stripe completo: checkout + webhook + upgrade automatico.
5. Controle por token:
   plano free = 5 reescritas por dia por instalacao da extensao.
   O plano free tambem funciona sem login.
6. Planos pagos:
   Uso pessoal R$29,90/mes, empresarial R$49,90/mes e premium R$79,90/mes.
   Usuarios fora do Brasil pagam em USD, convertido pela taxa `USD_BRL_RATE`.
7. Limites por estilo/contexto no plano free.
8. Cache multi-instancia com Redis (fallback em memoria).
9. Telemetria de eventos:
   latencia, clique de sugestao, inicio de checkout, variante de prompt.
10. A/B testing de prompts por contexto (variante A/B automatica).
11. Perfis de reescrita por uso empresarial e pessoal, alem de aperfeicoamento rapido.

## Variaveis de ambiente (`backend/.env`)

```env
NODE_ENV=development
PORT=8787
APP_BASE_URL=http://localhost:8787
WEBHOOK_BASE_URL=http://localhost:8787
ALLOWED_WEB_ORIGINS=https://web.whatsapp.com,https://mail.google.com,https://www.instagram.com
ALLOWED_CHROME_EXTENSION_ORIGINS=chrome-extension://

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini

DATABASE_URL=postgres://postgres:postgres@localhost:5432/wa_ai_rewriter
REDIS_URL=redis://localhost:6379

TOKEN_SIGNING_SECRET=troque-por-uma-chave-longa
TOKEN_TTL_DAYS=30

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PERSONAL_BRL_CENTS=2990
STRIPE_PRICE_BUSINESS_BRL_CENTS=4990
STRIPE_PRICE_PREMIUM_BRL_CENTS=7990
USD_BRL_RATE=5.02

CACHE_TTL_MS=180000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=40
```

Para producao, use `backend/.env.production.example` como base e configure:

```env
APP_BASE_URL=https://api.whatsotimizado.com.br
WEBHOOK_BASE_URL=https://api.whatsotimizado.com.br
GOOGLE_REDIRECT_URI=https://api.whatsotimizado.com.br/auth/google/callback
ALLOWED_CHROME_EXTENSION_ORIGINS=chrome-extension://SEU_EXTENSION_ID
```

## Setup rapido

1. Suba PostgreSQL.
2. (Opcional) Suba Redis.
3. No backend:

```bash
cd backend
npm install
cp .env.example .env
# editar .env
npm run dev
```

4. Configure OAuth Google:
   - Authorized redirect URI:
     `http://localhost:8787/auth/google/callback`

5. Configure Stripe webhook local:

```bash
stripe listen --forward-to localhost:8787/api/v1/stripe/webhook
```

6. Carregue a extensao:
   - `chrome://extensions`
   - Modo desenvolvedor
   - Carregar sem compactacao -> pasta `extension`

7. Abra WhatsApp Web e use:
   - `Reescrever com IA`
   - `Conectar Google`
   - Escolha entre Free, Uso Pessoal, Empresarial e Uso Premium

## Tela de configuracao da extensao

Abra os detalhes da extensao no Chrome e clique em `Opcoes`.

Voce pode ajustar:
1. URL do backend.
2. Segredo/token manual.
3. Plano visual padrao.
4. Estilos favoritos.
5. Objetivo padrao.
6. Idioma padrao, com `Autodeclarar` para detectar automaticamente o idioma da mensagem original.
