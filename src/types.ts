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

import type { Database } from '@/integrations/supabase/types';

/** Atalho pra linha (colunas reais) de uma tabela do schema GERADO pelo Supabase.
 *  Fonte de verdade única — o Lovable regenera esse tipo a cada migração, então
 *  os tipos de domínio que derivam daqui nunca ficam fora de sincronia com o banco. */
type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/** Colunas de uma tabela como OBRIGATÓRIAS e NÃO-nulas — para os campos que o
 *  domínio garante estarem preenchidos (o app já os trata assim). Continua
 *  derivado do schema: renomear/remover a coluna quebra aqui no typecheck. */
type ReqCols<T extends keyof Database['public']['Tables'], K extends keyof Row<T>> =
  { [P in K]-?: NonNullable<Row<T>[P]> };

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

// DERIVA de `projects`. Obrigatórios: id/name/description. cluster_id, datas,
// projects_per_year e colunas novas vêm opcional-auto; `status` é refinado.
export interface Projeto
  extends ReqCols<'projects', 'id' | 'name' | 'description'>,
    Partial<Omit<Row<'projects'>, 'id' | 'name' | 'description' | 'status'>> {
  /** Coluna `status` (texto no DB) refinada pro enum do domínio. */
  status?: ProjetoStatus;
  /** Nome do cluster, hidratado via PostgREST relation `estrutura_clusters(name)`. */
  clusterName?: string;
  /** Hidratado via junção `projeto_justificativas` (carregado em query separada). */
  justificativas?: JustificativaProjeto[];
}

// ═════════════════════════════════════════════════════════════════════════
//  Sistema — tabela `sistemas_processo`
// ═════════════════════════════════════════════════════════════════════════

// DERIVA de `sistemas_processo` (PT-native: id + nome). Obrigatórios: id, nome,
// descricao e os dois custos base (entram no ROI). tipo/origem/custos extras/obs
// e colunas novas vêm opcional-auto. Sintéticos (rateio, responsáveis) no corpo.
export interface Sistema
  extends ReqCols<'sistemas_processo', 'id' | 'nome' | 'descricao' | 'custo_licenca_mensal' | 'custo_variavel_por_uso'>,
    Partial<Omit<Row<'sistemas_processo'>, 'id' | 'nome' | 'descricao' | 'custo_licenca_mensal' | 'custo_variavel_por_uso'>> {
  /** Hidratado via `sistema_responsaveis` (não é coluna). */
  responsaveisHoras?: ResponsavelHoras[];
  /** Hidratado via `sistema_clusters` — rateio (%) por cluster (não é coluna). */
  clustersRateio?: SistemaClusterRateio[];
}

export interface SistemaClusterRateio {
  cluster: string;
  rateio: number;
}

export type EstruturacaoDoc = 'Não Estruturado' | 'Semi Estruturado' | 'Estruturado';

// ═════════════════════════════════════════════════════════════════════════
//  Documento — tabela `documentos_processo`
// ═════════════════════════════════════════════════════════════════════════

// DERIVA de `documentos_processo` (PT-native: id + nome). Fixa como obrigatórios
// os campos que o app garante (nome/tipo/formato/origem/tempo_minutos); o resto
// (cluster_id, categoria, estrutura_entrada, e colunas novas) vem opcional-auto.
export interface Documento
  extends ReqCols<'documentos_processo', 'id' | 'nome' | 'tipo' | 'formato' | 'origem' | 'tempo_minutos'>,
    Partial<Omit<Row<'documentos_processo'>, 'id' | 'nome' | 'tipo' | 'formato' | 'origem' | 'tempo_minutos' | 'estruturado'>> {
  /** Coluna `estruturado` (texto no DB) refinada pro enum do domínio. */
  estruturado?: EstruturacaoDoc;
}

export type FrequenciaProcesso =
  | 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Trimestral' | 'Anual';

export type StatusAvaliacao = 'Não avaliado' | 'Em avaliação' | 'Avaliado';

export type Complexidade = 'Baixa' | 'Média' | 'Alta';

// ═════════════════════════════════════════════════════════════════════════
//  Processo — tabela `processes`
// ═════════════════════════════════════════════════════════════════════════

// DERIVA da linha real de `processes` (fonte de verdade gerada pelo Lovable).
// Padrão: `id`/`name` obrigatórios (via Pick, validados contra o schema) + todas
// as demais colunas como OPCIONAIS (Partial<Omit<…>>) — assim as colunas vêm
// sozinhas do banco (um `cluster_id` novo aparece automático; um renomeado quebra
// o typecheck), mantendo a ergonomia leniente de hoje. Só os 3 campos de texto
// cru são refinados pros enums do domínio.
export interface Processo
  extends ReqCols<'processes', 'id' | 'name'>,
    Partial<Omit<Row<'processes'>, 'id' | 'name' | 'evaluation_status' | 'complexity_level' | 'frequency'>> {
  /** @deprecated Mantido como fallback legado de volume; o ROI usa volume_executions. */
  frequency?: FrequenciaProcesso | null;
  evaluation_status?: StatusAvaliacao | null;
  complexity_level?: Complexidade | null;
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

// DERIVA de `gargalos` (PT-native: id + nome). Obrigatórios: id, nome, descricao.
// origem/cluster_id/horas/taxas/custo e colunas novas vêm opcional-auto. Os
// vínculos M:N e o nome do cluster são sintéticos (no corpo).
export interface Gargalo
  extends ReqCols<'gargalos', 'id' | 'nome' | 'descricao'>,
    Partial<Omit<Row<'gargalos'>, 'id' | 'nome' | 'descricao'>> {
  /** Hidratado via `gargalo_processos` (M:N). Vínculo MACRO opcional — para
   *  gargalos "organizacionais" sem etapa específica. NÃO é usado pela cascata. */
  processos: string[];
  /** Hidratado via `gargalo_etapas` (M:N com FK composta etapa_id+scenario).
   *  Etapas onde o gargalo se manifesta; cada uma inicia a BFS da cascata. */
  etapasOrigem: GargaloEtapaRef[];
  /** Nome do cluster, hidratado via JOIN (não é coluna). */
  clusterName?: string;
  /** Hidratado via `gargalo_responsaveis` (não é coluna). */
  responsaveisHoras?: ResponsavelHoras[];
}

// ═════════════════════════════════════════════════════════════════════════
//  Responsavel — tabela `job_roles`
// ═════════════════════════════════════════════════════════════════════════

// DERIVA de `job_roles`. Obrigatórios: id/name/level/hourly_rate (o custo-hora
// alimenta o ROI). type/category/cluster_id e colunas novas vêm opcional-auto.
export interface Responsavel
  extends ReqCols<'job_roles', 'id' | 'name' | 'level' | 'hourly_rate'>,
    Partial<Omit<Row<'job_roles'>, 'id' | 'name' | 'level' | 'hourly_rate'>> {
  /** Nome do cluster, hidratado via JOIN (não é coluna). */
  clusterName?: string;
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

// DERIVA de `process_stages`. Obrigatórios (o app garante): id, name, description,
// process_id, execution, rework_rate. As demais colunas (lead_time_days, volumes,
// taxas, stage_order, scenario, e novas) vêm opcional-auto. Sem colisão entre as
// colunas reais (systems/responsible/inputs/outputs) e os sintéticos (sistemas/
// executadoPor/docs*), que são hidratados no hook e ficam no corpo.
export interface Etapa
  extends ReqCols<'process_stages', 'id' | 'name' | 'description' | 'process_id' | 'execution' | 'rework_rate'>,
    Partial<Omit<Row<'process_stages'>, 'id' | 'name' | 'description' | 'process_id' | 'execution' | 'rework_rate'>> {
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

// DERIVA de `process_improvements`. Obrigatório: id + improvement_description (o
// título — não há `name` nessa tabela). status é refinado; cluster_id/custos e as
// demais colunas (inclusive process_id) vêm opcional-auto. Junções são sintéticas.
export interface Melhoria
  extends ReqCols<'process_improvements', 'id' | 'improvement_description'>,
    Partial<Omit<Row<'process_improvements'>, 'id' | 'improvement_description' | 'improvement_status'>> {
  /** Coluna `improvement_status` (texto no DB) refinada pro enum do domínio. */
  improvement_status?: MelhoriaStatus | null;
  /** Nome do cluster, hidratado via JOIN (não é coluna). */
  clusterName?: string;
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
}

// ═════════════════════════════════════════════════════════════════════════
//  ProcessSnapshot — tabela `roi_snapshots`
// ═════════════════════════════════════════════════════════════════════════

/** Escopo do "Salvar mensuração": processo isolado ou checkpoint de projeto. */
export type RoiSnapshotScope = 'process' | 'project';

// DERIVA de `roi_snapshots`. As métricas (annual_*, roi_percent, payback, etc.)
// são obrigatórias não-nulas (usadas em cálculo direto); scope_id/label/created_by
// e colunas novas vêm opcional-auto; `scope_kind` é refinado.
export interface ProcessSnapshot
  extends ReqCols<'roi_snapshots',
    'id' | 'checkpoint_id' | 'process_id' | 'snapshot_at'
    | 'annual_cost' | 'annual_hours' | 'annual_savings'
    | 'roi_percent' | 'payback_months' | 'hours_freed' | 'investment'>,
    Partial<Omit<Row<'roi_snapshots'>,
      'id' | 'checkpoint_id' | 'process_id' | 'snapshot_at'
      | 'annual_cost' | 'annual_hours' | 'annual_savings'
      | 'roi_percent' | 'payback_months' | 'hours_freed' | 'investment' | 'scope_kind'>> {
  /** Coluna `scope_kind` (texto no DB) refinada pro enum: process isolado ou checkpoint de projeto. */
  scope_kind: RoiSnapshotScope;
}

/** Ponto do histórico CONSOLIDADO do projeto — soma das linhas de um checkpoint
 *  de escopo 'project'. Derivado (não é linha de tabela). */
export interface ConsolidatedCheckpoint {
  checkpoint_id: string;
  snapshot_at: string;
  label?: string | null;
  /** Quantos processos compõem este checkpoint. */
  qtdProcessos: number;
  annual_cost: number;
  annual_hours: number;
  annual_savings: number;
  hours_freed: number;
  investment: number;
  /** Razões recalculadas sobre os somatórios (null quando indefinidas). */
  roi_percent: number | null;
  payback_months: number | null;
}


// =====================================================================
// Cascata — agora é derivada em tempo real a partir de gargalos que
// afetam documentos (vide Gargalo.documentosAfetados). A entidade
// CascataEvento e suas etapas marcadas manualmente foram removidas.
// Mantemos só o type de cenário (ainda usado em process_stages).
// =====================================================================

export type CenarioEtapa = 'AS-IS' | 'TO-BE';
