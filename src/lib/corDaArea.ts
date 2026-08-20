/**
 * A cor de uma área — derivada, não escolhida.
 *
 * Havia um seletor de cor com oito amostras, e o resultado está medido: das 10
 * áreas cadastradas, SETE ficaram no mesmo verde, que era o terceiro preset.
 * Escolha manual não diferenciava — só dava trabalho e produzia repetição. A cor
 * passou a sair de um índice, atribuído no primeiro slot livre quando a área
 * nasce e gravado em `estrutura_areas.color_index`.
 *
 * POR QUE ÍNDICE PERSISTIDO, e não derivação na leitura. Duas alternativas
 * foram medidas com os 10 ids reais e as duas falham:
 *
 * · `md5(id) % 8` é estável mas COLIDE: nos dados de hoje usa 6 dos 10 slots,
 *   com um slot recebendo três áreas.
 * · `row_number() over (order by created_at)` espalha sem colisão, mas APAGAR
 *   uma área desloca todas as posteriores — excluir a terceira repinta sete.
 *
 * Gravar o índice fica com o melhor dos dois: espalhado porque o primeiro slot
 * livre nunca colide, estável porque não é recalculado, e imune a exclusão —
 * a área apagada devolve o slot para a próxima que nascer.
 *
 * ONDE A COLISAO E TRATADA — e sao dois lugares, de proposito.
 *
 * Com mais areas que tons (10 areas, 8 slots) duas sempre compartilham. O
 * instante em que uma colisao adormecida ACORDA nao e a criacao: e a ativacao,
 * porque area inativa nao mostra ponto.
 *
 * · CRIACAO: aqui, com `proximoIndiceDeCor`. Passa pelo aplicativo.
 * · ATIVACAO: no BANCO, pelo trigger `realoca_color_index_na_ativacao`
 *   (migracao 20260820150000). NAO da para fazer daqui: nada em src/ escreve
 *   `estrutura_areas.is_active` — as referencias sao todas filtro de leitura, e
 *   area se ativa por update direto no banco. Uma checagem em TypeScript nunca
 *   dispararia.
 *
 * NAO acrescente aqui uma checagem de ativacao achando que falta: ela existe, e
 * no unico lugar onde o evento passa.
 *
 * `estrutura_areas.color` continua existindo como OVERRIDE, hoje nulo em todas
 * as linhas. Não há tela para ele: quem precisar de uma cor específica pede um
 * `update`. É de propósito — o escape serve o caso raro e não convida ao caso
 * comum, que foi justamente o que produziu as sete áreas verdes.
 */

/** Quantos tons a paleta oferece. Ver `--area-1..8` em `src/index.css`. */
export const TOTAL_DE_TONS = 8;

/** Nome do tom, para a leitura que substituiu o seletor na tela. */
export const NOMES_DOS_TONS = [
  'terracota', 'ocre', 'oliva', 'verde-mar',
  'petróleo', 'ardósia', 'ameixa', 'vinho',
] as const;

export interface AreaComCor {
  /** Slot gravado. `null` em área anterior à migração. */
  color_index?: number | null;
  /** Override manual. Nulo em todas as linhas hoje. */
  color?: string | null;
}

/**
 * O primeiro slot livre, dados os índices já em uso.
 *
 * Percorre 1..8 e devolve o primeiro que ninguém ocupa. Passando de 8 áreas os
 * tons recomeçam — duas áreas dividem um tom, e isso é aceitável porque o nome
 * vem sempre ao lado do ponto (ver o bloco `--area-*` no index.css). Quando
 * recomeça, reusa o slot MENOS usado, para a repetição se espalhar em vez de
 * empilhar no primeiro.
 */
export function proximoIndiceDeCor(indicesEmUso: readonly (number | null | undefined)[]): number {
  const uso = new Map<number, number>();
  for (let i = 1; i <= TOTAL_DE_TONS; i += 1) uso.set(i, 0);
  for (const indice of indicesEmUso) {
    if (indice == null) continue;
    const slot = normalizar(indice);
    uso.set(slot, (uso.get(slot) ?? 0) + 1);
  }
  let escolhido = 1;
  for (let i = 1; i <= TOTAL_DE_TONS; i += 1) {
    if ((uso.get(i) ?? 0) < (uso.get(escolhido) ?? 0)) escolhido = i;
  }
  return escolhido;
}

/** Traz qualquer inteiro para 1..8. Índice fora da faixa não pode sumir com o ponto. */
function normalizar(indice: number): number {
  const resto = Math.abs(Math.trunc(indice) - 1) % TOTAL_DE_TONS;
  return resto + 1;
}

/**
 * A classe de fundo do ponto da área, ou `null` quando não há ponto.
 *
 * Devolve `null` — e o chamador não renderiza nada — quando a área não tem
 * índice nem override. Ponto cinza de reserva seria pior: ele afirma "esta área
 * tem cor" sobre uma área que não tem.
 *
 * As classes vêm ESCRITAS por extenso porque o Tailwind lê o código-fonte
 * procurando nomes literais: `bg-area-${n}` não é encontrado, a classe não entra
 * no CSS e o ponto sai sem cor — sem erro de build, de lint ou de tipo.
 */
const CLASSES = [
  'bg-area-1', 'bg-area-2', 'bg-area-3', 'bg-area-4',
  'bg-area-5', 'bg-area-6', 'bg-area-7', 'bg-area-8',
] as const;

export function classeDaCorDaArea(area: AreaComCor | null | undefined): string | null {
  if (!area) return null;
  if (area.color_index == null) return null;
  return CLASSES[normalizar(area.color_index) - 1];
}

/**
 * O override manual, quando existe. Vem separado da classe porque é `style`
 * inline: hex arbitrário não tem classe de Tailwind.
 */
export function estiloDaCorDaArea(area: AreaComCor | null | undefined): { backgroundColor: string } | undefined {
  const override = area?.color?.trim();
  return override ? { backgroundColor: override } : undefined;
}

/** Nome do tom da área, para a leitura na tela. `null` sem índice. */
export function nomeDoTomDaArea(area: AreaComCor | null | undefined): string | null {
  if (area?.color_index == null) return null;
  return NOMES_DOS_TONS[normalizar(area.color_index) - 1];
}
