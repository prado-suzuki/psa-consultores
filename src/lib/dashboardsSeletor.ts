// Monta a lista da caixa de seleção de dashboards quando, além dos relatórios
// do Looker vindos do banco, a tela tem um painel nativo (um componente React,
// não um iframe).
//
// Por que existe: o DashboardEmbedView era dirigido só pela tabela `dashboards`.
// As telas Gerencial da Tax e da OSG publicam o painel nativo de Clientes e OS,
// que não é um embed e portanto não pode virar linha daquela tabela. Para as
// duas coisas caberem num seletor só, a lista passa a ser a soma das duas
// origens, e a escolha precisa de uma regra estável.
import type { AccessibleDashboard } from '@/hooks/useAccessibleDashboards';

export interface OpcaoDashboard {
  id: string;
  nome: string;
  /** true quando é o painel nativo da tela, que não passa por iframe. */
  nativo: boolean;
}

/** Identificador do painel nativo. Não colide com uuid vindo do banco. */
export const ID_NATIVO = 'nativo';

/**
 * Opções na ordem em que aparecem: o painel nativo primeiro, quando existe,
 * depois os relatórios do banco na ordem que a RPC devolveu.
 */
export function montarOpcoes(
  dashboards: AccessibleDashboard[],
  nomeNativo?: string | null,
): OpcaoDashboard[] {
  const doBanco = dashboards.map((d) => ({ id: d.id, nome: d.name, nativo: false }));
  return nomeNativo ? [{ id: ID_NATIVO, nome: nomeNativo, nativo: true }, ...doBanco] : doBanco;
}

/**
 * Qual opção fica selecionada.
 *
 * Mantém a escolha do usuário enquanto ela existir na lista; se sumir (o
 * relatório perdeu a liberação, por exemplo), cai na primeira. Sem opção
 * nenhuma, devolve string vazia, que é o que o Select entende como "nada".
 */
export function selecaoEfetiva(opcoes: OpcaoDashboard[], selecionado: string): string {
  if (opcoes.length === 0) return '';
  return opcoes.some((o) => o.id === selecionado) ? selecionado : opcoes[0].id;
}

/**
 * Id que deve ir para a RPC que resolve a URL do iframe. O painel nativo não
 * tem embed, então nesse caso nada é pedido ao servidor.
 */
export function idParaEmbed(opcoes: OpcaoDashboard[], selecionado: string): string | null {
  const o = opcoes.find((x) => x.id === selecaoEfetiva(opcoes, selecionado));
  return o && !o.nativo ? o.id : null;
}
