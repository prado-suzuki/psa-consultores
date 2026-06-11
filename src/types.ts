// Tipos das entidades do MAPA — alinhados 1:1 com o schema do Supabase.
//
// Convenção:
//   - Campos que mapeiam direto pra colunas do DB: snake_case EN (= nome da
//     coluna). Nada de `nome → name` no leitor — ler direto o que o Postgres
//     devolve.
//   - Campos derivados de JOIN ou junções M:N: camelCase com nome que o
//     domínio MAPA usa (ex.: `processos[]` agregado de `gargalo_processos`).
//   - Campos sintéticos da UI (ex.: `ficou` no Etapa, `clusterName`):
//     camelCase indicando origem.
//
// FK convention: snake_case com sufixo `_id` (ex.: `project_id`, `cluster_id`)
// — espelha o DB e o resto do PSA Lovable.

// Base usado por entidades com schema EN (projects, processes, process_stages,
// job_roles). Tabelas PT-native (sistemas_processo, documentos_processo,
// gargalos) declaram `id`/`nome` direto sem extender.
export interface BaseEntity {
  id: string;
  name: string;
}

export type ProjetoStatus = 'Mapeamento' | 'Diagnóstico' | 'Melhorias' | 'ROI';

export type JustificativaProjeto =
  | 'Economia / Eficiência'
  | 'Automação'
  | 'Qualidade'
  | 'Comunicação'
  | 'Compliance';

export const JUSTIFICATIVAS_PROJETO: { value: JustificativaProjeto; label: string; tooltip: string }[] = [
  {
    value: 'Economia / Eficiência',
    label: 'Economia / Eficiência',
    tooltip: 'Marque quando o projeto reduz custo (R$) ou libera horas da equipe. Exemplo: automação que diminui retrabalho ou substitui tarefa manual.',
  },
  {
    value: 'Automação',
    label: 'Automação',
    tooltip: 'Marque quando o projeto substitui tarefas manuais por execução automática do sistema. Exemplo: cálculo de SELIC, trava de saldo, exportação de relatório.',
  },
  {
    value: 'Qualidade',
    label: 'Qualidade',
    tooltip: 'Marque quando o projeto reduz erros, retrabalho ou inconsistências. Exemplo: validação de campos, máscara de processo, padronização de dados.',
  },
  {
    value: 'Comunicação',
    label: 'Comunicação',
    tooltip: 'Marque quando o projeto melhora o fluxo de informação com clientes ou entre áreas. Exemplo: dashboard externo, relatório automático, autoatendimento.',
  },
  {
    value: 'Compliance',
    label: 'Compliance',
    tooltip: 'Marque quando o projeto reduz risco regulatório, fiscal ou de auditoria. Exemplo: histórico/auditoria de alterações, rastreabilidade de documentos, conformidade com Receita Federal.',
  },
];

// ═════════════════════════════════════════════════════════════════════════
//  Projeto — tabela `projects` (Lovable nativa + cols MAPA via integration)
// ═════════════════════════════════════════════════════════════════════════

export interface Projeto extends BaseEntity {
  description: string;
  cluster_id?: string | null;
  /** Nome do cluster, hidratado via PostgREST relation `estrutura_clusters(name)`. */
  clusterName?: string;
  projects_per_year?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: ProjetoStatus;
  /** Hidratado via junção `projeto_justificativas` (carregado em query separada). */
  justificativas?: JustificativaProjeto[];
}

// ═════════════════════════════════════════════════════════════════════════
//  Sistema — tabela `sistemas_processo`
// ═════════════════════════════════════════════════════════════════════════

export interface Sistema {
  id: string;
  /** Tabela PT-native — coluna do DB chama `nome`, não `name`. */
  nome: string;
  descricao: string;
  /** Custo da licença/assinatura (recorrente mensal). */
  custo_licenca_mensal: number;
  /** Custo variável por uso (mensal). */
  custo_variavel_por_uso: number;
  tipo?: string;
  origem?: string;
  custo_por_operacao?: number;
  custo_setup?: number;
  /** 'fixo' | 'variavel' | 'setup' | 'misto' */
  tipo_custo?: string;
  /** Hidratado via `sistema_responsaveis`. */
  responsaveisHoras?: ResponsavelHoras[];
  /** Hidratado via `sistema_clusters` — rateio (%) por cluster (Onda E). */
  clustersRateio?: SistemaClusterRateio[];
  obs_licenca?: string;
  obs_variavel?: string;
  obs_custo_por_operacao?: string;
}

export interface SistemaClusterRateio {
  cluster: string;
  rateio: number;
}

export type EstruturacaoDoc = 'Não Estruturado' | 'Semi Estruturado' | 'Estruturado';

// ═════════════════════════════════════════════════════════════════════════
//  Documento — tabela `documentos_processo`
// ═════════════════════════════════════════════════════════════════════════

export interface Documento {
  id: string;
  /** Tabela PT-native — coluna do DB chama `nome`, não `name`. */
  nome: string;
  tipo: string;
  formato: string;
  origem: string;
  /** Tempo de elaboração em minutos. */
  tempo_minutos: number;
  categoria?: string;
  estrutura_entrada?: string;
  estruturado?: EstruturacaoDoc;
}

export type FrequenciaProcesso =
  | 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Trimestral' | 'Anual';

export type StatusAvaliacao = 'Não avaliado' | 'Em avaliação' | 'Avaliado';

export type Complexidade = 'Baixa' | 'Média' | 'Alta';

// ═════════════════════════════════════════════════════════════════════════
//  Processo — tabela `processes`
// ═════════════════════════════════════════════════════════════════════════

export interface Processo extends BaseEntity {
  description: string;
  training_hours?: number | null;
  project_id?: string | null;
  order_index?: number | null;
  frequency?: FrequenciaProcesso | null;
  deliverable?: string | null;
  evaluation_status?: StatusAvaliacao | null;
  complexity_level?: Complexidade | null;
  mapped_at?: string | null;
}

// ═════════════════════════════════════════════════════════════════════════
//  Gargalo — tabela `gargalos`
// ═════════════════════════════════════════════════════════════════════════

export interface GargaloEtapaRef {
  etapaId: string;
  scenario: 'AS-IS' | 'TO-BE';
  /** Hidratado opcionalmente para a UI sem cruzamento. */
  etapaNome?: string;
  processo_id?: string;
  processoNome?: string;
  stage_order?: number;
}

export interface Gargalo {
  id: string;
  /** Coluna PT-native do DB (tabela `gargalos`). Mantém snake_case PT. */
  nome: string;
  descricao: string;
  /** Hidratado via `gargalo_processos` (M:N). Vínculo MACRO opcional — para
   *  gargalos "organizacionais" sem etapa específica. NÃO é usado pela
   *  cascata derivada. */
  processos: string[];
  /** Hidratado via `gargalo_etapas` (M:N com FK composta etapa_id+scenario).
   *  Etapas onde o gargalo se manifesta. Cada etapa-origem inicia uma BFS
   *  jusante (etapa → docsSaida → etapas que consomem → ...) que define a
   *  cascata, derivada em tempo real e exibida na CascataPage. */
  etapasOrigem: GargaloEtapaRef[];
  /** @deprecated Use `melhorias` (N:M via gargalo_melhorias). Mantido por compat. */
  melhoria_id?: string | null;
  /** Melhorias que atacam este gargalo. Hidratado via `gargalo_melhorias` (N:M). */
  melhorias?: string[];
  origem?: string;
  cluster_id?: string | null;
  /** Nome do cluster, hidratado via JOIN. */
  clusterName?: string;
  horas_gastas?: number;
  horas_implementacao?: number;
  taxa_ocorrencia?: number;
  taxa_captura_apos_melhoria?: number;
  custo_externo_unico?: number;
  /** Hidratado via `gargalo_responsaveis`. */
  responsaveisHoras?: ResponsavelHoras[];
}

// ═════════════════════════════════════════════════════════════════════════
//  Responsavel — tabela `job_roles`
// ═════════════════════════════════════════════════════════════════════════

export interface Responsavel extends BaseEntity {
  /** Coluna `level` do DB (junior/pleno/senior/...). */
  level: string;
  hourly_rate: number;
  type?: string;
  cluster_id?: string | null;
  clusterName?: string;
  /** Coluna `category` do DB. */
  category?: string;
}

export interface DocRef {
  documentoId?: string;
  nome: string;
  volume: number;
}

export interface PessoaRef {
  nome: string;
}

export interface ResponsavelEtapa {
  responsavelId?: string;
  nome: string;
  horas: number;
}

// ═════════════════════════════════════════════════════════════════════════
//  Etapa — tabela `process_stages` (cenário AS-IS/TO-BE via coluna scenario)
// ═════════════════════════════════════════════════════════════════════════

// Cenário projetado "Como Ficou" — espelho lateral, opcional.
export interface EtapaFicou {
  description?: string | null;
  execution?: string;
  lead_time_days?: number | null;
  volume_per_process?: number | null;
  error_rate?: number | null;
  rework_rate?: number | null;
  error_cost?: number | null;
  error_volume?: number | null;
  /** Hidratado via etapa_responsaveis cenario=TO-BE. */
  executadoPor?: ResponsavelEtapa[];
  /** Hidratado via etapa_responsaveis cenario=TO-BE (papel=aprovado). */
  aprovadoPor?: ResponsavelEtapa[];
  /** Hidratado via etapa_sistemas cenario=TO-BE. */
  sistemas?: string[];
  /** Hidratado via etapa_documentos cenario=TO-BE (sentido=entrada). */
  docsEntrada?: DocRef[];
  /** Hidratado via etapa_documentos cenario=TO-BE (sentido=saida). */
  docsSaida?: DocRef[];
}

export interface Etapa extends BaseEntity {
  description: string;
  process_id: string;
  execution: string;
  /** Lead time em dias do AS-IS. */
  lead_time_days?: number;
  volume_per_process?: number;
  error_rate?: number;
  rework_rate: number;
  error_cost?: number;
  error_volume?: number;
  /** Posição da etapa no processo (1-based). */
  stage_order?: number;
  // Junções hidratadas no hook (não vêm direto da row de process_stages):
  /** Hidratado via etapa_documentos cenario=AS-IS (sentido=entrada). */
  docsEntrada: DocRef[];
  /** Hidratado via etapa_documentos cenario=AS-IS (sentido=saida). */
  docsSaida: DocRef[];
  /** Hidratado via etapa_responsaveis cenario=AS-IS (papel=executado). */
  executadoPor: ResponsavelEtapa[];
  /** Hidratado via etapa_sistemas cenario=AS-IS. */
  sistemas: string[];
  /** IDs de gargalos que se manifestam nesta etapa. Hidratado via
   *  gargalo_etapas scenario=AS-IS — mesma junção que alimenta a cascata. */
  gargalos?: string[];
  /** Computado: soma do volume mensal agregando todos os projetos ativos. */
  volumeMensal: number;
  // Cenário "Como Ficou" — null/ausente quando sem projeção salva.
  ficou?: EtapaFicou | null;
}

export interface RoiReport {
  process_id: string;
  processoNome: string;
  tempoTotalAtual: number;
  tempoTotalProjetado: number;
  horasEconomizadasMes: number;
  custoMensalAtual: number;
  custoMensalFuturo: number;
  economiaFinanceiraMensal: number;
  investimentoInicial: number;
  retornoAnualizado: number;
  roi_percent: number;
  payback_months: number;
}

export interface ResponsavelHoras {
  nome: string;
  horas: number;
  responsavelId?: string;
}

export type MelhoriaStatus = 'Não iniciado' | 'Em progresso' | 'Concluído' | 'Backlog';

export const MELHORIA_STATUSES: MelhoriaStatus[] = [
  'Não iniciado',
  'Em progresso',
  'Concluído',
  'Backlog',
];

// Tipos de Ação de Transformação Digital. Cada melhoria pode ter 0..N.
export type AcaoTd =
  | 'Mapear AS-IS'
  | 'Padronizar'
  | 'Documentar'
  | 'Automatizar'
  | 'Redesenhar TO-BE'
  | 'Treinar';

export const ACOES_TD: AcaoTd[] = [
  'Mapear AS-IS',
  'Padronizar',
  'Documentar',
  'Automatizar',
  'Redesenhar TO-BE',
  'Treinar',
];

// ═════════════════════════════════════════════════════════════════════════
//  Melhoria — tabela `process_improvements`
// ═════════════════════════════════════════════════════════════════════════

export interface Melhoria {
  id: string;
  /**
   * MAPA usa esta coluna do DB pra título — não há `name` na process_improvements.
   * Mantém snake_case PT (não é EN no DB).
   */
  improvement_description: string;
  improvement_status?: MelhoriaStatus | null;
  cluster_id?: string | null;
  clusterName?: string;
  training_hours?: number | null;
  one_time_external_cost?: number | null;
  // Junções hidratadas no hook:
  /** Hidratado via `melhoria_processos`. */
  processos: string[];
  /** Hidratado via `melhoria_sistemas`. */
  sistemas: string[];
  /** Hidratado via `melhoria_responsaveis` (papel=executor). */
  executadoPor: ResponsavelHoras[];
  /** Hidratado via `melhoria_responsaveis` (papel=treinando). */
  treinamentoPor?: ResponsavelHoras[];
  /** Hidratado via `melhoria_acoes_td`. */
  acoesTd?: AcaoTd[];
  /** Gargalos atacados por esta melhoria. Hidratado via `gargalo_melhorias` (N:M). */
  gargalos?: string[];
}

// ═════════════════════════════════════════════════════════════════════════
//  ProcessSnapshot — tabela `process_scenarios`
// ═════════════════════════════════════════════════════════════════════════

export interface ProcessSnapshot {
  id: string;
  process_id: string;
  snapshot_at: string;             // ISO 8601 — única fonte de ordenação
  annual_cost: number;
  annual_hours: number;
  annual_savings: number;
  roi_percent: number;
  payback_months: number;
  hours_freed: number;
  investment: number;
  created_by?: string | null;
}


// =====================================================================
// Cascata — agora é derivada em tempo real a partir de gargalos que
// afetam documentos (vide Gargalo.documentosAfetados). A entidade
// CascataEvento e suas etapas marcadas manualmente foram removidas.
// Mantemos só o type de cenário (ainda usado em process_stages).
// =====================================================================

export type CenarioEtapa = 'AS-IS' | 'TO-BE';
