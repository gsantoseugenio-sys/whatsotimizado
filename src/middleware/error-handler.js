export function notFoundHandler(_req, res) {
  return res.status(404).json({
    error: "Rota nao encontrada."
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = err.message || "Erro interno do servidor.";

  if (status >= 500) {
    console.error("[ERRO]", err);
  }

  return res.status(status).json({
    error: message
  });
}
