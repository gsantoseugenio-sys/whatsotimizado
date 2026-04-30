import { Router } from "express";

const router = Router();

router.get("/success", (_req, res) => {
  res.status(200).send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pagamento confirmado</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f4f7f6; display: grid; min-height: 100vh; place-items: center; }
      main { background: #fff; border-radius: 12px; padding: 24px; width: min(90vw, 560px); box-shadow: 0 10px 24px rgba(0,0,0,.08); }
      h1 { margin: 0 0 8px; font-size: 22px; color: #163625; }
      p { margin: 6px 0; color: #254234; line-height: 1.5; }
      button { margin-top: 12px; border: 0; background: #0f8a5f; color: white; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>Pagamento confirmado</h1>
      <p>Seu upgrade esta sendo ativado automaticamente.</p>
      <p>Volte ao WhatsApp Web e clique em atualizar status para refletir o novo plano.</p>
      <button onclick="window.close()">Fechar</button>
    </main>
  </body>
</html>`);
});

router.get("/cancel", (_req, res) => {
  res.status(200).send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pagamento cancelado</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f7f5f4; display: grid; min-height: 100vh; place-items: center; }
      main { background: #fff; border-radius: 12px; padding: 24px; width: min(90vw, 560px); box-shadow: 0 10px 24px rgba(0,0,0,.08); }
      h1 { margin: 0 0 8px; font-size: 22px; color: #3d2a1d; }
      p { margin: 6px 0; color: #523b2a; line-height: 1.5; }
      button { margin-top: 12px; border: 0; background: #8a5a34; color: white; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>Pagamento cancelado</h1>
      <p>Nenhuma cobranca foi aplicada. Seu plano atual continua ativo.</p>
      <button onclick="window.close()">Fechar</button>
    </main>
  </body>
</html>`);
});

export default router;
