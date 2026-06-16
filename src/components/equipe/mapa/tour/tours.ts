// Definição dos tours guiados do Digital MAPA (React Joyride v3).
//
// Modelo: a página de Projetos (landing) hospeda o tour "welcome" — o único que
// dá a visão geral, na ordem pedida: 1) filtro geral de cliente → 2) abas
// laterais → 3) botões e campos da própria página de Projetos. Cada outra aba
// (e a área de mapeamento) tem o SEU tour, focado só nos botões/campos daquela
// página. Todo tour auto-abre na 1ª visita e termina indicando o botão "?".
//
// Os `target` apontam para seletores `[data-tour="…"]` estáveis, espalhados
// pelo Layout e pelas páginas (independentes de classes de estilo).

import type { Step } from 'react-joyride';

export type TourId =
  | 'welcome'
  | 'processos'
  | 'mapear'
  | 'documentos'
  | 'sistemas'
  | 'responsaveis'
  | 'gargalos'
  | 'melhorias'
  | 'cascata'
  | 'dashboard-roi'
  | 'setor-evolucao'
  // Modais (auto-abrem na 1ª vez que o modal abre; replay pelo "?" do modal):
  | 'modal-projeto-form'
  | 'modal-projeto-detalhe'
  | 'modal-processo-form'
  | 'modal-documento-form'
  | 'modal-sistema-form'
  | 'modal-responsavel-form'
  | 'modal-gargalo-form'
  | 'modal-melhoria-form'
  | 'modal-processo-detalhe';

// Base de rota do módulo MAPA. Definida aqui (e não importada do Layout) para
// evitar ciclo de import: Layout → MapaTourProvider → tours.
export const MAPA_BASE = '/equipe/digital/mapa';

// Passo final padrão (páginas): indica o botão "?" do header.
const replayStep: Step = {
  target: '[data-tour="help"]',
  placement: 'bottom',
  title: 'Pronto!',
  content: 'Para rever este tour quando quiser, clique no “?” aqui no topo. Cada página tem o seu.',
};

// Passo final padrão (modais): indica o botão "?" do próprio modal.
const replayStepModal: Step = {
  target: '[data-tour="modal-help"]',
  placement: 'bottom',
  title: 'Pronto!',
  content: 'Para rever este guia, clique no “?” deste modal.',
};

// Tours de formulário-modal compartilham as âncoras genéricas modal-campo-1,
// modal-campo-2 e modal-salvar (só um modal abre por vez → sem ambiguidade).
function formModalSteps(s: {
  campo1Titulo: string;
  campo1: string;
  campo2Titulo: string;
  campo2: string;
  salvar: string;
}): Step[] {
  return [
    { target: '[data-tour="modal-campo-1"]', placement: 'bottom', title: s.campo1Titulo, content: s.campo1 },
    { target: '[data-tour="modal-campo-2"]', placement: 'bottom', title: s.campo2Titulo, content: s.campo2 },
    { target: '[data-tour="modal-salvar"]', placement: 'bottom', title: 'Salvar', content: s.salvar },
    replayStepModal,
  ];
}

// Abre o grupo "Cadastros" da sidebar antes de destacá-lo (contexto visual).
// Padrão `before` do Joyride (modo não-controlado): o tour aguarda a Promise.
const expandirCadastros = (): Promise<void> =>
  new Promise<void>((resolve) => {
    const toggle = document.querySelector<HTMLButtonElement>('[data-tour="nav-cadastros"]');
    if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
      toggle.click();
      window.setTimeout(resolve, 280);
    } else {
      resolve();
    }
  });

// ─── Welcome (Projetos) ──────────────────────────────────────────────────────
// 1) filtro geral → 2) abas laterais → 3) botões e campos de Projetos.
const welcome: Step[] = [
  // 1) Filtro geral de cliente
  {
    target: '[data-tour="cluster-bar"]',
    placement: 'bottom',
    title: 'Comece pelo cliente',
    content:
      'Este é o filtro geral. Escolha o cliente aqui e TODAS as páginas do MAPA passam a mostrar só os dados dele. Sem cliente, você vê tudo.',
  },
  // 2) Abas laterais
  {
    target: '[data-tour="nav-projetos"]',
    placement: 'right',
    title: 'Projetos',
    content: 'O topo do mapa: projetos (ex.: Contratos, Gestão) agrupam os processos. Fica vazio por enquanto — entra após a migração.',
  },
  {
    target: '[data-tour="nav-processos"]',
    placement: 'right',
    title: 'Etapas',
    content: 'O coração do mapa: aqui ficam as etapas (agrupadas por processo). Abra uma para detalhar as sub-etapas.',
  },
  {
    target: '[data-tour="nav-cadastros"]',
    placement: 'right',
    title: 'Cadastros',
    content:
      'Os catálogos de apoio: Responsáveis, Documentos, Sistemas, Gargalos e Melhorias. Cada um tem o próprio tour.',
    before: expandirCadastros,
  },
  {
    target: '[data-tour="nav-cascata"]',
    placement: 'right',
    title: 'Cascata',
    content: 'O impacto jusante de um gargalo, derivado em tempo real a partir das sub-etapas de origem.',
  },
  {
    target: '[data-tour="nav-dashboard-roi"]',
    placement: 'right',
    title: 'Dashboard ROI',
    content: 'O retorno consolidado: investimento × economia, payback e horas liberadas.',
  },
  replayStep,
];

// ─── Helper para as abas de cadastro simples (CTA + busca + item + replay) ───
function cadastroSteps(opts: {
  ctaTitulo: string;
  ctaTexto: string;
  buscaTexto: string;
  itemTitulo: string;
  itemTexto: string;
}): Step[] {
  return [
    {
      target: '[data-tour="page-cta"]',
      placement: 'bottom',
      title: opts.ctaTitulo,
      content: opts.ctaTexto,
    },
    {
      target: '[data-tour="page-search"]',
      placement: 'bottom',
      title: 'Busca',
      content: opts.buscaTexto,
    },
    {
      target: '[data-tour="cadastro-item"]',
      placement: 'right',
      title: opts.itemTitulo,
      content: opts.itemTexto,
    },
    replayStep,
  ];
}

// ─── Processos ───────────────────────────────────────────────────────────────
const processos: Step[] = [
  {
    target: '[data-tour="page-cta"]',
    placement: 'bottom',
    title: 'Adicionar etapa',
    content: 'Cria uma etapa e a vincula a um processo. É aqui que o mapa começa a ganhar corpo.',
  },
  {
    target: '[data-tour="page-search"]',
    placement: 'bottom',
    title: 'Busca',
    content: 'Filtre por nome, processo ou descrição.',
  },
  {
    target: '[data-tour="processos-filtro-projeto"]',
    placement: 'bottom',
    title: 'Agrupar por processo',
    content: 'Filtre e agrupe as etapas por processo para focar numa frente de cada vez.',
  },
  {
    target: '[data-tour="processos-tags"]',
    placement: 'bottom',
    title: 'Status de mapeamento',
    content:
      'Veja quantas etapas já foram mapeadas e quantas faltam — clique numa tag para filtrar.',
  },
  {
    target: '[data-tour="processo-mapear"]',
    placement: 'left',
    title: 'Mapear sub-etapas',
    content:
      'A ação principal: abra o mapeamento para detalhar sub-etapas, responsáveis, sistemas e documentos.',
  },
  replayStep,
];

// ─── Mapeamento do processo (página /processos/:id/mapear) ───────────────────
const mapear: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Mapeamento da etapa',
    content:
      'Aqui você detalha a etapa em duas fotos — “Como era” (estado atual) e “Como ficou” (estado projetado) — e configura o ROI na aba “Configurar ROI”.',
  },
  {
    target: '[data-tour="mapear-tabs"]',
    placement: 'bottom',
    title: 'As abas',
    content:
      'Alterne entre Como era, Como ficou e Configurar ROI. Use “Editar Sub-etapas” em cada foto para cadastrar sub-etapas, responsáveis, sistemas, documentos e tempos.',
  },
  replayStep,
];

// ─── Cadastros simples ───────────────────────────────────────────────────────
const documentos = cadastroSteps({
  ctaTitulo: 'Adicionar documento',
  ctaTexto: 'Cadastre os documentos de referência que entram e saem das sub-etapas das etapas.',
  buscaTexto: 'Encontre um documento pelo nome.',
  itemTitulo: 'Seus documentos',
  itemTexto: 'Clique numa linha para editar; o ícone de lixeira (no hover) remove.',
});

const sistemas = cadastroSteps({
  ctaTitulo: 'Adicionar sistema',
  ctaTexto: 'Cadastre os sistemas e ferramentas usados nas sub-etapas — eles entram no custo do ROI.',
  buscaTexto: 'Encontre um sistema pelo nome.',
  itemTitulo: 'Seus sistemas',
  itemTexto: 'Clique para editar (nome, tipo, custo). As ações aparecem no hover da linha.',
});

const responsaveis = cadastroSteps({
  ctaTitulo: 'Adicionar responsável',
  ctaTexto:
    'Cadastre as pessoas/papéis que executam as sub-etapas. O custo-hora informado alimenta o cálculo de ROI.',
  buscaTexto: 'Encontre um responsável pelo nome ou papel.',
  itemTitulo: 'Seus responsáveis',
  itemTexto: 'Clique para editar o papel e o custo-hora; o hover revela editar/excluir.',
});

const gargalos = cadastroSteps({
  ctaTitulo: 'Novo gargalo',
  ctaTexto:
    'Registre um ponto de atrito e defina a origem (Processo, Sistema, Pessoas, Cliente ou Externo).',
  buscaTexto: 'Filtre por nome, descrição ou origem.',
  itemTitulo: 'Seus gargalos',
  itemTexto:
    'Abra para vincular etapas e sub-etapas de origem — é isso que alimenta a Cascata e o diagnóstico do ROI.',
});

const melhorias = cadastroSteps({
  ctaTitulo: 'Avaliar melhorias',
  ctaTexto: 'Cadastre as melhorias propostas e ligue-as aos gargalos que elas resolvem.',
  buscaTexto: 'Filtre as melhorias por texto.',
  itemTitulo: 'Suas melhorias',
  itemTexto: 'Cada melhoria entra no plano de ação e no cálculo de investimento do Dashboard ROI.',
});

// ─── Cascata ─────────────────────────────────────────────────────────────────
const cascata: Step[] = [
  {
    target: '[data-tour="cascata-rail"]',
    placement: 'right',
    title: 'Escolha o gargalo',
    content:
      'Busque e selecione um gargalo com sub-etapas de origem. A cascata é derivada dele em tempo real.',
  },
  {
    target: '[data-tour="cascata-niveis"]',
    placement: 'bottom',
    title: 'Macro × Granular',
    content: 'Alterne entre a visão por etapa (macro) e por sub-etapa (granular).',
  },
  {
    target: '[data-tour="cascata-legenda"]',
    placement: 'top',
    title: 'Como ler o grafo',
    content:
      'A legenda mostra cada tipo de impacto: sub-etapa de origem, consumo de documento alterado e reexecução.',
  },
  replayStep,
];

// ─── Dashboard ROI ───────────────────────────────────────────────────────────
const dashboardRoi: Step[] = [
  {
    target: '[data-tour="roi-filtros"]',
    placement: 'bottom',
    title: 'Recorte da análise',
    content:
      'Processo, Etapa e Horizonte (12/24/36 meses) definem exatamente o que entra no cálculo de ROI.',
  },
  {
    target: '[data-tour="roi-stepper"]',
    placement: 'bottom',
    title: 'A narrativa em 6 passos',
    content:
      'Percorra Mapeamento → Diagnóstico → Melhorias → Cenário Futuro → ROI → Sumário Executivo.',
  },
  {
    target: '[data-tour="roi-export"]',
    placement: 'bottom',
    title: 'Exportar e editar',
    content:
      'Gere o CSV consolidado ou volte para a página de etapas para ajustar o escopo do processo.',
  },
  replayStep,
];

// ─── Evolução do Setor ───────────────────────────────────────────────────────
const setorEvolucao: Step[] = [
  {
    target: '[data-tour="setor-filtros"]',
    placement: 'bottom',
    title: 'Filtros do portfólio',
    content: 'Recorte a visão consolidada por processo e por período (início e fim).',
  },
  {
    target: '[data-tour="setor-kpis"]',
    placement: 'bottom',
    title: 'Indicadores consolidados',
    content:
      'Horas liberadas, economia anual, etapas com melhoria e ROI do portfólio — calculados ao vivo.',
  },
  {
    target: '[data-tour="setor-export"]',
    placement: 'left',
    title: 'Relatório do setor',
    content: 'Exporte o relatório consolidado do portfólio (impressão / PDF).',
  },
  replayStep,
];

// ─── Modais de formulário (campo-a-campo) ───────────────────────────────────
const modalProjetoForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'O nome do processo — como ele aparece em todas as listas do MAPA.',
  campo2Titulo: 'Status',
  campo2: 'A fase atual (Mapeamento → Diagnóstico → Melhorias → ROI). Define o que o Dashboard mostra.',
  salvar: 'Grava o processo. Cliente, datas e justificativas completam o cadastro.',
});

const modalProcessoForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'O nome da etapa.',
  campo2Titulo: 'Processo',
  campo2: 'Vincule a etapa a um processo — campo obrigatório que organiza o mapa.',
  salvar: 'Grava a etapa. Depois use “Mapear” para detalhar as sub-etapas.',
});

const modalDocumentoForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'O nome do documento de referência.',
  campo2Titulo: 'Tipo',
  campo2: 'Classifique o documento (tipo, formato, origem, estruturado ou não).',
  salvar: 'Grava o documento no catálogo, disponível para as sub-etapas.',
});

const modalSistemaForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'O nome do sistema ou ferramenta.',
  campo2Titulo: 'Custo mensal',
  campo2: 'O custo recorrente do sistema entra no cálculo de ROI.',
  salvar: 'Grava o sistema no catálogo.',
});

const modalResponsavelForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'A pessoa ou papel que executa sub-etapas das etapas.',
  campo2Titulo: 'Custo por hora',
  campo2: 'O custo-hora alimenta diretamente o cálculo de ROI das etapas.',
  salvar: 'Grava o responsável no catálogo (global, sem cluster).',
});

const modalGargaloForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'Dê nome ao ponto de atrito que trava o processo.',
  campo2Titulo: 'Origem',
  campo2: 'De onde vem o gargalo (Processo, Sistema, Pessoas, Cliente ou Externo).',
  salvar: 'Grava o gargalo. Vincule etapas e sub-etapas de origem para alimentar a Cascata.',
});

const modalMelhoriaForm = formModalSteps({
  campo1Titulo: 'Nome',
  campo1: 'O nome da melhoria proposta.',
  campo2Titulo: 'Gargalos resolvidos',
  campo2: 'Os gargalos que esta melhoria ataca — é o vínculo que liga a melhoria às etapas impactadas e alimenta o plano de ação.',
  salvar: 'Grava a melhoria e seus custos (execução, treinamento) para o ROI.',
});

// ─── Modais de detalhe ("Modal da Paz") ──────────────────────────────────────
const modalProcessoDetalhe: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Painel do processo',
    content: 'Tudo do processo reunido: etapas, documentos, sistemas, responsáveis, gargalos e melhorias vinculados.',
  },
  {
    target: '[data-tour="modal-tabs"]',
    placement: 'bottom',
    title: 'Seções',
    content: 'Expanda cada seção — Etapas, Documentos, Sistemas, Responsáveis, Gargalos e Melhorias — para ver tudo o que está vinculado a este processo.',
  },
  {
    target: '[data-tour="modal-acao"]',
    placement: 'bottom',
    title: 'Mapear',
    content: 'Abre a página de mapeamento completo das etapas.',
  },
  replayStepModal,
];

const modalProjetoDetalhe: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Painel do processo',
    content: 'Tudo do processo reunido: informações, etapas vinculadas e backlog de melhorias.',
  },
  {
    target: '[data-tour="modal-tabs"]',
    placement: 'bottom',
    title: 'Abas',
    content: 'Alterne entre Informações, Etapas e Backlog do processo.',
  },
  {
    target: '[data-tour="modal-acao"]',
    placement: 'bottom',
    title: 'Editar',
    content: 'Abre o formulário para alterar os dados do processo.',
  },
  replayStepModal,
];

export const TOURS: Record<TourId, Step[]> = {
  welcome,
  processos,
  mapear,
  documentos,
  sistemas,
  responsaveis,
  gargalos,
  melhorias,
  cascata,
  'dashboard-roi': dashboardRoi,
  'setor-evolucao': setorEvolucao,
  'modal-projeto-form': modalProjetoForm,
  'modal-projeto-detalhe': modalProjetoDetalhe,
  'modal-processo-form': modalProcessoForm,
  'modal-documento-form': modalDocumentoForm,
  'modal-sistema-form': modalSistemaForm,
  'modal-responsavel-form': modalResponsavelForm,
  'modal-gargalo-form': modalGargaloForm,
  'modal-melhoria-form': modalMelhoriaForm,
  'modal-processo-detalhe': modalProcessoDetalhe,
};

// Mapa rota → tour (rotas estáticas). O botão "?" e o auto-open usam resolveTour.
export const ROUTE_TO_TOUR: Record<string, TourId> = {
  [MAPA_BASE]: 'welcome',
  [`${MAPA_BASE}/processos`]: 'processos',
  [`${MAPA_BASE}/documentos`]: 'documentos',
  [`${MAPA_BASE}/sistemas`]: 'sistemas',
  [`${MAPA_BASE}/responsaveis`]: 'responsaveis',
  [`${MAPA_BASE}/gargalos`]: 'gargalos',
  [`${MAPA_BASE}/melhorias`]: 'melhorias',
  [`${MAPA_BASE}/cascata`]: 'cascata',
  [`${MAPA_BASE}/dashboard-roi`]: 'dashboard-roi',
  [`${MAPA_BASE}/setor-evolucao`]: 'setor-evolucao',
};

// Resolve o tour de uma rota, cobrindo a rota dinâmica de mapeamento.
export function resolveTour(pathname: string): TourId | null {
  if (pathname in ROUTE_TO_TOUR) return ROUTE_TO_TOUR[pathname];
  if (/\/processos\/[^/]+\/mapear$/.test(pathname)) return 'mapear';
  return null;
}
