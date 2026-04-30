import env from "../../config/env.js";
import openai from "../openai-client.js";
import { buildImprovePrompt } from "./build-improve-prompt.js";
import { classifyMessage } from "./classify-message.js";
import { validateImprovedText } from "./validate-output.js";

function parseCompletionContent(completion) {
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || "").join("").trim();
  }
  return "";
}

function parseImprovedText(rawContent) {
  const content = String(rawContent || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(content || "{}");
    return String(parsed.improvedText || parsed.text || "").trim();
  } catch {
    return content.trim();
  }
}

function parseJsonObject(rawContent) {
  const content = String(rawContent || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(content || "{}");
  } catch {
    return {};
  }
}

async function requestImprovedText({ systemPrompt, userPrompt, temperature = 0.35 }) {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return parseImprovedText(parseCompletionContent(completion));
}

async function requestJsonObject({ systemPrompt, userPrompt, temperature = 0.35 }) {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return parseJsonObject(parseCompletionContent(completion));
}

function buildRepairPrompt({ originalText, candidateText, validation, classification, userPreferences }) {
  const language =
    userPreferences?.language === "auto"
      ? "mesmo idioma detectado na mensagem original"
      : userPreferences?.language === "pt-BR" || !userPreferences?.language
      ? "portugues brasileiro"
      : `idioma solicitado (${userPreferences.language})`;
  const problem = validation.needsShorter
    ? "A versao anterior ficou longa demais. Gere uma versao mais curta, com tamanho similar ao original."
    : "A versao anterior mudou sentido, inventou informacoes ou ficou artificial. Gere novamente preservando fielmente o original.";

  return {
    systemPrompt: `
Voce e o validador de melhoria textual do WA AI Rewriter.
Responda somente com JSON valido no formato: { "improvedText": "..." }.
Nao inclua explicacoes, markdown ou alternativas.
Preserve fatos, nomes, numeros, datas, links, valores e intencao original.
Use ${language} natural.
Mantenha o mesmo estilo selecionado pelo usuario: ${userPreferences?.objective || userPreferences?.style || "natural"}.
`.trim(),
    userPrompt: `
Problema detectado:
${problem}

Classificacao:
- tipo: ${classification.messageType}
- tom: ${classification.tone}
- formalidade: ${classification.formalityLevel}

Texto original:
"""${originalText}"""

Versao anterior rejeitada:
"""${candidateText}"""
`.trim()
  };
}

function localPolish(text) {
  const normalized = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
  if (!normalized) return "";
  const first = normalized.charAt(0).toLocaleUpperCase("pt-BR");
  const rest = normalized.slice(1);
  const withCapital = `${first}${rest}`;
  return /[.!?]$/.test(withCapital) ? withCapital : `${withCapital}.`;
}

function fitToReasonableLength(original, candidate) {
  const validation = validateImprovedText(original, candidate);
  if (!validation.needsShorter) return candidate;

  const maxLength = validation.metrics.maxAllowedLength;
  const sentences = String(candidate || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  let output = "";
  for (const sentence of sentences) {
    const next = output ? `${output} ${sentence}` : sentence;
    if (next.length > maxLength) break;
    output = next;
  }

  return output || String(candidate || "").slice(0, maxLength).trim();
}

function buildVariationsPrompt({ originalText, improvedText, classification, userPreferences }) {
  const language =
    userPreferences?.language === "auto"
      ? "mesmo idioma detectado na mensagem original"
      : userPreferences?.language === "pt-BR" || !userPreferences?.language
      ? "portugues brasileiro"
      : `idioma solicitado (${userPreferences.language})`;
  const variationCount = Math.max(1, Math.min(Number(userPreferences.variationCount || 3), 3));

  return {
    systemPrompt: `
Voce cria variacoes curtas de mensagens reais para navegador.
Responda somente com JSON valido no formato:
{ "variations": [ { "style": "direct", "label": "Mais direta", "text": "..." } ] }
Nao inclua explicacoes, markdown ou analise.
Preserve sentido, fatos, numeros, datas, nomes, valores e links.
Use ${language} natural, sem tom robotico.
Mantenha o perfil selecionado pelo usuario (${userPreferences?.objective || userPreferences?.style || "natural"}); varie apenas a abordagem, sem trocar de estilo.
`.trim(),
    userPrompt: `
Crie ${variationCount} variacao(oes) da mensagem, escolhendo entre:
1) Mais direta
2) Mais persuasiva
3) Mais cordial

Classificacao:
- tipo: ${classification.messageType}
- tom: ${classification.tone}
- formalidade: ${classification.formalityLevel}
- intencao comercial: ${classification.commercialIntent ? "sim" : "nao"}

Texto original:
"""${originalText}"""

Versao melhorada base:
"""${improvedText}"""
Preferencias aprendidas:
- estilo preferido: ${userPreferences.adaptivePreferences?.preferredStyle || "sem preferencia"}
- intensidade persuasiva: ${userPreferences.adaptivePreferences?.persuasiveIntensity || "normal"}

`.trim()
  };
}

function normalizeVariations(originalText, variations) {
  const fallbackLabels = {
    direct: "Mais direta",
    persuasive: "Mais persuasiva",
    cordial: "Mais cordial"
  };
  const list = Array.isArray(variations) ? variations : [];
  const normalized = [];
  const seenStyles = new Set();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const style = String(item.style || "").trim().toLowerCase();
    const normalizedStyle = ["direct", "persuasive", "cordial"].includes(style)
      ? style
      : normalized.length === 0
        ? "direct"
        : normalized.length === 1
          ? "persuasive"
          : "cordial";
    if (seenStyles.has(normalizedStyle)) continue;

    const text = fitToReasonableLength(originalText, String(item.text || "").trim());
    const validation = validateImprovedText(originalText, text);
    if (!text || validation.needsRegeneration) continue;

    seenStyles.add(normalizedStyle);
    normalized.push({
      style: normalizedStyle,
      label: String(item.label || fallbackLabels[normalizedStyle]).trim(),
      text
    });

    if (normalized.length >= 3) break;
  }

  return normalized;
}

async function generateVariations({ originalText, improvedText, classification, userPreferences }) {
  const prompt = buildVariationsPrompt({
    originalText,
    improvedText,
    classification,
    userPreferences
  });
  const payload = await requestJsonObject({
    ...prompt,
    temperature: 0.45
  });

  return normalizeVariations(originalText, payload.variations);
}

export async function improveText(text, userPreferences = {}, metadata = {}) {
  const originalText = String(text || "").trim();
  const classification = metadata.classification || classifyMessage(originalText);
  const promptPreferences = {
    ...userPreferences,
    domain: userPreferences.domain || metadata.metadata?.domain || metadata.domain || ""
  };
  if (!promptPreferences.style && promptPreferences.adaptivePreferences?.preferredStyle) {
    promptPreferences.style = promptPreferences.adaptivePreferences.preferredStyle;
  }
  if (promptPreferences.adaptivePreferences?.preferredLength === "curto") {
    promptPreferences.maxLength = "shorter";
  }
  if (promptPreferences.adaptivePreferences?.promptPerformance?.some((item) => item.variationStyle && item.acceptanceRate < 0.25)) {
    promptPreferences.variationCount = 2;
  }
  const basePrompt = buildImprovePrompt(originalText, classification, promptPreferences);
  const attempts = [];
  let candidateText = "";
  let validation = null;
  let prompt = basePrompt;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    candidateText = await requestImprovedText({
      ...prompt,
      temperature: attempt === 1 ? 0.35 : 0.2
    });
    candidateText = fitToReasonableLength(originalText, candidateText);
    validation = validateImprovedText(originalText, candidateText);
    attempts.push({
      attempt,
      valid: validation.isValid,
      issues: validation.issues
    });

    if (validation.isValid) {
      const variations =
        userPreferences.generateVariations || metadata.generateVariations
          ? await generateVariations({
              originalText,
              improvedText: candidateText,
              classification,
              userPreferences: promptPreferences
            })
          : [];

      return {
        improvedText: candidateText,
        variations,
        classification,
        validation,
        attempts
      };
    }

    prompt = buildRepairPrompt({
      originalText,
      candidateText,
      validation,
      classification,
      userPreferences
    });
  }

  const fallbackText = localPolish(originalText);
  const fallbackValidation = validateImprovedText(originalText, fallbackText);

  return {
    improvedText: fallbackValidation.isValid ? fallbackText : originalText,
    variations: [],
    classification,
    validation: fallbackValidation,
    attempts
  };
}

export default improveText;
