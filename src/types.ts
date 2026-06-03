export interface BaseEntity {
  id: string;
  nome: string;
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

export interface Projeto extends BaseEntity {
  cluster?: string;
  descricao: string;
  projetosPorAno?: number;
  dataInicio?: string;
  dataFim?: string;
  status?: ProjetoStatus;
  justificativas?: JustificativaProjeto[];
}

export interface Sistema extends BaseEntity {
  descricao: string;
  /** Custo da licença/assinatura (recorrente mensal). Mapeia para sistemas_processo.custo_licenca_mensal. */
  custoLicencaMensal: number;
  /** Custo variável por uso (mensal). Mapeia para sistemas_processo.custo_variavel_por_uso. */
  custoVariavelPorUso: number;
  tipo?: string;
  origem?: string;
  custoPorOperacao?: number;
  custoSetup?: number;
  /** 'fixo' | 'variavel' | 'setup' | 'misto' — mapeia para sistemas_processo.tipo_custo. */
  tipoCusto?: string;
  responsaveisHoras?: ResponsavelHoras[];
  /** Rateio (%) do custo do sistema atribuído a cada cluster — Onda E. */
  clustersRateio?: SistemaClusterRateio[];
  obsLicenca?: string;
  obsVariavel?: string;
  obsCustoPorOperacao?: string;
}

export interface SistemaClusterRateio {
  cluster: string;
  rateio: number;
}

export type EstruturacaoDoc = 'Não Estruturado' | 'Semi Estruturado' | 'Estruturado';

export interface Documento extends BaseEntity {
  tipo: string;
  formato: string;
  origem: string;
  /** Tempo de elaboração em minutos. Mapeia para documentos_processo.tempo_minutos. */
  tempoMinutos: number;
  categoria?: string;
  estruturaEntrada?: string;
  estruturado?: EstruturacaoDoc;
}

export type FrequenciaProcesso =
  | 'Diária' | 'Semanal' | 'Quinzenal' | 'Mensal' | 'Trimestral' | 'Anual';

export type StatusAvaliacao = 'Não avaliado' | 'Em avaliação' | 'Avaliado';

export type Complexidade = 'Baixa' | 'Média' | 'Alta';

export interface Processo extends BaseEntity {
  descricao: string;
  horasTreinamento?: number;
  projetoId?: string;
  ordem?: number;
  frequencia?: FrequenciaProcesso;
  entregavel?: string;
  statusAvaliacao?: StatusAvaliacao;
  complexidade?: Complexidade;
  mapeadoEm?: string;
}

export interface Gargalo extends BaseEntity {
  descricao: string;
  /** Processos afetados por este gargalo (M:N) */
  processos: string[];
  /** Melhoria vinculada (1:N — cada gargalo tem no máximo 1 melhoria). */
  melhoriaId?: string | null;
  origem?: string;
  cluster?: string;
  horasGastas?: number;
  horasImplementacao?: number;
  taxaOcorrencia?: number;
  taxaCapturaAposMelhoria?: number;
  custoExternoUnico?: number;
  responsaveisHoras?: ResponsavelHoras[];
}

export interface Responsavel extends BaseEntity {
  cargo: string;
  custoHora: number;
  tipo?: string;
  cluster?: string;
  /** Senioridade do cargo (ex.: Pleno, Júnior, Sênior) */
  categoria?: string;
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

// Cenário projetado "Como Ficou" — espelho lateral, opcional.
// null/undefined quando o usuário ainda não salvou nenhuma projeção;
// nesse caso o cálculo de ROI faz fallback para os campos da era.
export interface EtapaFicou {
  descricao?: string | null;
  execucao?: string;
  leadTimeDias?: number | null;
  volumePorProcesso?: number | null;
  taxaErros?: number | null;
  taxaRetrabalho?: number | null;
  custoErro?: number | null;
  volumeErros?: number | null;
  executadoPor?: ResponsavelEtapa[];
  aprovadoPor?: ResponsavelEtapa[];
  sistemas?: string[];
  docsEntrada?: DocRef[];
  docsSaida?: DocRef[];
}

export interface Etapa extends BaseEntity {
  processoId: string;
  descricao: string;
  execucao: string;
  docsEntrada: DocRef[];
  docsSaida: DocRef[];
  executadoPor: ResponsavelEtapa[];
  volumeMensal: number;
  volumePorProcesso?: number;
  leadTimeDias?: number;
  taxaErros?: number;
  taxaRetrabalho: number;
  custoErro?: number;
  volumeErros?: number;
  sistemas: string[];
  /** Posição da etapa no processo (1-based). Persistida na coluna `ordem`. */
  ordem?: number;
  // Cenário "Como Ficou" — null/ausente quando sem projeção salva.
  ficou?: EtapaFicou | null;
}

export interface RoiReport {
  processoId: string;
  processoNome: string;
  tempoTotalAtual: number;
  tempoTotalProjetado: number;
  horasEconomizadasMes: number;
  custoMensalAtual: number;
  custoMensalFuturo: number;
  economiaFinanceiraMensal: number;
  investimentoInicial: number;
  retornoAnualizado: number;
  roiPercentual: number;
  paybackMeses: number;
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

export interface Melhoria extends BaseEntity {
  descricao: string;
  sistemas: string[];
  executadoPor: ResponsavelHoras[];
  /**
   * Total de horas de treinamento. Quando `treinamentoPor` tem entradas,
   * é cacheado como Σ rateio no save (backend). Mantido por compatibilidade
   * com consumidores que não usam o rateio (ROI, SOP, dashboards).
   */
  horasTreinamento?: number;
  /**
   * Rateio das horas de treinamento por responsável.
   * Σ horas = horasTreinamento (cacheado no backend ao salvar).
   */
  treinamentoPor?: ResponsavelHoras[];
  custoExternoUnico?: number;
  status?: MelhoriaStatus;
  acoesTd?: AcaoTd[];
  cluster?: string;
  /** Processos atendidos por esta melhoria (M:N) */
  processos: string[];
}

// Snapshots de processo (append-only) — registro linear puro de indicadores.
// Sem contador de versão, sem `tipo`, sem `metadados`. A última mensuração
// por processo é a row com MAX(snapshot_em) — timeline puramente cronológica.
export interface ProcessSnapshot {
  id: string;
  processoId: string;
  snapshotEm: string;             // ISO 8601 — única fonte de ordenação
  custoAnual: number;
  horasAnual: number;
  economiaAnual: number;
  roiPercentual: number;
  paybackMeses: number;
  horasLiberadas: number;
  investimento: number;
  criadoPor?: string | null;
}


// =====================================================================
// Cascata — Eventos de Disrupção com etapas de retrabalho marcadas manualmente.
// O conjunto de etapas afetadas é definido pelo usuário (não há derivação
// automática nem BFS). A junção cascata_evento_etapas guarda (etapa_id, cenario).
// =====================================================================

export type CenarioEtapa = 'AS-IS' | 'TO-BE';

export interface CascataEventoEtapaRef {
  etapaId: string;
  cenario: CenarioEtapa;
  // Campos hidratados pelo backend (read-only) — facilitam a UI sem cruzamento.
  etapaNome?: string;
  etapaOrdem?: number;
  processoId?: string;
  processoNome?: string;
}

export interface CascataEvento {
  id: string;
  nome: string;
  descricao?: string;
  /** FK para processo raiz. Mapeia para cascata_eventos.processo_raiz_id. */
  processoRaizId?: string | null;
  cluster?: string;
  /** ISO 8601 — mapeia para cascata_eventos.created_at. */
  createdAt?: string;
  /** Etapas marcadas como retrabalho quando o evento ocorre. */
  etapas: CascataEventoEtapaRef[];
}