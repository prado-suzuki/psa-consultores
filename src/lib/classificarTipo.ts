import type { ChecklistPadraoRow, Granularidade } from '@/hooks/useOsgChecklist';
import type { Alvo, NovoCadastro, TipoFicha } from '@/lib/classificarFicha';

/**
 * Regras puras da classificação: que tipos do catálogo `documento_tipo` fazem
 * sentido oferecer para a leva que está sendo vinculada.
 *
 * O catálogo tem 67 itens. Oferecer os 67 numa lista transformaria a
 * classificação num passo; recortar pelo destino da leva derruba para uma
 * dezena, que é o que permite escolher de relance. Ver
 * docs/planos/cadastro-vinculo-documentos.md §5, regra 2 (sem burocracia).
 */

/** Para onde a leva vai, no vocabulário do catálogo. */
export type DestinoFicha = TipoFicha | 'cliente';

/**
 * O recorte do catálogo por destino.
 *
 * `bem` mapeia para a granularidade `bem`, que hoje tem ZERO linhas: os 13
 * documentos de bem do seed (codigo `bem--*`) foram cadastrados com
 * granularidade `cliente`, porque são relações do cliente inteiro ("Relação de
 * áreas exploradas por imóvel"). Não corrijo isso aqui inventando um mapa
 * `bem → cliente`: seria esconder um problema do catálogo dentro de uma regra
 * de tela. O recorte vazio cai no catálogo inteiro (ver `tiposParaDestino`), o
 * consultor escolhe assim mesmo, e o buraco fica visível para quem for arrumar
 * o catálogo.
 */
const GRANULARIDADES: Record<DestinoFicha, Granularidade[]> = {
  PF: ['pessoa_pf'],
  PJ: ['pessoa_pj'],
  bem: ['bem'],
  // Rural e urbana juntas: no momento de vincular ainda não se sabe (e não
  // interessa perguntar) de que espécie é a matrícula.
  matricula: ['matricula_rural', 'matricula_urbana'],
  cliente: ['cliente'],
};

export interface TipoOpcao {
  id: string;
  /**
   * Rótulo pronto para a lista: o nome do documento, desambiguado pela entidade
   * quando o mesmo nome aparece duas vezes no recorte. Acontece de verdade em
   * matrícula, onde "Matrícula do imóvel (inteiro teor)" existe na rural e na
   * urbana, e duas opções idênticas na tela seriam impossíveis de escolher.
   */
  rotulo: string;
}

export interface TipoPedidoOpcao extends TipoOpcao {
  solicitacaoItemId: string;
}

export interface ListaDeTipos {
  tipos: TipoOpcao[];
  /**
   * A lista é o catálogo inteiro porque o recorte do destino veio vazio. A tela
   * avisa em vez de mostrar uma lista curta sem explicação (ou, pior, vazia).
   */
  semRecorte: boolean;
}

/** O mínimo para virar opção de lista: id, o nome, e com que desambiguar. */
interface LinhaDeTipo {
  id: string;
  documento: string;
  entidade: string;
  ordem: number;
}

const paraOpcoes = (linhas: readonly LinhaDeTipo[]): TipoOpcao[] => {
  const repetidos = new Set(
    linhas
      .map((linha) => linha.documento)
      .filter((documento, indice, todos) => todos.indexOf(documento) !== indice),
  );
  return [...linhas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((linha) => ({
      id: linha.id,
      rotulo: repetidos.has(linha.documento)
        ? `${linha.documento} (${linha.entidade})`
        : linha.documento,
    }));
};

/**
 * Os tipos a oferecer para uma leva que vai para `destino`.
 *
 * `todos` força o catálogo inteiro: o recorte é uma conveniência, não uma
 * regra de negócio, e o consultor precisa de saída quando o documento que ele
 * tem na mão não está no recorte (um CCIR que vai para o bem, por exemplo).
 */
export function tiposParaDestino(
  catalogo: readonly ChecklistPadraoRow[],
  destino: DestinoFicha,
  todos = false,
): ListaDeTipos {
  const ativos = catalogo.filter((linha) => linha.ativo);
  if (todos) return { tipos: paraOpcoes(ativos), semRecorte: false };

  const graos = GRANULARIDADES[destino];
  const recorte = ativos.filter((linha) => graos.includes(linha.granularidade));
  if (recorte.length === 0) return { tipos: paraOpcoes(ativos), semRecorte: true };
  return { tipos: paraOpcoes(recorte), semRecorte: false };
}

/**
 * Os tipos que a SOLICITAÇÃO pediu para uma entidade deste grão.
 *
 * É o recorte certo, e não o catálogo: o conjunto esperado de um cliente é o que
 * foi pedido a ele, não os 67 documentos que a PSA sabe pedir. Lista menor, e o
 * que aparece tem significado. É também o único caminho pelo qual um documento
 * AVULSO aparece: ele está fora do catálogo por construção (migration
 * 20260807150000), e só é alcançável pelo item manual que o originou.
 *
 * `avulsoPorItem` mapeia id do item manual → id do tipo avulso. Item manual sem
 * tipo é pulado em vez de virar opção quebrada: sem id não há o que gravar.
 */
export function tiposPedidos(
  itens: readonly ItemPedido[],
  avulsoPorItem: Readonly<Record<string, string>>,
  destino: DestinoFicha,
): TipoOpcao[] {
  return tiposPedidosDetalhados(itens, avulsoPorItem, destino);
}

/** Mantém o item da solicitação, necessário para marcar "não se aplica" por entidade. */
export function tiposPedidosDetalhados(
  itens: readonly ItemPedido[],
  avulsoPorItem: Readonly<Record<string, string>>,
  destino: DestinoFicha,
): TipoPedidoOpcao[] {
  const graos = GRANULARIDADES[destino];
  const linhas: (LinhaDeTipo & { solicitacaoItemId: string })[] = [];
  for (const item of itens) {
    if (item.status !== 'ativo') continue;
    if (!graos.includes(item.granularidade)) continue;
    const id = item.itemPadraoId ?? avulsoPorItem[item.id];
    if (!id) continue;
    linhas.push({ id, solicitacaoItemId: item.id, documento: item.documento, entidade: item.entidade, ordem: item.ordem });
  }
  const rotulos = new Map(paraOpcoes(linhas).map((opcao) => [opcao.id, opcao.rotulo]));
  return linhas
    .sort((a, b) => a.ordem - b.ordem)
    .map((linha) => ({
      id: linha.id,
      solicitacaoItemId: linha.solicitacaoItemId,
      rotulo: rotulos.get(linha.id) ?? linha.documento,
    }));
}

/** Tipos solicitados que ainda não têm arquivo classificado para o alvo. */
export function tiposPendentesParaAlvo(
  pedidos: readonly TipoPedidoOpcao[],
  documentos: readonly { documento_tipo_id: string | null; pessoa_id: string | null; bem_id: string | null; matricula_id: string | null }[],
  alvo: Alvo | null,
  naoAplicaveis: ReadonlySet<string> = new Set(),
): TipoPedidoOpcao[] {
  if (!alvo) return [...pedidos];
  const recebidos = new Set(
    documentos
      .filter((doc) => (
        (alvo.kind === 'pessoa' && doc.pessoa_id === alvo.id)
        || (alvo.kind === 'bem' && doc.bem_id === alvo.id)
        || (alvo.kind === 'matricula' && doc.matricula_id === alvo.id)
      ))
      .map((doc) => doc.documento_tipo_id)
      .filter((id): id is string => Boolean(id)),
  );
  return pedidos.filter((pedido) => naoAplicaveis.has(pedido.solicitacaoItemId) || !recebidos.has(pedido.id));
}

/** O que `tiposPedidos` precisa de um item da solicitação. */
export interface ItemPedido {
  id: string;
  itemPadraoId: string | null;
  granularidade: Granularidade;
  status: string;
  documento: string;
  entidade: string;
  ordem: number;
}

/** O destino de um vínculo a quem já existe. PF x PJ sai do cadastro apontado. */
export function destinoDoAlvo(
  alvo: Alvo,
  pessoas: readonly { id: string; tipo?: string | null }[],
): DestinoFicha {
  if (alvo.kind === 'bem') return 'bem';
  if (alvo.kind === 'matricula') return 'matricula';
  if (alvo.kind === 'cliente') return 'cliente';
  return pessoas.find((pessoa) => pessoa.id === alvo.id)?.tipo === 'PJ' ? 'PJ' : 'PF';
}

/** O destino de um cadastro novo, lido do rascunho que a ficha entregou. */
export function destinoDoNovo(novo: NovoCadastro): DestinoFicha {
  if (novo.tipo === 'bem') return 'bem';
  if (novo.tipo === 'matricula') return 'matricula';
  return novo.values.tipo_pessoa === 'PJ' ? 'PJ' : 'PF';
}
