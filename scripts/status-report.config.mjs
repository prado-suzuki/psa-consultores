// @ts-check
/**
 * status-report.config.mjs
 * -------------------------------------------------------------------------
 * MANIFESTO dos marcos do roadmap OSG + regras de detecção no repo.
 *
 * Este é o "elo curado" entre o roadmap (que a coordenação mantém à mão no
 * Drive, em `03_Roadmap_e_Backlog/Roadmap_Visual/Marcos_P*.html`) e o código.
 * Quando o roadmap mudar (novo marco, marco vira 🟢/🟡/⚪), atualize aqui.
 *
 * Cada marco tem:
 *   - plataforma : "OSG Work" | "OSG Projects"
 *   - projeto    : rótulo do projeto (P1..P5)
 *   - sprint     : sprint alvo no roadmap (S09, S10-S11, ...)
 *   - marco      : o "o quê" (entrega)
 *   - dono       : responsável
 *   - statusRoadmap : status DECLARADO no roadmap → "mvp" | "pronto" | "parcial" | "novo"
 *   - detect     : sinais no repo (qualquer um positivo já conta):
 *        routes   : trechos procurados em App.tsx + protectedPages.ts
 *        files    : globs sobre caminhos de src/ (suporta * e **)
 *        keywords : termos procurados no conteúdo de src/ (.ts/.tsx)
 *
 * A detecção é HEURÍSTICA: presença de rota/arquivo = "✅ evidência";
 * só keyword = "🟨 parcial"; nada = "⬜ sem evidência". O gerador aponta
 * DIVERGÊNCIAS (ex.: roadmap 🟢 mas código ⬜, ou roadmap ⚪ mas código ✅)
 * para revisão humana.
 *
 * Regras calibradas com o inventário real do repo (rotas em src/App.tsx,
 * páginas em src/pages/equipe/osg/, componentes em src/components/equipe/osg/).
 * -------------------------------------------------------------------------
 */

export const META = {
  tool: "OSG (Work + Projects)",
  roadmapVersion: "v6 (16/07/2026)",
};

/** @typedef {{plataforma:string,projeto:string,sprint:string,marco:string,dono:string,statusRoadmap:"mvp"|"pronto"|"parcial"|"novo",detect:{routes?:string[],files?:string[],keywords?:string[]}}} Marco */

/** @type {Marco[]} */
export const MARCOS = [
  // ===================== P2 · Contratos (OSG Work) =====================
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (núcleo)",
    sprint: "S09",
    marco: "Contratos-base via Template Builder (motor gera .docx)",
    dono: "Bernardo",
    statusRoadmap: "parcial",
    detect: {
      routes: ["osg/work/gerar-documento"],
      files: [
        "src/pages/equipe/osg/GerarDocumento.tsx",
        "src/components/equipe/osg/gerar/EscolhaModelo.tsx",
        "src/components/equipe/osg/gerar/EscolhaEmpresa.tsx",
      ],
      keywords: ["documento_gerado", "useGeracaoDocumento"],
    },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (núcleo)",
    sprint: "S11",
    marco: "DP Inteligente + relatório de itens faltantes",
    dono: "Alexandre",
    statusRoadmap: "mvp",
    detect: {
      routes: ["osg/work/diagnostico-patrimonial"],
      files: [
        "src/pages/equipe/osg/DiagnosticoPatrimonial.tsx",
        "src/hooks/useDiagnosticoPatrimonial.ts",
      ],
      keywords: ["useOsgChecklist"],
    },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (núcleo)",
    sprint: "S12",
    marco: "Onda 1 completa + Biblioteca de Cláusulas + Cascata v1",
    dono: "Bernardo",
    statusRoadmap: "novo",
    detect: {
      routes: ["osg/work/biblioteca-modelos", "osg/work/montagem-documentos"],
      files: [
        "src/pages/equipe/osg/BibliotecaModelos.tsx",
        "src/pages/equipe/osg/MontagemDocumentos.tsx",
        "src/components/equipe/osg/OverrideBlocoDialog.tsx",
      ],
      keywords: ["tmpl_bloco", "documento_override"],
    },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (núcleo)",
    sprint: "S13-S15",
    marco: "Planejamento tributário rural + interface com o Fiscal",
    dono: "Alexandre",
    statusRoadmap: "parcial",
    detect: {
      keywords: ["contexto-para-o-fiscal", "Planejamento Tributário", "Abertura de Demanda"],
    },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (núcleo)",
    sprint: "S13-S16",
    marco: "Onda 2 — variações (alterações, rurais, doação de quotas)",
    dono: "Bernardo",
    statusRoadmap: "novo",
    detect: { keywords: ["alteração contratual", "doação de quotas", "parceria rural", "composse"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (núcleo)",
    sprint: "S17-S20",
    marco: "Onda 3 — governança (Acordo de Quotistas, regimento, alçadas)",
    dono: "Bernardo",
    statusRoadmap: "novo",
    detect: { keywords: ["Acordo de Quotistas", "matriz de alçadas", "regimento interno"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (cadastros de apoio)",
    sprint: "—",
    marco: "Qualificação das Partes (pessoas PF/PJ + parentescos)",
    dono: "Alexandre",
    statusRoadmap: "mvp",
    detect: {
      routes: ["osg/work/qualificacao-das-partes"],
      files: ["src/pages/equipe/osg/QualificacaoDasPartes.tsx", "src/hooks/useQualificacaoDasPartes.ts"],
    },
  },
  {
    plataforma: "OSG Work",
    projeto: "P2 · Contratos (cadastros de apoio)",
    sprint: "—",
    marco: "Quadro Societário (quotas/participação por empresa)",
    dono: "Alexandre",
    statusRoadmap: "mvp",
    detect: {
      routes: ["osg/work/quadro-societario"],
      files: ["src/pages/equipe/osg/QuadroSocietario.tsx", "src/hooks/useQuadroSocietario.ts"],
    },
  },

  // ===================== P1 · Gestão (OSG Projects) =====================
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S09",
    marco: "Catálogo de produtos + tela de Demandas",
    dono: "Alexandre",
    statusRoadmap: "parcial",
    detect: {
      routes: ["osg/projetos/cadastro"],
      files: ["src/hooks/useOsProdutosContratados.ts", "src/hooks/useOrgProjects.ts"],
      keywords: ["os_produtos_contratados", "produto_segmento"],
    },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S10",
    marco: "Página do Projeto — resumo + andamento (% concluído, prazos, horas)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    // Detecção estrita: a "Página do Projeto" da OSG Projects ainda não existe
    // (não confundir com o modal de projeto do módulo MAPA).
    detect: {
      files: ["src/pages/equipe/osg/PaginaProjeto*.tsx", "src/pages/equipe/osg/ProjetoDetalhe*.tsx"],
      keywords: ["Página do Projeto"],
    },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão (Recebimento/GED)",
    sprint: "S09",
    marco: "Recebimento de docs — upload na área do cliente (v0)",
    dono: "Eduardo",
    statusRoadmap: "mvp",
    detect: {
      routes: ["osg/work/documentos"],
      files: [
        "src/pages/equipe/osg/DocumentosCliente.tsx",
        "src/hooks/useDocumentoArquivo.ts",
        "src/components/equipe/osg/documentos/DocUploadDialog.tsx",
      ],
      keywords: ["documento_arquivo"],
    },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão (Recebimento/GED)",
    sprint: "S11",
    marco: "Classificação dos documentos recebidos (categoria + vínculo ao checklist)",
    dono: "Eduardo",
    statusRoadmap: "pronto",
    detect: {
      files: ["src/components/equipe/osg/documentos/docMeta.ts", "src/components/equipe/osg/documentos/checklistPadrao.ts"],
      keywords: ["osg_doc_categoria", "checklist_item_id"],
    },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S09-S10",
    marco: "Geração automática de tarefas ao abrir a demanda",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["geração automática de tarefas", "gerar tarefas do produto", "tarefas pré-ordenadas"] },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S10",
    marco: "Cadastro único de cliente (CNPJ puxa Receita)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: {
      files: ["src/hooks/useExternalConsults.ts"],
      keywords: ["brasilapi", "cnpj/v1"],
    },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S10",
    marco: "Visualizações Kanban e Gantt",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { files: ["src/**/*anban*.tsx", "src/**/*antt*.tsx"], keywords: ["KanbanBoard", "GanttChart"] },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S11",
    marco: "Lançamento de horas realizadas na própria tarefa (substitui Kairós)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["actual_hours", "horas realizadas", "apontamento de horas"] },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S11",
    marco: "Relatório / checklist de documentos pendentes",
    dono: "Alexandre",
    statusRoadmap: "mvp",
    detect: {
      routes: ["osg/work/relatorios"],
      files: ["src/pages/equipe/osg/Relatorios.tsx", "src/hooks/useOsgChecklist.ts"],
      keywords: ["checklist_cliente_item"],
    },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S13",
    marco: "Dashboards de gestão — 7 KPIs do sócio (faturamento, horas, atrasos)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["faturamento da área", "7 KPIs", "dashboard do gestor", "DashboardGerencial"] },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S16",
    marco: "Hub documental v1 (repositório único por cliente, busca por cliente)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["hub documental", "repositório único"] },
  },
  {
    plataforma: "OSG Projects",
    projeto: "P1 · Gestão de projetos e tarefas",
    sprint: "S17",
    marco: "Devolutiva e notificações ao cliente",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["notificação ao cliente", "devolutiva ao cliente"] },
  },

  // ===================== P3 · Sucessão + Tributário (OSG Work) =====================
  {
    plataforma: "OSG Work",
    projeto: "P3 · Sucessão + Tributário",
    sprint: "S13",
    marco: "Diagnóstico + planejamento tributário (interface OSG↔Fiscal)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["Planejamento Tributário", "contexto-para-o-fiscal"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P3 · Sucessão + Tributário",
    sprint: "S14",
    marco: "Calculadora de ITCMD (3 cenários, por UF)",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["ITCMD", "ITCD", "calculadora de itcmd"], files: ["src/**/*tcmd*.tsx", "src/**/*Itcd*.tsx"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P3 · Sucessão + Tributário",
    sprint: "S15",
    marco: "ITCMD entregue + Doação / AC reflexo",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["doação de quotas", "AC reflexo"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P3 · Sucessão + Tributário",
    sprint: "S16",
    marco: "Testamento / usufruto (instrumento alternativo)",
    dono: "Eduardo",
    statusRoadmap: "novo",
    detect: { keywords: ["testamento", "usufruto"] },
  },

  // ===================== P4 · Governança (OSG Work) =====================
  {
    plataforma: "OSG Work",
    projeto: "P4 · Governança",
    sprint: "S15",
    marco: "Diagnóstico de governança",
    dono: "Eduardo",
    statusRoadmap: "novo",
    detect: { keywords: ["diagnóstico de governança"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P4 · Governança",
    sprint: "S16",
    marco: "Acordo de Quotistas",
    dono: "Eduardo",
    statusRoadmap: "novo",
    detect: { keywords: ["Acordo de Quotistas"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P4 · Governança",
    sprint: "S16",
    marco: "Protocolo de Remuneração",
    dono: "Eduardo",
    statusRoadmap: "novo",
    detect: { keywords: ["Protocolo de Remuneração"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P4 · Governança",
    sprint: "S17",
    marco: "Matriz de Alçadas + Regimento Interno do Conselho",
    dono: "Eduardo",
    statusRoadmap: "novo",
    detect: { keywords: ["Matriz de Alçadas", "Regimento Interno"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P4 · Governança",
    sprint: "S18",
    marco: "AC Reflexo da Governança + Instalação do Conselho",
    dono: "Eduardo",
    statusRoadmap: "novo",
    detect: { keywords: ["Instalação do Conselho", "conselho de administração"] },
  },

  // ===================== P5 · Apresentações e relatórios (OSG Work) =====================
  {
    plataforma: "OSG Work",
    projeto: "P5 · Apresentações e relatórios",
    sprint: "S16",
    marco: "[SPEC] Gerador de apresentação (organograma + tabelas do DP)",
    dono: "Alexandre",
    statusRoadmap: "parcial",
    detect: { keywords: ["organograma", "organograma-societario"], files: ["src/**/*rganograma*.tsx"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P5 · Apresentações e relatórios",
    sprint: "S17",
    marco: "Apresentação Inicial (tributário e societário) automática",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["gerador de apresentação", "apresentação inicial"] },
  },
  {
    plataforma: "OSG Work",
    projeto: "P5 · Apresentações e relatórios",
    sprint: "S18",
    marco: "Apresentação Final de Sucessão + devolutiva",
    dono: "Alexandre",
    statusRoadmap: "novo",
    detect: { keywords: ["apresentação final", "devolutiva ao cliente"] },
  },
];
