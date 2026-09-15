/**
 * Regras puras do sino: o que ainda conta para a bolinha vermelha, e em que ordem
 * as últimas notificações aparecem quando o balão abre.
 *
 * ── POR QUE EXISTE UM SEGUNDO MARCADOR DE LEITURA ───────────────────────────
 *
 * O sino tem QUATRO fontes, e elas não sabem a mesma coisa sobre "já vi isto".
 * Duas são PERSISTIDAS: `notificacao` e `org_comment_mentions` têm `lido_em`, e a
 * leitura viaja com a pessoa para qualquer navegador. As outras duas são
 * DERIVADAS (`useTicketNotifications`, `useReviewTaskNotifications`): o aviso é o
 * próprio estado pendente — chamado aguardando resposta, tarefa parada em
 * revisão —, não existe linha para carimbar, e o item só some quando o trabalho
 * é feito.
 *
 * Sem um segundo marcador, abrir o sino nunca zeraria a bolinha: ela continuaria
 * contando os chamados e as revisões em aberto, que é justamente o que o pedido
 * de 14/09/2026 mandou parar de fazer. Esse marcador é LOCAL (`localStorage`, por
 * usuário — ver `useSinoVisto`), e é local de propósito: ele responde "eu já
 * OLHEI o sino", que é coisa do navegador em que a pessoa está, não um fato do
 * trabalho. Gravá-lo no banco faria parecer que a revisão foi tratada em toda
 * parte porque alguém abriu o balão em um lugar.
 *
 * ── O QUE A BOLINHA DEIXA DE SIGNIFICAR ─────────────────────────────────────
 *
 * Antes, a bolinha era "quanta coisa está pendente" e só baixava quando a
 * pendência acabava. Agora é "quanta coisa CHEGOU desde a última vez que olhei".
 * A pendência continua visível: ela está na lista, que passou a mostrar também o
 * que já foi lido.
 */

/**
 * Quantas notificações o balão mostra. Trinta por pedido do Bernardo — antes eram
 * cinco, e só as não lidas, então o que a pessoa acabara de ler sumia do balão.
 */
export const LIMITE_DO_SINO = 30;

/**
 * Quantas o balão mostra ANTES de a pessoa pedir o resto.
 *
 * Cinco era o tamanho da lista inteira até 14/09/2026, e continua sendo o quanto
 * cabe sem virar uma parede: o caso comum é abrir para ver o que chegou, não para
 * reler as trinta. O rodapé conta as restantes e revela todas de uma vez.
 */
export const VISIVEIS_ANTES_DE_EXPANDIR = 5;

/**
 * Se um acontecimento é posterior ao marco de "já olhei".
 *
 * Sem marco (primeiro uso, `localStorage` limpo, navegador novo) TUDO conta: o
 * padrão seguro é o comportamento antigo, em que todo item pendente aparecia na
 * bolinha. Data ilegível cai no mesmo lugar, pelo mesmo motivo — é melhor a
 * bolinha aparecer à toa do que esconder um chamado atrasado por causa de uma
 * string estragada.
 */
export function aconteceuDepois(quando: string, marco: string | null): boolean {
  if (!marco) return true;
  const instante = Date.parse(quando);
  const corte = Date.parse(marco);
  if (Number.isNaN(instante) || Number.isNaN(corte)) return true;
  return instante > corte;
}

/**
 * Data em número, com data ilegível valendo zero.
 *
 * O `NaN` que `Date.parse` devolve para lixo envenena o comparador do `sort` — a
 * ordem do array inteiro passa a depender do algoritmo do motor, não do dado. Ao
 * fundo da lista é onde uma data que não dá para ler faz menos estrago.
 */
const instante = (quando: string): number => {
  const valor = Date.parse(quando);
  return Number.isNaN(valor) ? 0 : valor;
};

/** A fatia de um item do sino que a ordenação do balão precisa conhecer. */
export interface ItemDoSino {
  /** Identidade estável do item no feed (`mencao-<id>`, `ticket-<id>`, ...). */
  chave: string;
  /** Quando o item aconteceu, em ISO. É o critério do bloco de histórico. */
  quando: string;
  /** Novo desde a última abertura do balão. */
  naoLido: boolean;
}

/**
 * A lista do balão, em dois blocos.
 *
 * **Bloco 1, o que é novo, NA ORDEM EM QUE CHEGOU.** A ordem de entrada carrega
 * duas decisões que não são de data e que se perderiam num `sort` cronológico: a
 * prioridade entre fontes (menção primeiro — alguém chamou a pessoa pelo nome —,
 * depois avisos internos, revisões e chamados) e, dentro dos chamados, a ordem de
 * urgência que `useTicketNotifications` já calculou (atrasado antes de urgente,
 * antes de normal). Por isso este bloco preserva a ordem recebida em vez de
 * reordenar.
 *
 * **Bloco 2, o histórico, por data decrescente.** Aqui a fonte não importa mais:
 * o que já foi lido é passado, e passado se lê do mais recente para o mais
 * antigo. Sem isto, uma menção lida há duas semanas ficaria acima de um aviso
 * lido hoje, só por ser menção.
 *
 * O corte em `limite` vem por último, e portanto sacrifica histórico antigo, nunca
 * item novo.
 */
export function ordenarItensDoSino<T extends ItemDoSino>(
  itens: readonly T[],
  limite = LIMITE_DO_SINO,
): T[] {
  const novos = itens.filter((item) => item.naoLido);
  const historico = itens
    .filter((item) => !item.naoLido)
    .sort((a, b) => instante(b.quando) - instante(a.quando));

  return [...novos, ...historico].slice(0, limite);
}
