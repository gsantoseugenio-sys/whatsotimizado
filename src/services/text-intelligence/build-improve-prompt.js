const TYPE_INSTRUCTIONS = {
  venda:
    "Mensagem de venda: melhore clareza, desejo e proxima acao, sem prometer desconto, garantia ou condicao que nao esteja no texto original.",
  atendimento:
    "Mensagem de atendimento: seja prestativo, claro e acolhedor, mantendo uma resposta objetiva e facil de entender.",
  profissional:
    "Mensagem profissional: deixe o texto mais claro, organizado e seguro, com postura profissional e sem excesso de formalidade.",
  informal:
    "Mensagem informal: preserve naturalidade de conversa, melhore fluidez e corrija ruídos sem deixar robotico.",
  emocional:
    "Mensagem emocional: preserve sentimento original, torne o texto mais cuidadoso e humano, sem dramatizar.",
  cobranca:
    "Mensagem de cobranca: seja firme, educado e direto, sem agressividade e sem criar prazos ou valores novos.",
  desculpa:
    "Mensagem de desculpa: reconheca o problema com maturidade, mantenha responsabilidade e evite exageros.",
  reclamacao:
    "Mensagem de reclamacao: organize a insatisfacao com firmeza e respeito, sem ofensas e sem ampliar fatos.",
  generica:
    "Mensagem generica: melhore clareza, naturalidade, gramatica e impacto mantendo a intencao original."
};

const TONE_INSTRUCTIONS = {
  neutro: "Tom neutro: mantenha equilibrio e evite intensidade desnecessaria.",
  cordial: "Tom cordial: use educacao natural, sem soar bajulador.",
  persuasivo: "Tom persuasivo: deixe a mensagem convincente, mas sem apelar ou inventar beneficios.",
  profissional: "Tom profissional: transmita seguranca, respeito e objetividade.",
  emocional: "Tom emocional: mantenha empatia e sensibilidade, sem exagerar.",
  direto: "Tom direto: seja claro e economico nas palavras."
};

const FORMALITY_INSTRUCTIONS = {
  baixo: "Formalidade baixa: mantenha linguagem simples e conversacional.",
  medio: "Formalidade media: soe natural, educado e profissional quando necessario.",
  alto: "Formalidade alta: use linguagem mais polida, sem ficar artificial."
};

const OBJECTIVE_STYLE_GUIDES = {
  business_ceo: {
    label: "CEO / Empresario",
    objective: "Transmitir visao estrategica, autoridade, clareza e tomada de decisao.",
    characteristics: [
      "Linguagem segura, confiante e objetiva.",
      "Use termos estrategicos e de negocio quando fizer sentido.",
      "Foque em resultado, crescimento, execucao e direcionamento.",
      "Evite excesso de emocao.",
      "Estruture a mensagem de forma clara e assertiva."
    ],
    vocabulary: [
      "estrategia",
      "posicionamento",
      "crescimento",
      "resultado",
      "execucao",
      "alinhamento",
      "eficiencia",
      "expansao",
      "decisao",
      "direcionamento"
    ],
    tone: "direto, confiante e executivo"
  },
  business_marketing_analyst: {
    label: "Analista de Marketing",
    objective: "Analisar, estruturar e comunicar com foco em estrategia de marketing.",
    characteristics: [
      "Linguagem analitica e estruturada.",
      "Use conceitos de marketing sem exagerar.",
      "Foque em publico, posicionamento e desempenho.",
      "Pode deixar o raciocinio implicito de forma leve.",
      "Mantenha clareza e leitura facil."
    ],
    vocabulary: [
      "publico-alvo",
      "conversao",
      "engajamento",
      "posicionamento",
      "campanha",
      "estrategia",
      "funil",
      "aquisicao",
      "retencao",
      "metricas",
      "performance"
    ],
    tone: "analitico, estrategico e levemente explicativo"
  },
  business_digital_influencer: {
    label: "Copywriter",
    objective: "Persuadir, gerar interesse e conduzir para uma acao.",
    characteristics: [
      "Linguagem envolvente.",
      "Foque em desejo, beneficio e acao.",
      "Use gatilhos mentais com moderacao.",
      "Prefira frases curtas e impactantes.",
      "Pode incluir leve senso de urgencia quando couber."
    ],
    vocabulary: [
      "oportunidade",
      "resultado",
      "beneficio",
      "transformacao",
      "exclusivo",
      "agora",
      "simples",
      "direto",
      "solucao",
      "vantagem"
    ],
    tone: "persuasivo, envolvente e natural, sem exagero"
  },
  business_sales_manager: {
    label: "Gestor de Vendas",
    objective: "Converter, negociar e conduzir o cliente para decisao.",
    characteristics: [
      "Linguagem pratica e orientada a acao.",
      "Foque em resolver objecoes.",
      "Conduza para fechamento quando o texto permitir.",
      "Deixe a proposta clara.",
      "Evite rodeios."
    ],
    vocabulary: [
      "proposta",
      "fechamento",
      "negociacao",
      "condicao",
      "oferta",
      "oportunidade",
      "alinhamento",
      "disponibilidade",
      "garantir",
      "confirmacao"
    ],
    tone: "direto, comercial e orientado a resultado"
  },
  technical_terms: {
    label: "Termos Tecnicos",
    objective: "Transmitir precisao e dominio tecnico.",
    characteristics: [
      "Linguagem mais formal e tecnica.",
      "Use termos especificos do contexto.",
      "Estruture a mensagem com clareza.",
      "Evite simplificacoes excessivas.",
      "Nao invente dados, areas ou especificacoes."
    ],
    vocabulary: [
      "implementacao",
      "processo",
      "metodologia",
      "validacao",
      "estrutura",
      "analise",
      "execucao tecnica",
      "parametros",
      "otimizacao",
      "configuracao"
    ],
    tone: "tecnico, preciso e formal"
  },
  simple_language: {
    label: "Linguagem Simples",
    objective: "Facilitar compreensao e tornar o texto acessivel.",
    characteristics: [
      "Use frases curtas.",
      "Use palavras simples.",
      "Priorize clareza maxima.",
      "Evite termos tecnicos.",
      "Mantenha linguagem direta e natural."
    ],
    vocabulary: ["palavras comuns", "explicacoes simples", "comunicacao direta"],
    tone: "leve, claro e acessivel"
  },
  personal_loving: {
    label: "Amoroso",
    objective: "Transmitir carinho, proximidade e afeto genuino.",
    characteristics: [
      "Linguagem acolhedora e calorosa.",
      "Demonstre cuidado e valorizacao.",
      "Pode incluir leve romantizacao sem exagero.",
      "Use frases suaves e fluidas.",
      "A emocao deve ser perceptivel sem mudar o sentido original."
    ],
    vocabulary: [
      "carinho",
      "saudade",
      "especial",
      "importante",
      "comigo",
      "perto",
      "sentir",
      "cuidado",
      "voce"
    ],
    tone: "afetuoso, proximo e sensivel"
  },
  personal_happy: {
    label: "Feliz",
    objective: "Transmitir alegria, leveza e energia positiva.",
    characteristics: [
      "Linguagem leve e animada.",
      "Use exclamacoes com moderacao.",
      "Prefira frases mais dinamicas.",
      "Transmita entusiasmo natural.",
      "Nao transforme a mensagem em exagero artificial."
    ],
    vocabulary: [
      "feliz",
      "bom",
      "otimo",
      "alegria",
      "incrivel",
      "animado",
      "contente",
      "adorei",
      "muito bom"
    ],
    tone: "leve, positivo e energetico"
  },
  personal_nervous: {
    label: "Nervoso",
    objective: "Transmitir irritacao, frustracao ou impaciencia de forma controlada.",
    characteristics: [
      "Linguagem mais direta e curta.",
      "Pode haver leve tensao na construcao.",
      "Evite agressividade extrema.",
      "Demonstre incomodo claro.",
      "Mantenha firmeza sem ofender."
    ],
    vocabulary: [
      "serio",
      "nao esta certo",
      "complicado",
      "dificil",
      "problema",
      "ja falei",
      "nao faz sentido"
    ],
    tone: "tenso, direto e firme"
  },
  personal_cold_calculating: {
    label: "Frio e Calculista",
    objective: "Transmitir controle, racionalidade e distanciamento emocional.",
    characteristics: [
      "Linguagem objetiva e neutra.",
      "Nao use emocao explicita.",
      "Use estrutura logica.",
      "Foque em fatos e decisoes.",
      "Mantenha distanciamento emocional perceptivel."
    ],
    vocabulary: [
      "analise",
      "decisao",
      "avaliacao",
      "resultado",
      "necessario",
      "objetivo",
      "condicao",
      "ponto"
    ],
    tone: "frio, racional e controlado"
  },
  personal_sad: {
    label: "Triste",
    objective: "Transmitir vulnerabilidade, desanimo ou melancolia.",
    characteristics: [
      "Linguagem mais lenta e introspectiva.",
      "Pode expressar perda, cansaco ou peso emocional.",
      "Evite dramatizacao exagerada.",
      "Use frases suaves e reflexivas.",
      "Preserve sensibilidade sem inventar fatos."
    ],
    vocabulary: [
      "dificil",
      "triste",
      "cansado",
      "complicado",
      "nao sei",
      "sinto",
      "pesado",
      "desanimado"
    ],
    tone: "melancolico, introspectivo e sensivel"
  },
  personal_confident: {
    label: "Confiante",
    objective: "Transmitir seguranca, clareza e firmeza.",
    characteristics: [
      "Linguagem assertiva.",
      "Use frases diretas.",
      "Evite duvida.",
      "Demonstre controle da situacao.",
      "Passe firmeza sem soar arrogante."
    ],
    vocabulary: [
      "certeza",
      "claro",
      "confio",
      "vou",
      "resolvido",
      "tranquilo",
      "pode deixar",
      "garantido"
    ],
    tone: "seguro, firme e direto"
  },
  personal_parable_analogy: {
    label: "Parabola / Analogia",
    objective:
      "Transformar a mensagem em uma explicacao indireta usando comparacao, metafora ou pequena historia que represente o mesmo significado.",
    characteristics: [
      "Nao fale de forma direta sobre o problema principal.",
      "Use comparacao com situacoes simples do dia a dia, natureza ou historias simbolicas.",
      "Pode usar uma mini narrativa, parabola ou analogia clara.",
      "O leitor deve entender a mensagem por interpretacao.",
      "Mantenha conexao com o sentido original.",
      "Evite complexidade excessiva.",
      "Estrutura sugerida: imagem ou situacao inicial, desenvolvimento da analogia e fechamento que remeta ao sentido original de forma explicita ou implicita."
    ],
    vocabulary: [
      "como se fosse",
      "e como",
      "imagine",
      "assim como",
      "as vezes",
      "acontece que",
      "quando",
      "existe um momento em que"
    ],
    tone: "reflexivo, simbolico, leve e inteligente"
  },
  recreative_ancient_king: {
    label: "Rei Antigo",
    objective: "Transformar o texto em uma fala exageradamente nobre, teatral e quase comica.",
    characteristics: [
      "Use linguagem arcaica e pomposa.",
      "Use frases curtas e elaboradas.",
      "Aplique exagero proposital.",
      "Mantenha tom cerimonial e autoritario.",
      "Pode soar caricatural, mas preserve o sentido central."
    ],
    vocabulary: [
      "vossa majestade",
      "ordeno",
      "proclamo",
      "reino",
      "suditos",
      "honra",
      "destino",
      "glorioso",
      "decreto",
      "magnanimo"
    ],
    tone: "grandioso, teatral e exagerado"
  },
  recreative_existentialist: {
    label: "Filosofo Existencialista",
    objective: "Transformar o texto em uma reflexao profunda sobre existencia, sentido e consciencia.",
    characteristics: [
      "Use linguagem introspectiva.",
      "Prefira frases densas e reflexivas.",
      "Inclua questionamentos implicitos ou explicitos quando fizer sentido.",
      "Pode soar abstrato.",
      "Use ritmo mais lento e contemplativo."
    ],
    vocabulary: [
      "existencia",
      "sentido",
      "vazio",
      "consciencia",
      "realidade",
      "percepcao",
      "essencia",
      "escolha",
      "condicao humana"
    ],
    tone: "profundo, reflexivo e denso"
  },
  recreative_war_general: {
    label: "General em Guerra",
    objective: "Transformar o texto em uma fala de comando militar com urgencia e estrategia.",
    characteristics: [
      "Use linguagem firme e imperativa.",
      "Mantenha estrutura direta.",
      "Crie sensacao de urgencia.",
      "Pode usar metaforas de guerra.",
      "Foque em acao, decisao e objetivo."
    ],
    vocabulary: [
      "estrategia",
      "avanco",
      "posicao",
      "comando",
      "missao",
      "ataque",
      "defesa",
      "alinhar",
      "executar",
      "objetivo"
    ],
    tone: "dramatico, estrategico e intenso"
  },
  recreative_romantic_poet: {
    label: "Poeta Romantico",
    objective: "Transformar o texto em uma expressao emocional intensa e poetica.",
    characteristics: [
      "Use linguagem altamente emocional.",
      "Use metaforas e imagens.",
      "Permita exagero poetico.",
      "Mantenha ritmo fluido.",
      "Pode soar dramatico, sem perder o sentido central."
    ],
    vocabulary: [
      "coracao",
      "sentimento",
      "alma",
      "paixao",
      "saudade",
      "eterno",
      "sentir",
      "intensidade",
      "sonho"
    ],
    tone: "emocional, exagerado e poetico"
  }
};

function resolveLanguage(language) {
  const normalized = String(language || "pt-BR").trim();
  if (normalized === "auto") return "o mesmo idioma detectado na mensagem original";
  if (normalized === "pt-BR") return "portugues brasileiro";
  return `idioma solicitado (${normalized}), mantendo naturalidade local`;
}

function resolveLengthInstruction(maxLength) {
  if (maxLength === "shorter") {
    return "A resposta deve ficar mais curta que o texto original.";
  }
  if (maxLength === "expanded") {
    return "A resposta pode ser um pouco mais completa, mas nunca deve passar de 1.6x o tamanho original.";
  }
  return "A resposta deve ter tamanho similar ao texto original, no maximo levemente maior.";
}

function resolveStyleInstruction(style) {
  const normalized = String(style || "natural").trim().toLowerCase();
  if (normalized === "direct") return "Estilo preferido: direto, curto e sem rodeios.";
  if (normalized === "professional") return "Estilo preferido: profissional, claro e seguro.";
  if (normalized === "persuasive") return "Estilo preferido: persuasivo, natural e orientado a acao.";
  if (normalized === "friendly") return "Estilo preferido: amigavel, leve e humano.";
  if (normalized === "simple") return "Estilo preferido: simples, coloquial e facil de entender.";
  return "Estilo preferido: natural, humano e pronto para envio.";
}

function resolveObjectiveInstruction(objective) {
  const normalized = String(objective || "").trim();
  const guide = OBJECTIVE_STYLE_GUIDES[normalized];
  const isPersonalEmotion = normalized.startsWith("personal_");
  const isRecreativeStyle = normalized.startsWith("recreative_");
  if (!guide) {
    return `
Estilo selecionado: aperfeicoamento natural.
Objetivo do estilo: melhorar clareza, fluidez e naturalidade sem mudar o perfil da mensagem.
Regra de isolamento: use apenas este estilo e nao misture perfis.
`.trim();
  }

  return `
${isPersonalEmotion ? "Emocao selecionada" : "Estilo selecionado"}: ${guide.label}
Objetivo ${isPersonalEmotion ? "da emocao" : "do estilo"}: ${guide.objective}
Caracteristicas obrigatorias:
${guide.characteristics.map((item) => `- ${item}`).join("\n")}
Vocabulario esperado quando fizer sentido, sem forcar palavras:
${guide.vocabulary.map((item) => `- ${item}`).join("\n")}
Tom obrigatorio: ${guide.tone}.
Regra de isolamento: use apenas ${isPersonalEmotion ? "esta emocao" : "este estilo"}; nao misture linguagem de outros ${isPersonalEmotion ? "estados emocionais" : "estilos"}.
${isRecreativeStyle ? "Uso Recriativo: permita exagero estilistico, caricatura e intensidade narrativa, preservando o sentido central e sem inventar informacoes relevantes." : ""}
`.trim();
}

function resolvePlatformInstruction(domain) {
  const normalized = String(domain || "").toLowerCase();
  if (normalized.includes("whatsapp")) {
    return "Plataforma detectada: WhatsApp. Priorize mensagem curta, natural, conversacional e facil de responder.";
  }
  if (normalized.includes("mail.google") || normalized.includes("gmail")) {
    return "Plataforma detectada: Gmail. Priorize clareza profissional, bom fechamento e tom respeitoso.";
  }
  if (normalized.includes("instagram")) {
    return "Plataforma detectada: Instagram. Priorize leveza, naturalidade e frase curta de conversa.";
  }
  return "Plataforma detectada: campo de texto web. Priorize naturalidade e utilidade imediata.";
}

export function buildImprovePrompt(text, classification, userPreferences = {}) {
  const messageType = classification?.messageType || "generica";
  const tone = classification?.tone || "neutro";
  const formalityLevel = classification?.formalityLevel || "medio";
  const language = resolveLanguage(userPreferences.language);
  const typeInstruction = TYPE_INSTRUCTIONS[messageType] || TYPE_INSTRUCTIONS.generica;
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.neutro;
  const formalityInstruction =
    FORMALITY_INSTRUCTIONS[formalityLevel] || FORMALITY_INSTRUCTIONS.medio;
  const lengthInstruction = resolveLengthInstruction(userPreferences.maxLength);
  const styleInstruction = resolveStyleInstruction(userPreferences.style);
  const objectiveInstruction = resolveObjectiveInstruction(userPreferences.objective);
  const platformInstruction = resolvePlatformInstruction(userPreferences.domain);
  const adaptive = userPreferences.adaptivePreferences || {};
  const adaptiveLines = [];
  if (adaptive.preferredStyle) {
    adaptiveLines.push(`Preferencia aprendida do usuario: estilo ${adaptive.preferredStyle}.`);
  }
  if (adaptive.preferredLength === "curto") {
    adaptiveLines.push("Preferencia aprendida: mensagens curtas tendem a funcionar melhor para este usuario ou dominio.");
  }
  if (adaptive.prefersDirectMessages) {
    adaptiveLines.push("Preferencia aprendida: priorize objetividade e menos rodeios.");
  }
  if (adaptive.persuasiveIntensity === "low") {
    adaptiveLines.push("Preferencia aprendida: reduza intensidade persuasiva e evite tom vendedor demais.");
  }
  if (Array.isArray(adaptive.promptPerformance) && adaptive.promptPerformance[0]?.acceptanceRate >= 0.65) {
    const top = adaptive.promptPerformance[0];
    adaptiveLines.push(
      `Historico agregado: estilo ${top.style} teve boa aceitacao neste contexto; aproxime o tom sem copiar.`
    );
  }
  const commercialLine = classification?.commercialIntent
    ? "Ha intencao comercial detectada: preserve oportunidade, clareza de valor e proxima acao sem criar fatos."
    : "Nao force venda nem chamada comercial se isso nao estiver no texto original.";

  const systemPrompt = `
Voce e o motor de melhoria textual do WA AI Rewriter.
Sua tarefa e reescrever mensagens curtas para campos de texto no navegador.
Responda somente com JSON valido no formato: { "improvedText": "..." }.
No campo improvedText, retorne apenas o texto final reescrito, sem explicacoes.
Nao inclua markdown, analise, alternativas ou prompt.
Regras obrigatorias:
1) Preserve sentido, fatos, numeros, datas, nomes, valores, links e intencao original.
2) Nao invente informacoes, beneficios, descontos, prazos, promessas ou garantias.
3) Use ${language}.
4) O texto final deve soar natural no Brasil, humano e pronto para colar no campo da pagina.
5) Evite exagero, artificialidade, emojis e pontuacao excessiva.
6) Use rigorosamente um unico estilo ou emocao por vez: a opcao selecionada pelo usuario.
7) Em Uso Pessoal, ajuste vocabulario, ritmo e estrutura conforme a emocao escolhida.
8) Em Uso Recriativo, priorize impacto estilistico extremo sem perder o significado central.
`.trim();

  const userPrompt = `
Diretriz principal:
${objectiveInstruction}

Classificacao heuristica:
- tipo: ${messageType}
- tom provavel: ${tone}
- formalidade: ${formalityLevel}
- intencao comercial: ${classification?.commercialIntent ? "sim" : "nao"}
- tamanho: ${classification?.textSize || "curto"}

Direcionamento secundario, sem contrariar o estilo selecionado:
${typeInstruction}
${toneInstruction}
${formalityInstruction}
${styleInstruction}
${lengthInstruction}
${platformInstruction}
${adaptiveLines.join("\n")}
${commercialLine}

Texto original:
"""${String(text || "").trim()}"""
`.trim();

  return {
    systemPrompt,
    userPrompt
  };
}

export default buildImprovePrompt;
