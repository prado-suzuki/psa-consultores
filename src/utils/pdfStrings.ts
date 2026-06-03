// Strings visíveis ao usuário no PDF (Sumário Executivo + páginas do anexo).
// Centralizar aqui evita caça a texto pela base inteira na hora de revisar
// copywriting. Tudo em pt-BR.

export const PDF_STRINGS = {
  // ---------------- Página 1 — Sumário Executivo ----------------
  exec: {
    pageTitle: 'SUMÁRIO EXECUTIVO',
    metaSeparator: ' · ',
    metaProcesso: 'Processo',
    metaCluster: 'Cluster',
    metaData: 'Emissão',

    headlineHintSeparator: ' · ',
    headlineHintHoras: (h: string) => `${h} horas liberadas`,
    headlineHintEconomia: (e: string) => `${e} economizados no período`,
    headlineHintRetrabalho: (pp: string) => `${pp} pp menos retrabalho`,

    // Os três templates do headline são selecionados por generateHeadline()
    // conforme o perfil dos números (ver regra #3 do requisito).
    headlineExcepcional: (proc: string, roi: string, payback: string) =>
      `${proc} gera ROI excepcional de ${roi} com payback rápido de ${payback}.`,
    headlineSolido: (proc: string, roi: string) =>
      `${proc} entrega ROI sólido de ${roi} em 24 meses.`,
    headlineQualitativo: (proc: string, payback: string) =>
      `${proc} consolida ganhos qualitativos com retorno em ${payback}.`,
    headlineSemPayback: (proc: string) =>
      `${proc} consolida ganhos qualitativos no cenário projetado.`,

    kpiEconomiaLabel: (m: number) => `Economia / ${m}M`,
    kpiEconomiaSub: 'vs. cenário atual',
    kpiRoiLabel: (m: number) => `ROI / ${m}M`,
    kpiRoiSub: (m: number) => `Em ${m} meses`,
    kpiPaybackLabel: 'Payback',
    kpiPaybackSub: 'Tempo de recuperação',
    kpiHorasLabel: (m: number) => `Horas liberadas / ${m}M`,
    kpiHorasSub: 'Capacidade da equipe',
    kpiInvestLabel: 'Investimento',
    kpiInvestSub: 'Pagamento único (CapEx)',
    kpiResultadoLabel: (m: number) => `Resultado líquido (${m}M)`,
    kpiResultadoSub: 'Economia − investimento',

    tabelaTitulo: 'O que muda',
    tabelaCol: ['Indicador', 'Antes', 'Depois', 'Ganho'] as const,
    tabelaIndicadorCusto: (m: number) => `Custo / ${m}m`,
    tabelaIndicadorHoras: (m: number) => `Horas / ${m}m`,
    tabelaIndicadorRetrabalho: 'Retrabalho médio',
    tabelaIndicadorSistema: 'Sistema principal',
    tabelaIndicadorAuditoria: 'Auditoria / histórico',
    tabelaIndicadorAutoatend: 'Autoatendimento do cliente',
    tabelaSimples: { sim: 'Sim', nao: 'Não' },

    doresTitulo: 'Dores eliminadas',
    doresVazio: 'Nenhuma dor identificada no cenário atual.',

    recomendacaoLabel: 'RECOMENDAÇÃO',
    recomendacaoAprovar: (invest: string, payback: string, roi: string, m: number, horas: string) =>
      `Aprovar a implantação. O investimento de ${invest} se paga em ${payback} e gera ROI de ${roi} em ${m} meses, liberando ${horas} da equipe para atividades de maior valor.`,
    recomendacaoSemPayback: (invest: string, m: number) =>
      `Avaliar a implantação considerando ganhos qualitativos e de capacidade — o investimento de ${invest} ainda não tem retorno financeiro líquido positivo no horizonte de ${m} meses.`,

    rodapeAnexo: 'Detalhamento operacional (processo etapa-a-etapa) nas páginas seguintes.',
    rodapeMarca: 'PSA Consultores',
    rodapePagina: (n: number, total: number) => `Página ${n} de ${total}`,

    // Fallback quando o ROI não está disponível ou o diagnóstico tem campos faltando
    avisoIncompletoTitulo: 'Cálculo do ROI ainda incompleto',
    avisoIncompletoMsg: (faltando: number, incompletos: number) =>
      `Esta análise é parcial — preencha o diagnóstico para gerar o sumário executivo completo. ${faltando} campo${faltando !== 1 ? 's' : ''} faltando · ${incompletos} incompleto${incompletos !== 1 ? 's' : ''}.`,
  },

  // ---------------- Páginas seguintes (anexo) ----------------
  anexo: {
    secaoNumero: 'ANEXO',
    secaoTitulo: 'Detalhamento operacional',
    secaoIntro: 'Processo mapeado etapa a etapa, com cenário atual (As-Is) e cenário projetado (To-Be) lado a lado. Use estas páginas para auditar os números do sumário executivo ou aprofundar o entendimento operacional.',
    doresPageTitle: 'Dores identificadas no cenário atual',
    doresPageIntro: 'Pontos de fricção mapeados no processo — base para o redesenho do TO-BE.',
  },
};
