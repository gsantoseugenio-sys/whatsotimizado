const KEYWORD_GROUPS = {
  venda: [
    "comprar",
    "compra",
    "preco",
    "valor",
    "orcamento",
    "desconto",
    "oferta",
    "promocao",
    "fechar",
    "venda",
    "produto",
    "servico",
    "plano",
    "pacote",
    "cliente",
    "pagamento"
  ],
  atendimento: [
    "ajuda",
    "suporte",
    "atendimento",
    "pedido",
    "protocolo",
    "duvida",
    "confirmar",
    "acompanhar",
    "resolver",
    "retorno",
    "informacao",
    "encaminhar"
  ],
  profissional: [
    "reuniao",
    "projeto",
    "prazo",
    "contrato",
    "proposta",
    "relatorio",
    "equipe",
    "alinhamento",
    "documento",
    "analise",
    "processo",
    "resultado"
  ],
  informal: [
    "oi",
    "ola",
    "beleza",
    "valeu",
    "tranquilo",
    "blz",
    "top",
    "show",
    "kkk",
    "haha",
    "e ai",
    "tudo bem"
  ],
  emocional: [
    "sinto",
    "saudade",
    "feliz",
    "triste",
    "chateado",
    "preocupado",
    "amor",
    "carinho",
    "magoado",
    "ansioso",
    "emocionado",
    "coracao"
  ],
  cobranca: [
    "cobranca",
    "cobrar",
    "pagar",
    "pagamento",
    "pendente",
    "vencido",
    "atraso",
    "boleto",
    "fatura",
    "debito",
    "divida",
    "em aberto"
  ],
  desculpa: [
    "desculpa",
    "perdao",
    "me perdoe",
    "foi mal",
    "sinto muito",
    "peco desculpas",
    "peço desculpas",
    "falha minha",
    "me desculpe"
  ],
  reclamacao: [
    "problema",
    "reclamacao",
    "reclamar",
    "insatisfeito",
    "decepcionado",
    "ruim",
    "erro",
    "falha",
    "nao funcionou",
    "nao gostei",
    "atrasou",
    "prejudicado"
  ]
};

const TYPE_PRIORITY = [
  "cobranca",
  "desculpa",
  "reclamacao",
  "venda",
  "atendimento",
  "profissional",
  "emocional",
  "informal"
];

const FORMAL_HIGH = [
  "prezado",
  "prezada",
  "cordialmente",
  "atenciosamente",
  "solicito",
  "gostaria de",
  "por gentileza",
  "agradeco",
  "agradeço",
  "informamos",
  "venho por meio"
];

const FORMAL_LOW = [
  "oi",
  "e ai",
  "blz",
  "beleza",
  "valeu",
  "top",
  "show",
  "kkk",
  "haha",
  "mano",
  "cara"
];

const COMMERCIAL_KEYWORDS = [
  ...KEYWORD_GROUPS.venda,
  ...KEYWORD_GROUPS.cobranca,
  "lead",
  "orcamento",
  "orçamento",
  "cliente",
  "contratar",
  "assinar",
  "mensalidade"
];

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function countKeywordMatches(normalizedText, keywords) {
  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    if (!normalizedText.includes(normalizedKeyword)) return score;
    return score + (normalizedKeyword.includes(" ") ? 2 : 1);
  }, 0);
}

function getTextSize({ characterCount, wordCount }) {
  if (characterCount <= 180 || wordCount <= 28) return "curto";
  if (characterCount <= 800 || wordCount <= 130) return "medio";
  return "longo";
}

function detectMessageType(normalizedText) {
  const scores = Object.fromEntries(
    Object.entries(KEYWORD_GROUPS).map(([type, keywords]) => [
      type,
      countKeywordMatches(normalizedText, keywords)
    ])
  );

  let selectedType = "generica";
  let selectedScore = 0;

  for (const type of TYPE_PRIORITY) {
    const score = scores[type] || 0;
    if (score > selectedScore) {
      selectedType = type;
      selectedScore = score;
    }
  }

  return {
    messageType: selectedScore > 0 ? selectedType : "generica",
    typeScores: scores
  };
}

function detectTone({ normalizedText, messageType, commercialIntent, wordCount }) {
  if (
    messageType === "emocional" ||
    countKeywordMatches(normalizedText, KEYWORD_GROUPS.emocional) >= 2
  ) {
    return "emocional";
  }

  if (
    commercialIntent &&
    countKeywordMatches(normalizedText, ["fechar", "garantir", "oferta", "desconto", "proposta"]) > 0
  ) {
    return "persuasivo";
  }

  if (
    countKeywordMatches(normalizedText, ["obrigado", "obrigada", "por favor", "gentileza", "agradeco", "agradeço"]) >
    0
  ) {
    return "cordial";
  }

  if (
    messageType === "profissional" ||
    countKeywordMatches(normalizedText, FORMAL_HIGH) > 0
  ) {
    return "profissional";
  }

  if (
    wordCount <= 18 ||
    countKeywordMatches(normalizedText, ["preciso", "quero", "envie", "mande", "responda", "confirme"]) > 0
  ) {
    return "direto";
  }

  return "neutro";
}

function detectFormality(normalizedText) {
  const highScore = countKeywordMatches(normalizedText, FORMAL_HIGH);
  const lowScore = countKeywordMatches(normalizedText, FORMAL_LOW);

  if (highScore >= 1 && highScore >= lowScore) return "alto";
  if (lowScore >= 1 && lowScore > highScore) return "baixo";
  return "medio";
}

function detectCommercialIntent(normalizedText, messageType) {
  if (messageType === "venda" || messageType === "cobranca") return true;
  return countKeywordMatches(normalizedText, COMMERCIAL_KEYWORDS) >= 2;
}

export function classifyMessage(text) {
  const originalText = String(text || "");
  const normalizedText = normalizeText(originalText);
  const words = normalizedText.match(/[a-z0-9]+/g) || [];
  const wordCount = words.length;
  const characterCount = originalText.trim().length;
  const { messageType, typeScores } = detectMessageType(normalizedText);
  const commercialIntent = detectCommercialIntent(normalizedText, messageType);
  const formalityLevel = detectFormality(normalizedText);
  const tone = detectTone({
    normalizedText,
    messageType,
    commercialIntent,
    wordCount
  });

  return {
    messageType,
    tone,
    formalityLevel,
    commercialIntent,
    textSize: getTextSize({ characterCount, wordCount }),
    signals: {
      characterCount,
      wordCount,
      typeScores
    }
  };
}

export default classifyMessage;
