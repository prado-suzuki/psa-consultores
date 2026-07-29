import type { OrgProjectFormData } from '@/hooks/useOrgProjects';

// Criação de projetos em lote a partir de uma OS: 1 projeto por produto contratado.

export interface LoteProduto {
  produtoSegmentoId: string;
  produtoLabel: string;
}

/** Snapshot enviado da aba de OS (via location.state) para a tela de lote. */
export interface LoteFromOs {
  clientId: string;
  clientName: string;
  ordemServicoId: string;
  osNumero: string;
  startDate: string;
  endDate: string;
  /** status do projeto já convertido da situação da OS (OS_SITUACAO_TO_PROJECT_STATUS) */
  status: string;
  description: string;
  produtos: LoteProduto[];
}

export interface LoteFromOsLocationState {
  loteFromOs: LoteFromOs;
}

/** Campos comuns a todos os projetos do lote (editáveis no topo). */
export interface LoteCommon {
  startDate: string;
  endDate: string;
  status: string;
  description: string;
}

/** Estado de uma linha (= um produto) da tela de lote. */
export interface LoteRow {
  produtoSegmentoId: string;
  produtoLabel: string;
  include: boolean;
  name: string;
  equipeId: string;
  estruturaAreaId: string;
  leaderIds: string[];
  responsibleId: string;
  memberIds: string[];
  /** Permite escolher membros de qualquer área, não só da equipe selecionada. */
  isMultidisciplinar: boolean;
}

/** Nome sugerido do projeto de um produto: "Cliente — OS nº — Produto". */
export function buildLoteProjectName(clientName: string, osNumero: string, produtoLabel: string): string {
  const base = clientName?.trim() ? `${clientName.trim()} — OS ${osNumero}` : `OS ${osNumero}`;
  return produtoLabel ? `${base} — ${produtoLabel}` : base;
}

/** Constrói o estado inicial das linhas a partir do snapshot da OS. */
export function buildInitialRows(state: LoteFromOs): LoteRow[] {
  return state.produtos.map(produto => ({
    produtoSegmentoId: produto.produtoSegmentoId,
    produtoLabel: produto.produtoLabel,
    include: true,
    name: buildLoteProjectName(state.clientName, state.osNumero, produto.produtoLabel),
    equipeId: '',
    estruturaAreaId: '',
    leaderIds: [],
    responsibleId: '',
    memberIds: [],
    isMultidisciplinar: false,
  }));
}

/** Converte uma linha + campos comuns no payload de criação de projeto. */
export function buildLoteFormData(
  clientId: string,
  ordemServicoId: string,
  common: LoteCommon,
  row: LoteRow,
): OrgProjectFormData {
  return {
    name: row.name.trim(),
    description: common.description,
    status: common.status,
    start_date: common.startDate,
    end_date: common.endDate,
    leader_ids: row.leaderIds,
    responsible_id: row.responsibleId,
    external_client_id: clientId,
    estrutura_area_id: row.estruturaAreaId,
    equipe_id: row.equipeId,
    is_multidisciplinar: row.isMultidisciplinar,
    member_ids: row.memberIds,
    ordem_servico_id: ordemServicoId,
    servico_id: '',
  };
}

/**
 * Valida uma linha incluída no lote (produto e cliente são fixos, não validados aqui).
 * Retorna a mensagem de erro ou null. Prefixa com o produto para localizar a linha.
 */
export function validateLoteRow(row: LoteRow, common: LoteCommon): string | null {
  const prefix = `${row.produtoLabel || 'Produto'}: `;
  if (!row.name.trim()) return `${prefix}Nome é obrigatório`;
  if (!row.equipeId) return `${prefix}Selecione a Equipe`;
  if (!common.status) return 'Selecione o Status';
  if (row.leaderIds.length === 0) return `${prefix}Selecione ao menos um Líder Geral`;
  if (!row.responsibleId) return `${prefix}Selecione o Responsável Executor`;
  if (row.memberIds.length === 0) return `${prefix}Selecione ao menos um Membro do Projeto`;
  // Datas/status/descrição vêm da OS (não editáveis nesta tela); descrição é opcional.
  if (!common.startDate) return 'A OS não possui Data de Início';
  if (!common.endDate) return 'A OS não possui Data de Término';
  if (common.startDate > common.endDate) return 'Data de Término deve ser posterior à Data de Início';
  return null;
}
