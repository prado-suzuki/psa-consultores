/**
 * Tipos do dashboard nativo "Clientes e OS".
 *
 * Reproduzem, no front (Supabase ao vivo), as 3 views do BigQuery que hoje
 * alimentam o iframe do Looker Studio:
 *   - VW_ANL_DASHBOARD_CLIENTES  → ClienteRow
 *   - VW_ANL_DASHBOARD_OS        → OsRow
 *   - VW_ANL_DASHBOARD_PROJETOS  → ProjetoRow
 *
 * As interfaces `Raw*` espelham exatamente o que cada `supabase.from().select()`
 * traz das tabelas-fonte; as interfaces `*Row` espelham as COLUNAS das views.
 */

// ── Linhas cruas vindas do Supabase ────────────────────────────────────

/** `cliente` (já filtrada por excluido=false + ambiente na query). */
export interface RawCliente {
  id: string;
  nome: string;
  fixo: string | null;
  categoria: string | null;
  ativo: boolean | null;
  uf: string | null;
  created_at: string; // timestamp ISO
}

/** `ordem_servico` (filtrada por excluido=false na query; não tem ambiente). */
export interface RawOrdemServico {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  id_servico: string | null;
  cluster_id: string | null;
  situacao: string | null;
  data_emissao: string | null; // DATE 'YYYY-MM-DD'
  data_inicio: string | null;
  data_fim: string | null;
  valor_projeto: number | null;
}

/** `org_projects` (sem ambiente). */
export interface RawOrgProject {
  id: string;
  name: string;
  status: string | null;
  external_client_id: string | null;
  ordem_servico_id: string | null;
  estrutura_area_id: string | null;
  equipe_id: string | null;
  responsible_id: string | null;
}

/** `org_tasks` (só os campos usados para horas). */
export interface RawOrgTask {
  project_id: string | null;
  parent_task_id: string | null;
  estimated_hours: number | null;
  status: string; // fiscal_task_status; a view soma quando = 'done'
}

/** `cliente_clusters`. */
export interface RawClienteCluster {
  cliente_id: string;
  cluster_id: string;
  created_at: string; // timestamp ISO — cluster principal = menor created_at
}

/** `estrutura_clusters`. */
export interface RawEstruturaCluster {
  id: string;
  name: string;
  is_active: boolean;
}

/** `estrutura_areas`. */
export interface RawEstruturaArea {
  id: string;
  name: string;
  cluster_id: string;
}

/** `estrutura_equipes`. */
export interface RawEstruturaEquipe {
  id: string;
  name: string;
}

/** `servicos_prestados`. */
export interface RawServico {
  id: string;
  nome: string;
}

/** `profiles` (responsável do projeto). */
export interface RawProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/** view `cliente_setor_regiao_atual` (setor/região denormalizados da OS). */
export interface RawSetorRegiao {
  id_cliente: string | null;
  setor_cliente: string | null;
  regiao: string | null;
}

// ── Rótulos derivados (espelham os CASE das views) ─────────────────────

export type TipoCliente = 'Fixo' | 'Pontual' | 'Em Análise' | 'Não informado';

export type StatusContrato = 'Sem prazo' | 'Vencido' | 'Vence em 30 dias' | 'Vigente';

// ── Linhas das views ───────────────────────────────────────────────────

/** VW_ANL_DASHBOARD_CLIENTES */
export interface ClienteRow {
  cliente_id: string;
  cliente_nome: string;
  cluster_id: string;
  cluster_nome: string;
  tipo_cliente: TipoCliente;
  categoria: string;
  setor: string | null;
  uf: string | null;
  regiao: string | null;
  ativo: boolean;
  data_cadastro: string;
  faturamento_total: number;
  ticket_medio: number | null;
  qtd_os_ativas: number;
  qtd_contratos_vigentes: number;
  qtd_contratos_vencidos: number;
  qtd_contratos_30d: number;
}

/** VW_ANL_DASHBOARD_OS */
export interface OsRow {
  os_id: string;
  numero_os: string | null;
  cliente_id: string;
  cliente_nome: string;
  tipo_cliente: TipoCliente;
  categoria: string;
  cluster_id: string;
  cluster_nome: string;
  servico_nome: string | null;
  data_emissao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  situacao: string | null;
  situacao_label: string;
  status_contrato: StatusContrato;
  faturamento: number;
}

/** VW_ANL_DASHBOARD_PROJETOS */
export interface ProjetoRow {
  projeto_id: string;
  projeto_nome: string;
  status_projeto: string | null;
  status_projeto_label: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  tipo_cliente: TipoCliente;
  categoria: string;
  cluster_id: string;
  cluster_nome: string;
  area_nome: string | null;
  equipe_nome: string | null;
  responsavel_nome: string | null;
  os_id: string | null;
  numero_os: string | null;
  situacao_os: string | null;
  situacao_os_label: string;
  os_data_fim: string | null;
  valor_os: number;
  horas_estimadas: number;
  horas_realizadas: number;
  desvio_pct: number | null;
}

// ── Saídas de KPI/série para os cards e gráficos ───────────────────────

export interface CategoriaFaturamento {
  categoria: string;
  faturamento: number;
}

export interface ClusterFaturamento {
  cluster: string;
  faturamento: number;
}

export interface MesFaturamento {
  mes: string; // 'YYYY-MM'
  faturamento: number;
}

export interface TopCliente {
  cliente_id: string;
  cliente_nome: string;
  tipo_cliente: TipoCliente;
  categoria: string;
  faturamento_total: number;
}

export interface StatusContagem {
  status: string;
  qtd: number;
}

export interface ProjetoHoras {
  projeto_id: string;
  projeto_nome: string;
  horas_estimadas: number;
  horas_realizadas: number;
}

export interface KpisClientes {
  faturamento_total: number;
  clientes_ativos: number;
  clientes_ativos_fixos: number;
  clientes_ativos_pontuais: number;
  ticket_medio: number | null;
  os_ativas: number;
  contratos_30d: number;
}

export interface KpisOperacional {
  contratos_30d: number;
  contratos_vencidos: number;
  novos_clientes_trimestre: number;
}

export interface KpisProjetos {
  os_em_andamento: number;
  os_total: number;
  horas_estimadas: number;
  horas_realizadas: number;
  desvio_medio: number | null;
}
