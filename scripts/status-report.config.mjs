// @ts-check
/**
 * status-report.config.mjs
 * -------------------------------------------------------------------------
 * REGRAS DE DETECÇÃO (código-side), casadas por `id` de marco.
 *
 * A FONTE ÚNICA dos marcos (id, projeto, sprint, dono, tipo, status, depende_de)
 * é o `roadmap.json` no Drive (03_Roadmap_e_Backlog/roadmap.json). O gerador de
 * status LÊ o roadmap.json e junta, por `id`, as regras abaixo.
 *
 * ⚠️ NUNCA regenere este arquivo a partir do roadmap.json: o roadmap NÃO tem as
 * regras de detecção (routes/files/keywords) — elas vivem aqui, no repo. Perder
 * este arquivo = o status tool para de detectar qualquer coisa.
 *
 * Cada entrada `id → { detect }`:
 *   routes   : trechos procurados em App.tsx + protectedPages.ts
 *   files    : globs sobre caminhos de src/ (suporta * e **)
 *   keywords : termos procurados no conteúdo de src/ (.ts/.tsx)
 *   docTerms : (opcional) termos extras p/ casar docs/planos em prosa
 *   pendencias : (opcional) número OU lista de pendências/bugs abertos →
 *                se há código E pendencias>0, o estado de código vira "ajuste" (🔧)
 *
 * IDs sem entrada aqui (ROI/adoção/etc.) ficam sem detecção — corretos, pois
 * são `medicao`/`adocao` (detectavel:false, derivado do tipo no roadmap.json).
 * -------------------------------------------------------------------------
 */

export const META = {
  tool: "OSG (Work + Projects)",
  fonte: "roadmap.json (03_Roadmap_e_Backlog) — fonte única dos marcos",
};

/** @typedef {{routes?:string[],files?:string[],keywords?:string[],docTerms?:string[],pendencias?:number|string[]}} Detect */

/** @type {Record<string, Detect>} */
export const DETECT = {
  // ---------------- P1 · Gestão (OSG Projects) ----------------
  "P1-CATALOGO-DEMANDAS": {
    routes: ["osg/projetos/cadastro"],
    files: ["src/hooks/useOsProdutosContratados.ts", "src/hooks/useOrgProjects.ts"],
    keywords: ["os_produtos_contratados", "produto_segmento"],
  },
  "P1-PAGINA-PROJETO": {
    files: ["src/pages/equipe/osg/PaginaProjeto*.tsx", "src/pages/equipe/osg/ProjetoDetalhe*.tsx"],
    keywords: ["Página do Projeto"],
  },
  "P1-GERACAO-TAREFAS": {
    keywords: ["geração automática de tarefas", "gerar tarefas do produto", "tarefas pré-ordenadas"],
  },
  "P1-CADASTRO-UNICO": { files: ["src/hooks/useExternalConsults.ts"], keywords: ["brasilapi", "cnpj/v1"] },
  "P1-PROPOSTA-ANEXA": { keywords: ["proposta comercial"] },
  "P1-KANBAN-GANTT": { files: ["src/**/*anban*.tsx", "src/**/*antt*.tsx"], keywords: ["KanbanBoard", "GanttChart"] },
  "P1-HORAS-TAREFA": { keywords: ["actual_hours", "horas realizadas", "apontamento de horas"] },
  "P1-RELATORIO-PENDENTES": {
    routes: ["osg/work/relatorios"],
    files: ["src/pages/equipe/osg/Relatorios.tsx", "src/hooks/useOsgChecklist.ts"],
    keywords: ["checklist_cliente_item"],
  },
  "P1-LOG-ANOTACOES": { keywords: ["@menção", "anotações do projeto", "mencionar responsável"] },
  "P1-NOTIF-REVISAO": { keywords: ["notificação ao gestor", "entrou em revisão", "notificar revisão"] },
  "P1-DASHBOARDS-KPI": { keywords: ["faturamento da área", "7 KPIs", "dashboard do gestor", "DashboardGerencial"] },
  "P1-ALERTA-PARADO": { keywords: ["projeto parado", "estagnação", "sem movimentação há"] },
  "P1-HUB-DOCUMENTAL": { keywords: ["hub documental", "repositório único"] },
  "P1-DEVOLUTIVA": { keywords: ["notificação ao cliente", "devolutiva ao cliente"] },
  // Incluídos a partir dos extras (features já existentes na OSG Projects)
  "P1-DASHBOARD-OSG": { routes: ["osg/dashboard"], files: ["src/pages/equipe/osg/OsgDashboard.tsx"] },
  "P1-CLIENTES-OSG": { routes: ["osg/projetos/clientes"], files: ["src/pages/equipe/osg/OsgClientes.tsx"] },
  "P1-TAREFAS-OSG": { routes: ["osg/projetos/tarefas"], files: ["src/pages/equipe/osg/OsgTarefas.tsx"] },
  "P1-AUDITORIA": { routes: ["osg/auditoria"], files: ["src/pages/equipe/osg/OsgAuditoria.tsx"] },

  // Recebimento / GED (projeto P1 no roadmap.json)
  "GED-UPLOAD": {
    routes: ["osg/work/documentos"],
    files: [
      "src/pages/equipe/osg/DocumentosCliente.tsx",
      "src/hooks/useDocumentoArquivo.ts",
      "src/components/equipe/osg/documentos/DocUploadDialog.tsx",
    ],
    keywords: ["documento_arquivo"],
  },
  "GED-PROTOCOLO": { keywords: ["protocolo de recebimento", "quem enviou", "protocolo de entrada"] },
  "GED-CLASSIFICACAO": {
    files: ["src/components/equipe/osg/documentos/docMeta.ts", "src/components/equipe/osg/documentos/checklistPadrao.ts"],
    keywords: ["osg_doc_categoria", "checklist_item_id"],
  },
  "GED-RASTREABILIDADE": { keywords: ["rastreabilidade", "quem baixou", "log de download"] },
  "GED-V1-INTEGRADA": { keywords: ["recebimento v1", "integrado ao cadastro"] },

  // ---------------- P2 · Contratos (OSG Work) ----------------
  "P2-TEMPLATE-BUILDER": {
    routes: ["osg/work/gerar-documento"],
    files: [
      "src/pages/equipe/osg/GerarDocumento.tsx",
      "src/components/equipe/osg/gerar/EscolhaModelo.tsx",
      "src/components/equipe/osg/gerar/EscolhaEmpresa.tsx",
    ],
    keywords: ["documento_gerado", "useGeracaoDocumento"],
  },
  // Combinado no roadmap.json: Qualificação das Partes + Quadro Societário
  "P2-CADASTROS-APOIO": {
    routes: ["osg/work/qualificacao-das-partes", "osg/work/quadro-societario"],
    files: [
      "src/pages/equipe/osg/QualificacaoDasPartes.tsx",
      "src/hooks/useQualificacaoDasPartes.ts",
      "src/pages/equipe/osg/QuadroSocietario.tsx",
      "src/hooks/useQuadroSocietario.ts",
    ],
  },
  "P2-CONTROLE-MATRICULAS": {
    routes: ["osg/work/controle-matriculas"],
    files: ["src/pages/equipe/osg/ControleMatriculas.tsx"],
  },
  "P2-DP-INTELIGENTE": {
    routes: ["osg/work/diagnostico-patrimonial"],
    files: ["src/pages/equipe/osg/DiagnosticoPatrimonial.tsx", "src/hooks/useDiagnosticoPatrimonial.ts"],
    keywords: ["useOsgChecklist"],
  },
  "P2-ONDA1": {
    keywords: ["integralização de capital", "constituição da agro", "constituição de sociedade"],
  },
  "P2-BIBLIOTECA-CLAUSULAS": {
    routes: ["osg/work/biblioteca-modelos", "osg/work/montagem-documentos"],
    files: ["src/pages/equipe/osg/BibliotecaModelos.tsx", "src/pages/equipe/osg/MontagemDocumentos.tsx"],
    keywords: ["tmpl_bloco"],
    docTerms: ["override de blocos"],
  },
  "P2-CASCATA": {
    files: ["src/components/equipe/osg/OverrideBlocoDialog.tsx"],
    keywords: ["documento_override", "cascata"],
  },
  "P2-PLANEJ-TRIB-RURAL": {
    keywords: ["contexto-para-o-fiscal", "Planejamento Tributário", "Abertura de Demanda"],
  },
  "P2-ONDA2": { keywords: ["alteração contratual", "doação de quotas", "parceria rural", "composse"] },
  "P2-ONDA3": { keywords: ["Acordo de Quotistas", "matriz de alçadas", "regimento interno"] },

  // ---------------- P3 · Sucessão + Tributário (OSG Work) ----------------
  "P3-DIAG-TRIBUTARIO": { keywords: ["Planejamento Tributário", "contexto-para-o-fiscal"] },
  "P3-CALC-ITCMD": { keywords: ["ITCMD", "ITCD", "calculadora de itcmd"], files: ["src/**/*tcmd*.tsx", "src/**/*Itcd*.tsx"] },
  // roadmap.json: P3-ITCMD-DOACAO (era P3-DOACAO-AC no config antigo)
  "P3-ITCMD-DOACAO": { keywords: ["doação de quotas", "AC reflexo"] },
  "P3-TESTAMENTO-USUFRUTO": { keywords: ["testamento", "usufruto"] },

  // ---------------- P4 · Governança (OSG Work) ----------------
  "P4-DIAGNOSTICO": { keywords: ["diagnóstico de governança"] },
  "P4-ACORDO-QUOTISTAS": { keywords: ["Acordo de Quotistas"] },
  "P4-PROTOCOLO-REMUNERACAO": { keywords: ["Protocolo de Remuneração"] },
  // Combinado no roadmap.json: Matriz de Alçadas + Regimento Interno do Conselho
  "P4-MATRIZ-REGIMENTO": { keywords: ["Matriz de Alçadas", "Regimento Interno"] },
  // Combinado no roadmap.json: AC Reflexo da Governança + Instalação do Conselho
  "P4-AC-REFLEXO-CONSELHO": {
    keywords: ["reflexo da governança", "AC reflexo da governança", "Instalação do Conselho", "conselho de administração"],
  },

  // ---------------- P5 · Apresentações (OSG Work) ----------------
  "P5-GERADOR-APRESENTACAO": { keywords: ["organograma", "organograma-societario"], files: ["src/**/*rganograma*.tsx"] },
  "P5-APRESENTACAO-INICIAL": { keywords: ["gerador de apresentação", "apresentação inicial"] },
  "P5-APRESENTACAO-FINAL": { keywords: ["apresentação final", "devolutiva ao cliente"] },
};
