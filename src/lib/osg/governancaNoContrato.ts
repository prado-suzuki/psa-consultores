/**
 * A fonte `governanca` do contexto de flags: quem escolhe, no contrato social,
 * entre o regramento da administração SIMPLES e o dos ÓRGÃOS.
 *
 * Os dois regramentos moram no mesmo Capítulo da Administração e não podem
 * coexistir: com os dois, o contrato sai dizendo que a sociedade é administrada
 * isoladamente por um administrador E que ela tem Conselho e Diretoria; sem
 * nenhum, sai com o cabeçalho do capítulo e nada dentro, que foi o defeito
 * medido em 16/09/2026 (o `.docx` saía com "CAPÍTULO IV / Administração /
 * CAPÍTULO V", zero cláusulas, em todo cliente).
 *
 * As flags do motor são AND simples, sem negação (`flags.ts`), então "e_alteracao
 * E NÃO governança" não se escreve. A saída é a que o motor já usa em
 * `membrosFixo`/`membrosEmFaixa` e `jaAssinado`/`aindaNaoAssinado`: publicar os
 * DOIS LADOS e deixar cada bloco pedir o seu. Daí esta fonte ter um campo que
 * vale `'sim'` e outro que vale `''`, e não um booleano: `avaliarFlags` compara
 * valor de catálogo por igualdade de string, e `administracao_simples` está
 * cadastrada com `valor = ''`.
 *
 * ESTA FONTE NÃO LÊ O CADASTRO quando a peça tem base, e é aí que está a regra
 * inteira. Ler "o cliente tem órgão que entra no contrato" quebrava a alteração
 * de sede feita depois de alguém preencher a Matriz: a flag acendia, a
 * administração simples saía do documento, o capítulo de governança entrava com
 * a lista vazia (sem evento, o estado proposto não publica a lista viva), o
 * descarte tirava os blocos vazios, e o contrato terminava sem administração
 * nenhuma. O cadastro preenchido não é pedido de mudança: quem pede é o evento.
 */

/** O evento que declara instalação ou mudança da governança nesta peça. */
export const FLAG_GOVERNANCA = 'evento_governanca';

/**
 * Os campos que o catálogo (`tmpl_flag`, `entidade = 'governanca'`) aponta:
 * `noContrato` acende `governanca_por_orgaos` em `'sim'` e
 * `administracao_simples` em `''`; `instalada` e `alterada` escolhem qual das
 * duas resoluções a alteração contratual escreve.
 *
 * `type` e não `interface`: a fonte entra em `FontesFlags`, que é um
 * `Record<string, unknown>`, e só o alias ganha o index signature implícito.
 */
export type FonteDeGovernanca = {
  noContrato: 'sim' | '';
  instalada: 'sim' | '';
  alterada: 'sim' | '';
};

export interface EstadoDaGovernancaNaPeca {
  /** A peça substitui uma peça anterior? `false` na constituição. */
  temPecaBase: boolean;
  /**
   * A lista `orgaosComCompetencia` que a peça base PUBLICOU, ou `null` quando o
   * snapshot dela é anterior à governança. Vazia e ausente valem o mesmo aqui:
   * o contrato registrado não tem capítulo de órgãos.
   */
  governancaDaBase: readonly unknown[] | null;
  /** `evento_governanca` confirmado no assistente desta alteração. */
  eventoConfirmado: boolean;
  /** Quantos órgãos do cadastro entram no contrato (`entra_no_contrato`). */
  orgaosNoContrato: number;
}

/**
 * Os três campos da fonte, a partir do que a peça base publicou e do que esta
 * peça declara.
 *
 * Na CONSTITUIÇÃO não há base para comparar, e aí o cadastro decide: é a única
 * leitura possível, e não tem o risco descrito acima porque não existe contrato
 * anterior para contradizer.
 */
export function fonteDeGovernanca(estado: EstadoDaGovernancaNaPeca): FonteDeGovernanca {
  const baseTemGovernanca = (estado.governancaDaBase?.length ?? 0) > 0;
  const noContrato = estado.temPecaBase
    ? baseTemGovernanca || estado.eventoConfirmado
    : estado.orgaosNoContrato > 0;

  /*
   * Instalar e alterar são o MESMO evento com duas redações ("instituem os
   * sócios o Conselho de Administração" contra "alteram-se as alçadas"), e quem
   * separa as duas é o que a base tinha, não uma segunda pergunta ao consultor.
   * Os dois blocos de resolução pedem `evento_governanca` junto, então numa
   * constituição, onde não há resolução nenhuma, `instalada` acesa não escreve
   * nada.
   */
  return {
    noContrato: noContrato ? 'sim' : '',
    instalada: noContrato && !baseTemGovernanca ? 'sim' : '',
    alterada: noContrato && baseTemGovernanca ? 'sim' : '',
  };
}
