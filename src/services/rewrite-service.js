import env from "../config/env.js";
import { responseCache } from "./cache-service.js";
import openai from "./openai-client.js";
import { hashPayload } from "../utils/hash.js";

const STYLE_META = {
  professional: {
    label: "Sugestao",
    strategy: "Melhorar clareza, impacto e naturalidade."
  },
  persuasive: {
    label: "Persuasivo",
    strategy: "Levar a pessoa para uma proxima acao concreta."
  },
  emotional: {
    label: "Emocional",
    strategy: "Criar conexao e empatia sem perder objetivo."
  },
  creative: {
    label: "Criativo",
    strategy: "Diferenciar a comunicacao mantendo foco em resultado."
  }
};

const CONTEXT_META = {
  business: "Uso empresarial",
  personal: "Uso pessoal",
  recreative: "Uso recreativo",
  quick_improve: "Aperfeicoamento rapido"
};

const LANGUAGE_META = {
  auto: "o mesmo idioma detectado na mensagem original",
  "pt-BR": "portugues do Brasil",
  en: "ingles",
  hi: "hindi",
  id: "indonesio",
  es: "espanhol"
};

const OBJECTIVE_META = {
  business_ceo: {
    label: "CEO / Empresario",
    strategy:
      "Transmitir visao estrategica, autoridade, clareza e tomada de decisao. Use linguagem segura, confiante e objetiva, com foco em resultado, crescimento, execucao, alinhamento e eficiencia. Evite excesso de emocao."
  },
  business_sales_manager: {
    label: "Gestor de vendas",
    strategy:
      "Converter, negociar e conduzir o cliente para decisao. Use linguagem pratica, direta e comercial, com foco em proposta, fechamento, negociacao, condicao, oferta, oportunidade, alinhamento e confirmacao."
  },
  business_marketing_analyst: {
    label: "Analista de marketing",
    strategy:
      "Comunicar com foco em estrategia de marketing. Use linguagem analitica e estruturada, com foco em publico-alvo, conversao, engajamento, posicionamento, campanha, funil, metricas e performance."
  },
  business_digital_influencer: {
    label: "Copywriter",
    strategy:
      "Persuadir, gerar interesse e conduzir para acao. Use linguagem envolvente, frases curtas e impactantes, com foco em desejo, beneficio, oportunidade, resultado, solucao e vantagem, sem exagero."
  },
  personal_loving: {
    label: "Amoroso",
    strategy:
      "Transmitir carinho, proximidade e afeto genuino. Use linguagem acolhedora e calorosa, com cuidado, valorizacao, suavidade e sensibilidade, sem romantizar em excesso."
  },
  personal_happy: {
    label: "Feliz",
    strategy:
      "Transmitir alegria, leveza e energia positiva. Use linguagem animada, frases dinamicas e entusiasmo natural, com exclamacoes moderadas e sem exagero artificial."
  },
  personal_nervous: {
    label: "Nervoso",
    strategy:
      "Transmitir irritacao, frustracao ou impaciencia de forma controlada. Use linguagem direta, curta e firme, com incomodo claro, sem agressividade extrema."
  },
  personal_cold_calculating: {
    label: "Frio e calculista",
    strategy:
      "Transmitir controle, racionalidade e distanciamento emocional. Use linguagem objetiva, neutra e logica, com foco em fatos, analise, decisao e resultado."
  },
  personal_sad: {
    label: "Triste",
    strategy:
      "Transmitir vulnerabilidade, desanimo ou melancolia. Use linguagem introspectiva, suave e reflexiva, com sensibilidade e sem dramatizacao exagerada."
  },
  personal_confident: {
    label: "Confiante",
    strategy:
      "Transmitir seguranca, clareza e firmeza. Use linguagem assertiva, frases diretas e controle da situacao, evitando duvida e sem soar arrogante."
  },
  personal_parable_analogy: {
    label: "Parabola / Analogia",
    strategy:
      "Transformar a mensagem em uma explicacao indireta por comparacao, metafora ou mini historia. Nao fale diretamente do problema principal; use situacoes simples, natureza ou historias simbolicas, com tom reflexivo, leve e inteligente."
  },
  personal_old_romantic_poet: {
    label: "Poeta romantico antigo",
    strategy: "Reescrever com romantismo classico, elegante e um toque poetico."
  },
  personal_highly_polite: {
    label: "Altamente educado",
    strategy: "Reescrever com maxima cordialidade, respeito e refinamento."
  },
  personal_charming: {
    label: "Galanteador",
    strategy: "Reescrever com charme, leveza e elogio elegante, sem ser invasivo."
  },
  recreative_ancient_king: {
    label: "Rei Antigo",
    strategy:
      "Transformar o texto em fala nobre, pomposa, teatral e quase comica. Use linguagem arcaica, tom cerimonial, autoridade caricatural e exagero proposital, preservando o sentido central."
  },
  recreative_existentialist: {
    label: "Filosofo Existencialista",
    strategy:
      "Transformar o texto em reflexao profunda, introspectiva e densa sobre existencia, sentido e consciencia. Use ritmo lento, perguntas filosoficas e abstracao controlada."
  },
  recreative_war_general: {
    label: "General em Guerra",
    strategy:
      "Transformar o texto em comando militar dramatico e estrategico. Use urgencia, acao, decisao, missao, avanco, posicao e metaforas de guerra sem perder o sentido central."
  },
  recreative_romantic_poet: {
    label: "Poeta Romantico",
    strategy:
      "Transformar o texto em expressao emocional intensa e poetica. Use imagens, metaforas, ritmo fluido, coracao, alma, paixao, saudade e exagero poetico permitido."
  },
  technical_terms: {
    label: "Termos tecnicos",
    strategy:
      "Transmitir precisao e dominio tecnico. Use linguagem formal e tecnica, com termos como implementacao, processo, metodologia, validacao, estrutura, analise, parametros, otimizacao e configuracao quando fizer sentido."
  },
  simple_language: {
    label: "Linguagem simples",
    strategy:
      "Facilitar compreensao e tornar o texto acessivel. Use frases curtas, palavras simples, comunicacao direta e linguagem natural. Evite termos tecnicos."
  },
  quick_improve: {
    label: "Aperfeicoado",
    strategy: "Apenas melhorar clareza, fluidez, gramatica e naturalidade mantendo a intencao original."
  }
};

function getObjectiveMeta(objective) {
  return OBJECTIVE_META[objective] || OBJECTIVE_META.quick_improve;
}

function fallbackSuggestion(text, style, creativePersona, objective) {
  const base = text.trim();
  const objectiveMeta = getObjectiveMeta(objective);
  if (objective === "quick_improve") {
    return base;
  }
  switch (style) {
    case "professional":
      return `${base}`;
    case "persuasive":
      return `${base}. Se voce concordar, avancamos hoje para garantir esse resultado.`;
    case "emotional":
      return `Quero te falar isso com cuidado: ${base}. A ideia e construir algo que funcione para voce.`;
    case "creative":
      return `[${creativePersona || "poeta"}] ${base}. Vamos transformar essa conversa em uma decisao concreta.`;
    default:
      return `${base} (${objectiveMeta.label})`;
  }
}

function choosePromptVariant({ cacheScope, context }) {
  const seed = hashPayload(`${cacheScope || "public"}:${context}`);
  const value = Number.parseInt(seed.slice(0, 2), 16);
  return value % 2 === 0 ? "A" : "B";
}

function buildPrompts({
  text,
  styles,
  context,
  creativePersona,
  objective,
  outputLanguage,
  promptVariant
}) {
  const styleInstructions = styles
    .map((style) => {
      const meta = STYLE_META[style];
      return `- style: "${style}", label: "${meta.label}", objetivo_estilo: "${meta.strategy}"`;
    })
    .join("\n");

  const contextLabel = CONTEXT_META[context] || CONTEXT_META.business;
  const objectiveMeta = getObjectiveMeta(objective);
  const languageLabel = LANGUAGE_META[outputLanguage] || LANGUAGE_META.auto;
  const languageInstruction =
    outputLanguage === "auto"
      ? "Detecte o idioma predominante da mensagem original e responda no mesmo idioma."
      : `Responda obrigatoriamente em ${languageLabel}.`;
  const objectiveInstruction = objectiveMeta.strategy;
  const personaLine = creativePersona
    ? `Para o estilo criativo, use a persona "${creativePersona}" sem exagerar.`
    : "";
  const specialModeLine =
    objective === "quick_improve"
      ? "Modo rapido: entregue apenas uma versao aperfeicoada, sem mudar objetivo, fatos ou tom principal."
      : objective === "technical_terms"
        ? "Termos tecnicos: detecte pelo texto a area profissional provavel e use vocabulario tecnico natural dessa area."
        : objective === "simple_language"
          ? "Linguagem simples: explique de forma direta, coloquial e, se util, use uma analogia curta."
          : "";
  const variantInstruction =
    promptVariant === "A"
      ? "Variante A: foco em clareza, frases curtas e CTA direto."
      : "Variante B: foco consultivo, pergunta de engajamento e CTA suave.";

  const systemPrompt = `
Voce e especialista em copy curta para WhatsApp orientada a resultado.
Mantenha intencao original da entrada.
${languageInstruction}
Objetivo central: ${objectiveInstruction}
Perfil de reescrita: ${objectiveMeta.label}
${variantInstruction}
${specialModeLine}
Use rigorosamente apenas o perfil de reescrita selecionado. Nao misture linguagem de outros perfis.
Se o contexto for Uso recreativo, permita exagero estilistico e impacto narrativo, preservando o sentido central.
Nao invente fatos, nao distorca contexto, nao use markdown.

Retorne JSON estrito no formato:
{
  "suggestions": [
    { "style": "professional", "label": "CEO / Empresario", "strategy": "...", "text": "..." }
  ]
}
Regras:
1) Uma sugestao por estilo solicitado.
2) Texto pronto para colar no WhatsApp.
3) Evite texto longo (ate 1.6x da entrada).
`.trim();

  const userPrompt = `
Contexto: ${contextLabel}
Reescrever como: ${objectiveMeta.label}
Idioma de saida: ${languageLabel}
${personaLine}
Estilos solicitados:
${styleInstructions}

Mensagem original:
"""${text}"""
`.trim();

  return { systemPrompt, userPrompt };
}

function normalizeSuggestions(rawSuggestions, requestedStyles, originalText, creativePersona, objective) {
  const list = Array.isArray(rawSuggestions) ? rawSuggestions : [];
  const byStyle = new Map();
  const objectiveMeta = getObjectiveMeta(objective);

  list.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const style = String(item.style || "").trim().toLowerCase();
    if (!requestedStyles.includes(style)) return;
    const text = String(item.text || "").trim();
    if (!text) return;
    byStyle.set(style, {
      style,
      label: objectiveMeta.label || String(item.label || STYLE_META[style]?.label || style),
      strategy: objectiveMeta.strategy || String(item.strategy || STYLE_META[style]?.strategy || ""),
      text
    });
  });

  return requestedStyles.map((style) => {
    const existing = byStyle.get(style);
    if (existing) return existing;
    return {
      style,
      label: objectiveMeta.label || STYLE_META[style]?.label || style,
      strategy: objectiveMeta.strategy || STYLE_META[style]?.strategy || "Foco em resultado",
      text: fallbackSuggestion(originalText, style, creativePersona, objective)
    };
  });
}

function parseCompletionContent(completion) {
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || "").join("").trim();
  }
  return "";
}

export async function generateRewrites({
  text,
  styles,
  context,
  objective,
  outputLanguage,
  creativePersona,
  cacheScope
}) {
  const promptVariant = choosePromptVariant({ cacheScope, context });
  const cacheKey = hashPayload({
    text,
    styles: [...styles].sort(),
    context,
    objective,
    outputLanguage,
    creativePersona,
    promptVariant,
    cacheScope: cacheScope || "public",
    model: env.OPENAI_MODEL
  });

  const cachedPayload = await responseCache.get(cacheKey);
  if (cachedPayload) {
    return {
      ...cachedPayload,
      cached: true
    };
  }

  const { systemPrompt, userPrompt } = buildPrompts({
    text,
    styles,
    context,
    objective,
    outputLanguage,
    creativePersona,
    promptVariant
  });

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const rawJson = parseCompletionContent(completion);
    const parsed = JSON.parse(rawJson || "{}");
    const suggestions = normalizeSuggestions(parsed.suggestions, styles, text, creativePersona, objective);
    const payload = {
      suggestions,
      promptVariant,
      objective
    };

    await responseCache.set(cacheKey, payload);
    return {
      ...payload,
      cached: false
    };
  } catch (error) {
    const wrappedError = new Error("Falha ao gerar reescritas com IA.");
    wrappedError.status = 502;
    wrappedError.cause = error;
    throw wrappedError;
  }
}
