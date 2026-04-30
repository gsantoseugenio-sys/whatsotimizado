import { authenticateAuthToken } from "../services/token-service.js";

function parseBearerToken(req) {
  const header = req.header("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function requireUserAuth(req, res, next) {
  try {
    const token = parseBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Token de acesso ausente." });
    }

    const auth = await authenticateAuthToken(token);
    if (!auth) {
      return res.status(401).json({ error: "Token invalido ou expirado." });
    }

    const extensionId = req.header("x-extension-id");
    if (auth.sourceExtensionId && auth.sourceExtensionId !== extensionId) {
      return res.status(403).json({ error: "Token nao pertence a esta extensao." });
    }

    req.user = auth.user;
    req.authToken = auth.token;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalUserAuth(req, res, next) {
  try {
    const token = parseBearerToken(req);
    if (!token) return next();

    const auth = await authenticateAuthToken(token);
    if (!auth) return next();

    const extensionId = req.header("x-extension-id");
    if (auth.sourceExtensionId && auth.sourceExtensionId !== extensionId) {
      return res.status(403).json({ error: "Token nao pertence a esta extensao." });
    }

    req.user = auth.user;
    req.authToken = auth.token;
    return next();
  } catch (error) {
    return next(error);
  }
}
