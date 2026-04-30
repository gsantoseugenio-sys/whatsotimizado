const STOPWORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "e",
  "em",
  "para",
  "por",
  "com",
  "que",
  "se",
  "nao",
  "no",
  "na",
  "nos",
  "nas",
  "me",
  "te",
  "voce",
  "voces",
  "eu",
  "ele",
  "ela",
  "eles",
  "elas",
  "isso",
  "essa",
  "esse",
  "este",
  "esta",
  "mais",
  "mas",
  "como",
  "foi",
  "ser",
  "ter",
  "tem",
  "vou",
  "vai",
  "ja"
]);

const UNSUPPORTED_CLAIMS = [
  "100%",
  "gratis",
  "gratuito",
  "garantia",
  "garantido",
  "comprovado",
  "melhor do mercado",
  "desconto",
  "promocao",
  "promocao exclusiva",
  "resultado certo",
  "sem risco"
];

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractCriticalTokens(text) {
  const source = String(text || "");
  const patterns = [
    /https?:\/\/\S+/gi,
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,
    /(?:r\$\s*)?\d+(?:[.,]\d+)?%?/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{2,5}-?\d{4,5}\b/g
  ];

  return [
    ...new Set(
      patterns
        .flatMap((pattern) => source.match(pattern) || [])
        .map((token) => normalizeText(token).replace(/\s+/g, "").trim())
        .filter(Boolean)
    )
  ];
}

function extractKeywords(text) {
  return [
    ...new Set(
      normalizeText(text)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
    )
  ];
}

function getKeywordOverlap(original, improved) {
  const originalKeywords = extractKeywords(original);
  if (originalKeywords.length === 0) {
    return {
      ratio: 1,
      originalKeywords,
      matchedKeywords: []
    };
  }

  const improvedKeywords = new Set(extractKeywords(improved));
  const matchedKeywords = originalKeywords.filter((word) => improvedKeywords.has(word));
  const denominator = Math.min(originalKeywords.length, 12);

  return {
    ratio: Math.min(matchedKeywords.length, denominator) / denominator,
    originalKeywords,
    matchedKeywords
  };
}

function getMaxAllowedLength(original) {
  const originalLength = String(original || "").trim().length;
  return Math.max(Math.ceil(originalLength * 1.8), originalLength + 140);
}

function hasUnsupportedClaim(original, improved) {
  const normalizedOriginal = normalizeText(original);
  const normalizedImproved = normalizeText(improved);
  return UNSUPPORTED_CLAIMS.some(
    (claim) => normalizedImproved.includes(claim) && !normalizedOriginal.includes(claim)
  );
}

function isArtificialText(improved) {
  const text = String(improved || "");
  const normalized = normalizeText(text);
  if (/\b(como uma ia|como ia|sou uma ia|as an ai)\b/.test(normalized)) return true;
  if (/^[-*#>`]/m.test(text)) return true;
  if ((text.match(/!/g) || []).length > 2) return true;
  if ((text.match(/\?/g) || []).length > 3) return true;
  return false;
}

export function validateImprovedText(original, improved) {
  const originalText = String(original || "").trim();
  const improvedText = String(improved || "").trim();
  const issues = [];
  const originalLength = originalText.length;
  const improvedLength = improvedText.length;
  const maxAllowedLength = getMaxAllowedLength(originalText);
  const criticalTokens = extractCriticalTokens(originalText);
  const normalizedImproved = normalizeText(improvedText).replace(/\s+/g, "");
  const missingCriticalTokens = criticalTokens.filter(
    (token) => token && !normalizedImproved.includes(token)
  );
  const overlap = getKeywordOverlap(originalText, improvedText);

  if (!improvedText) issues.push("empty_output");
  if (improvedLength > maxAllowedLength) issues.push("too_long");
  if (missingCriticalTokens.length > 0) issues.push("missing_critical_tokens");
  if (overlap.originalKeywords.length >= 5 && overlap.ratio < 0.25) {
    issues.push("changed_meaning");
  }
  if (hasUnsupportedClaim(originalText, improvedText)) issues.push("invented_information");
  if (isArtificialText(improvedText)) issues.push("artificial_or_not_natural");
  if (originalLength > 0 && improvedLength < Math.max(8, Math.floor(originalLength * 0.25))) {
    issues.push("lost_too_much_context");
  }

  const needsShorter = issues.includes("too_long");
  const needsRegeneration = issues.some((issue) =>
    [
      "empty_output",
      "missing_critical_tokens",
      "changed_meaning",
      "invented_information",
      "artificial_or_not_natural",
      "lost_too_much_context"
    ].includes(issue)
  );

  return {
    isValid: issues.length === 0,
    issues,
    needsShorter,
    needsRegeneration,
    metrics: {
      originalLength,
      improvedLength,
      maxAllowedLength,
      keywordOverlap: Number(overlap.ratio.toFixed(2)),
      criticalTokens,
      missingCriticalTokens
    }
  };
}

export default validateImprovedText;
