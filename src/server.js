import app from "./app.js";
import env from "./config/env.js";
import { initSchema } from "./db/init-schema.js";
import { pool } from "./db/pool.js";

let server = null;

async function bootstrap() {
  await initSchema();
  server = app.listen(env.PORT, () => {
    console.log(`Backend ativo em http://localhost:${env.PORT}`);
  });
}

function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando backend...`);
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

bootstrap().catch(async (error) => {
  console.error("Falha ao iniciar backend:", error);
  await pool.end();
  process.exit(1);
});
