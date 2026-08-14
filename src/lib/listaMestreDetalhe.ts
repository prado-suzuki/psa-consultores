// Regras puras da lista mestre e detalhe do cadastro de cliente.
//
// A tela troca a sanfona por lista fixa à esquerda e detalhe à direita: escolher
// um item na lista muda o que aparece no painel, e a edição continua sendo ato
// deliberado (o lápis). Estas funções respondem as três perguntas que a casca
// precisa fazer e que não dependem de React nem de qual entidade é a lista.
//
// A chave é sempre `_id`, o identificador local do rascunho. Ele existe tanto
// para linha vinda do banco quanto para linha recém-criada, e é estável dentro
// de uma sessão de edição — `_dbId` não serve, porque item novo não tem.
import { isSameRecord } from '@/lib/clientFormValidation';

export interface ItemDeLista {
  _id: number;
}

/**
 * Qual item deve estar selecionado, dada a lista atual e a seleção em vigor.
 *
 * Mantém a seleção quando ela ainda existe, cai no primeiro item quando não
 * existe mais (ou quando ainda não havia seleção), e devolve null só com a lista
 * vazia. É o que evita o painel de detalhe em branco ao abrir a aba.
 */
export function resolverSelecao(
  itens: readonly ItemDeLista[],
  atual: number | null,
): number | null {
  if (itens.length === 0) return null;
  if (atual != null && itens.some((i) => i._id === atual)) return atual;
  return itens[0]._id;
}

/**
 * Para qual item ir depois de remover o que estava selecionado.
 *
 * Segue para o vizinho de baixo e, se o removido era o último, para o de cima.
 * Mantém o consultor no mesmo ponto da lista em vez de jogá-lo para o começo.
 *
 * Recebe a lista ANTES da remoção: é dela que sai a noção de vizinho.
 */
export function selecaoAposRemover(
  itensAntes: readonly ItemDeLista[],
  removidoId: number,
): number | null {
  const indice = itensAntes.findIndex((i) => i._id === removidoId);
  const restantes = itensAntes.filter((i) => i._id !== removidoId);
  if (restantes.length === 0) return null;
  if (indice < 0) return restantes[0]._id;
  return restantes[Math.min(indice, restantes.length - 1)]._id;
}

/**
 * Os itens em ordem alfabética pelo nome exibido, só para a lista da esquerda.
 *
 * A lista chega na ordem em que as linhas entraram no banco, que não ajuda
 * ninguém a achar um contribuinte pelo nome. Ordenar aqui não altera o que é
 * gravado: a ordem da lista não é dado do cadastro, e a chave de cada linha
 * continua sendo o `_id`.
 *
 * Duas decisões dentro da comparação:
 *  · `sensitivity: 'base'` — "AGROPECUARIA BOMFIM" e "Agropecuaria Miranda"
 *    precisam ficar lado a lado; comparação sensível a caixa jogaria todos os
 *    nomes em maiúsculas para um bloco separado;
 *  · nome em branco vai para o fim — é a linha recém-criada, ainda sem nome. No
 *    topo ela empurraria a lista inteira a cada item novo.
 */
export function ordenarPorNome<T>(
  itens: readonly T[],
  nomeDe: (item: T) => string | undefined | null,
): T[] {
  return itens.slice().sort((a, b) => {
    const nomeA = (nomeDe(a) || '').trim();
    const nomeB = (nomeDe(b) || '').trim();
    // Sem nome dos dois lados: `sort` é estável, então eles mantêm a ordem
    // relativa em que foram criados.
    if (!nomeA || !nomeB) return (nomeA ? 0 : 1) - (nomeB ? 0 : 1);
    return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
  });
}

/**
 * Quais linhas foram mexidas em relação ao que veio do banco.
 *
 * Serve para marcar a lista: hoje o aviso de "alterações não salvas" é global no
 * rodapé e não diz onde. Item que não existe no original conta como alterado,
 * porque é linha nova.
 *
 * A comparação é a mesma do salvamento (`isSameRecord`), de propósito: se os
 * dois discordassem, a marca apontaria para um item que o save considera igual.
 */
export function idsAlterados<T extends ItemDeLista>(
  atuais: readonly T[],
  originais: readonly T[],
): Set<number> {
  const porId = new Map<number, T>();
  for (const item of originais) porId.set(item._id, item);

  const alterados = new Set<number>();
  for (const item of atuais) {
    const original = porId.get(item._id);
    if (!original || !isSameRecord(item, original)) alterados.add(item._id);
  }
  return alterados;
}
