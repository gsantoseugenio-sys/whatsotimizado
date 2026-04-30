import env from "../../config/env.js";
import openai from "../openai-client.js";

const LANGUAGE_LABELS = {
  "pt-BR": "portugues brasileiro",
  en: "ingles",
  hi: "hindi",
  id: "indonesio",
  es: "espanhol"
};

function resolveTargetLanguage(language) {
  const normalized = String(language || "pt-BR").trim();
  if (normalized === "auto") return { code: "pt-BR", label: LANGUAGE_LABELS["pt-BR"] };
  return {
    code: LANGUAGE_LABELS[normalized] ? normalized : "pt-BR",
    label: LANGUAGE_LABELS[normalized] || LANGUAGE_LABELS["pt-BR"]
  };
}

function cleanTranslatedText(value) {
  return String(value || "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

function limitTranslationLength(original, translated) {
  const originalText = String(original || "").trim();
  const translatedText = cleanTranslatedText(translated);
  const maxLength = Math.max(Math.ceil(originalText.length * 2.4), originalText.length + 220);
  if (translatedText.length <= maxLength) return translatedText;

  const sentenceEnd = translatedText.lastIndexOf(".", maxLength);
  if (sentenceEnd > Math.max(40, maxLength * 0.55)) {
    return translatedText.slice(0, sentenceEnd + 1).trim();
  }
  return translatedText.slice(0, maxLength).trim();
}

export async function translateText(text, userPreferences = {}) {
  const originalText = String(text || "").trim();
  const targetLanguage = resolveTargetLanguage(userPreferences.targetLanguage || userPreferences.language);

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `
Voce traduz mensagens recebidas em conversas reais.
Retorne apenas a traducao final, sem explicacoes.
Preserve sentido, nomes, numeros, datas, valores, links, emojis e quebras de linha relevantes.
Nao responda a mensagem, nao melhore, nao resuma e nao invente informacoes.
Se o texto ja estiver em ${targetLanguage.label}, retorne o mesmo texto natural.
Use linguagem natural em ${targetLanguage.label}.`.trim()
      },
      {
        role: "user",
        content: `Traduzir para ${targetLanguage.label}:\n\n"""${originalText}"""`
      }
    ]
  });

  const translatedText = limitTranslationLength(
    originalText,
    completion.choices?.[0]?.message?.content || originalText
  );

  return {
    translatedText: translatedText || originalText,
    targetLanguage: targetLanguage.code
  };
}

export default translateText;
