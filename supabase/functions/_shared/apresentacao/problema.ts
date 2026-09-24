/*
 * ─── `_shared/apresentacao/` × `_shared/apresentacao-osg/` ──────────────────
 *
 * ESTA pasta e o que os DOIS geradores usam: o vocabulario de avisos e a casca
 * que registra o arquivo. Mexer aqui muda os dois decks.
 *
 * A vizinha, `apresentacao-osg/`, e SO da OSG — regras, conteudo e paginacao. Ela
 * mora sob `_shared` por um motivo tecnico, nao por ser compartilhada: o vitest so
 * enxerga `supabase/functions/_shared/**`, entao codigo de Edge Function que
 * precisa de teste tem de ficar aqui. O mesmo vale para
 * `planejamento-tributario/`, que uma funcao so usa.
 */

/**
 * Aviso de geracao, vocabulario dos dois geradores: `tipo` e `origem` (o cadastro resolve), `formatacao`
 * (nao coube no molde) ou `sistema` (falha nossa); `onde` e a parte do deck. Ha `tipo_inesperado` antigo.
 */
export interface ProblemaDoDeck {
  tipo: "formatacao" | "origem" | "sistema";
  /** A parte do deck: secao, slide, quadro. Nao o nome da entidade. */
  onde: string;
  detalhe: string;
}

/*
 * NAO EXISTE AQUI UM TIPO "COMO SAI DO BANCO", e a ausencia e deliberada.
 *
 * Houve um `ProblemaGravado` (`tipo: string`, para tolerar o `tipo_inesperado`
 * ja gravado) — e nenhum leitor o usou: quem le `problemas` hoje e o parser em
 * `src/lib/planejamento-tributario/parser.ts`, que tem a propria uniao com esse
 * valor dentro. Era tipo sem consumidor, o mesmo erro do campo `extras` que saiu
 * da casca. Quando existir quem leia por aqui, o tipo entra junto com ele.
 */

/** Acumulador opcional: quem nao se importa com o relato chama sem ele. */
export type Probs = ProblemaDoDeck[] | undefined;

/**
 * Registra um problema, se houver quem colecione.
 *
 * `onde` vem antes de `detalhe` de proposito: e o campo que se esquece, e a ordem
 * obriga a pensar nele. `tipo` fica por ultimo porque `origem` cobre a maioria
 * dos casos dos dois geradores.
 */
export function anota(
  probs: Probs,
  onde: string,
  detalhe: string,
  tipo: ProblemaDoDeck["tipo"] = "origem",
): void {
  if (probs) probs.push({ tipo, onde, detalhe });
}
