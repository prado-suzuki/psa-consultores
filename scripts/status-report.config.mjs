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
  // P1-LOG-ANOTACOES foi FUNDIDO aqui na v7 (24/07) — as keywords dele vieram para cá.
  "P1-PAGINA-PROJETO": {
    // Corrigido 03/09/2026: os dois arquivos da regra anterior NUNCA existiram.
    // A página é a OsgProjetos e a @menção vive em components/comentarios/.
    files: [
      "src/pages/equipe/osg/OsgProjetos.tsx",
      "src/components/comentarios/MencaoUsuario.ts",
      "src/hooks/useDomainOrgComments.ts",
    ],
    keywords: ["org_comment_mentions", "criar_org_comment"],
  },
  // Conversa em thread (o "Slack" da área de projetos) — marco próprio a partir de 25/07.
  "P1-FEED-PROJETO": { keywords: ["thread", "responder anotação", "projeto_comentario", "notificar mencionado"] },
  "P1-HORAS-DASHBOARD": { keywords: ["horas realizadas na sprint", "estimado × realizado", "horas_realizadas"] },
  "P1-CHECKLIST-DOCS-CODIGO": {
    files: ["src/components/equipe/osg/documentos/checklistPadrao.ts"],
    keywords: ["checklistPadrao", "cluster"],
  },
  "P1-CHECKLIST-EXTERNO": { keywords: ["checklist do cliente", "checklist externo", "o que falta entregar"] },
  "P1-REDESIGN-UX": {
    files: ["src/pages/equipe/osg/OsgClientes.tsx", "src/pages/equipe/osg/OsgTarefas.tsx"],
    keywords: ["Kanban aninhado"],
  },
  "P1-GERACAO-TAREFAS": {
    // Corrigido 03/09/2026: as keywords anteriores eram a PROSA do roadmap
    // ("geração automática de tarefas"), que o código nunca escreve.
    files: [
      "src/hooks/useGerarTarefasProjeto.ts",
      "src/components/equipe/ProdutosServicosTab.tsx",
    ],
    keywords: ["gerar_tarefas_projeto", "produto_tarefa_padrao"],
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
  // Corrigido 03/09/2026: o gatilho existe como tipo no catálogo de avisos internos.
  "P1-NOTIF-REVISAO": {
    files: ["src/lib/notificacoesInternas.ts"],
    keywords: ["tarefa_em_revisao"],
  },
  // Corrigido 03/09/2026: "7 KPIs" e "DashboardGerencial" não existem no código.
  // O Board de diretoria saiu entre 21/08 e 01/09, nos PRs #71 a #82.
  "P1-DASHBOARDS-KPI": {
    files: [
      "src/components/board/BoardStatStrip.tsx",
      "src/components/board/BoardBriefingDiretoria.tsx",
      "src/components/equipe/board/BoardLayout.tsx",
    ],
    keywords: ["BoardStatStrip", "BoardBriefingDiretoria"],
  },
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
  // Corrigido 03/09/2026: "recebimento v1" era o nome do marco, não do código.
  // O "integrado ao cadastro" é o vínculo do documento a pessoa/empresa/matrícula.
  "GED-V1-INTEGRADA": {
    files: [
      "src/hooks/useDocumentoArquivo.ts",
      "src/components/equipe/osg/documentos/DocVinculoDialog.tsx",
    ],
    keywords: ["useDocumentoArquivo"],
  },

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

  // =====================================================================
  // Bloco RURAL do P2 + camada estrutural — entrou no roadmap em 25/07.
  // Keywords ancoradas no vocabulário real do motor (docs/osg/arquitetura-sintese.md):
  // tmpl_bloco, tmpl_flag, projeto_flag_valor, documento_gerado, documento_override.
  // =====================================================================
  "P2-ONDA2-RURAL": {
    keywords: ["parceria rural", "parceiro-outorgante", "parceiro-outorgado", "composse", "cota do proprietário"],
  },
  "P2-INSTRUMENTOS-RURAIS": {
    keywords: ["comodato", "direito de superfície", "distrato de arrendamento", "aditivo de arrendamento"],
  },
  "P2-TERMO-SAFRA": {
    keywords: ["encerramento de safra", "termo de safra", "partilha dos frutos", "ajuste do percentual"],
  },
  "P2-AC-INTEGRALIZACAO": {
    keywords: ["concentração de cotas", "AC de integralização", "imóvel adicional", "exigência cartorial"],
  },
  "P2-HOLDING-INDIVIDUAL": { keywords: ["holding individual"] },
  "P2-CAPITAL-SOCIAL": { keywords: ["capital subscrito", "valor de integralização", "excedente", "Tema 796"] },
  "P2-ITBI-MONITOR": { keywords: ["ITBI", "imunidade", "atividade preponderante", "regra dos 50%"] },
  "P2-CHECKLIST-RISCOS-RURAL": { keywords: ["matriz de riscos", "checklist rural", "posição adotada"] },
  "P2-TEMPLATE-TAREFAS-RURAL": { keywords: ["migração rural", "ordem dos atos", "duração-padrão"] },
  "P2-CATALOGO-RURAL": { keywords: ["Migração Rural", "PF para PJ", "PF-PJ"] },
  "P2-INTERFACE-FISCAL": {
    keywords: ["contexto-para-o-fiscal", "cenário do fiscal", "percentual da parceria", "provisão de ITBI"],
  },
  // A governança entra e o contrato-base recompõe: é o mecanismo de FLAG do motor
  // (o motor já renumera por tipo de bloco e reancora as refs sozinho).
  "P2-REFLEXO-GOVERNANCA": {
    keywords: ["tmpl_flag", "projeto_flag_valor", "bloco de reflexo", "flag de governança"],
  },
  // ⚠️ Escopo a definir (o desenho da estrutura-alvo será discutido em separado).
  // Reescrever esta regra depois da decisão.
  "P2-ESTRUTURA-ALVO": { keywords: ["estrutura-alvo", "estrutura proposta", "matriz de destinação"] },

  // ---------------------------------------------------------------------
  // SEM regra de propósito — não deixam assinatura em src/:
  //   • tipo `teste`  (QA, UAT, correções) e tipo `estudo` (SPECs, ADR) já entram
  //     como detectavel:false pelo gen-status-report.mjs (detectavelFromTipo).
  //   • P1-ACESSOS-GRUPOS  → admin do Google Workspace, não é código.
  //   • GED-EXCLUSAO-GEF   → exclusão de dados em Lovable/GCS/BigQuery.
  //   • P2-COLUNAS-DP      → colunas no banco; conferir por migration, não por src/.
  // Estes três são tipo `ajuste`, então o relatório os mostra como ⬜ — é esperado.
  // ---------------------------------------------------------------------
};
