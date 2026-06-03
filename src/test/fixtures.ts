// Fixtures determinísticas pra testes de página. Shape espelhando o que
// vem do Supabase (PostgREST) — útil pra alimentar mocks em vi.mock.
//
// Snake_case porque é o que sai do DB. Pages que ainda usam camelCase via
// dbMappers vão precisar do mapper aplicado nos testes antes do refator.

export const CLUSTER_OSG_UUID = '0523512c-f980-4236-8a7c-53e06c9c7a80';

export const PROJETO_OSG_ROW = {
  id: 'p1-uuid',
  name: 'P1 - Organização Patrimonial',
  description: 'Pilar fundador do OSG. Levanta e consolida...',
  cluster_id: CLUSTER_OSG_UUID,
  estrutura_clusters: { name: 'PSA OSG' },
  projects_per_year: null,
  start_date: null,
  end_date: null,
  status: 'active',
  area: 'OSG',
};

export const PROJETO_ROTINA_ROW = {
  id: 'rotina-uuid',
  name: 'Rotina PSA',
  description: null,
  cluster_id: null,
  estrutura_clusters: null,
  projects_per_year: null,
  start_date: null,
  end_date: null,
  status: 'active',
  area: null,
};

export const PROCESSO_OSG_ROW = {
  id: 'prc-1-uuid',
  name: 'P1.01 Diagnóstico Patrimonial Inicial',
  description: 'Levantamento completo do patrimônio do cliente...',
  project_id: 'p1-uuid',
  cluster_id: CLUSTER_OSG_UUID,
  order_index: 1,
  evaluation_status: 'Não avaliado',
  training_hours: null,
  mapped_at: null,
  complexity_level: 'Alta',
  frequency: '1x por projeto',
  deliverable: 'Planilha-mestra DP',
  stage: 'discovery',
  area: 'OSG',
  // outras cols do schema Rotina que sempre vêm null pra MAPA
  priority: 'medium',
  volume_month: null,
  financial_impact: null,
};

export const PROCESSO_ROTINA_ROW = {
  id: 'rotina-proc-uuid',
  name: 'Onboarding de Novos Clientes',
  description: null,
  project_id: null,
  cluster_id: null,
  order_index: null,
  evaluation_status: null,
  training_hours: null,
  mapped_at: null,
  complexity_level: 'medium',
  frequency: null,
  deliverable: null,
  stage: 'discovery',
  area: 'Transversal',
  priority: 'medium',
  volume_month: null,
  financial_impact: null,
};

export const MELHORIA_ROW = {
  id: 'mel-1-uuid',
  improvement_description: 'Padronizar planilha DP',
  cluster_id: CLUSTER_OSG_UUID,
  estrutura_clusters: { name: 'PSA OSG' },
  improvement_status: 'Não iniciado',
  training_hours: null,
  one_time_external_cost: null,
  // Junções vazias — propositalmente, pra testar o bug do .length on undefined
  melhoria_processos: [],
  melhoria_sistemas: [],
  melhoria_acoes_td: [],
};

export const GARGALO_ROW = {
  id: 'gar-1-uuid',
  nome: 'DP não é revisado',
  descricao: 'O DP é responsabilidade exclusiva...',
  origem: 'Interno',
  cluster_id: CLUSTER_OSG_UUID,
  estrutura_clusters: { name: 'PSA OSG' },
  melhoria_id: null,
  horas_gastas: 0,
  horas_implementacao: 0,
  taxa_ocorrencia: 0,
  taxa_captura_apos_melhoria: 0,
  custo_externo_unico: 0,
  gargalo_processos: [{ processo_id: 'prc-1-uuid' }],
};

export const SISTEMA_ROW = {
  id: 'sis-1-uuid',
  nome: 'Docbox',
  descricao: null,
  tipo: null,
  origem: 'Externo',
  cluster_id: CLUSTER_OSG_UUID,
  custo_licenca_mensal: 0,
  custo_variavel_por_uso: 0,
  custo_por_operacao: 0,
  custo_setup: 0,
  tipo_custo: null,
  obs_licenca: null,
  obs_variavel: null,
  obs_custo_por_operacao: null,
};

export const DOCUMENTO_ROW = {
  id: 'doc-1-uuid',
  nome: 'Declaração de Imposto de Renda',
  tipo: null,
  categoria: null,
  formato: 'PDF',
  origem: 'Cliente',
  tempo_minutos: null,
  estrutura_entrada: null,
  estruturado: null,
  canonico_id: null,
};

export const RESPONSAVEL_ROW = {
  id: 'resp-1-uuid',
  name: 'Assistente Administrativo',
  level: 'junior',
  category: 'Administrativo',
  hourly_rate: 50,
  type: 'cargo',
  cluster_id: CLUSTER_OSG_UUID,
  estrutura_clusters: { name: 'PSA OSG' },
  is_active: true,
};

export const ETAPA_ROW = {
  id: 'etp-1-uuid',
  process_id: 'prc-1-uuid',
  scenario: 'AS-IS',
  stage_as_is_id: null,
  name: 'Solicitar documentos',
  description: 'A equipe solicita...',
  execution: 'manual',
  lead_time_days: null,
  volume_per_process: null,
  error_rate: null,
  rework_rate: 0,
  error_cost: null,
  error_volume: null,
  stage_order: 1,
  // Default rotina cols
  responsible: null,
  time_current: null,
  time_target: null,
  frequency: null,
  volume: null,
  automation_level: null,
  inputs: [],
  outputs: [],
  systems: [],
  related_projects: [],
  job_role_id: null,
};

export const CLUSTER_ROW = {
  id: CLUSTER_OSG_UUID,
  name: 'PSA OSG',
  is_active: true,
};
