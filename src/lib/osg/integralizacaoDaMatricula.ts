// Quanto CADA TITULAR da matrícula declarou e quanto integraliza.
//
// O valor contábil da matrícula é a soma do que cada titular declarou na DIRPF,
// e titular erra para mais ou para menos: o contador do cliente decide então
// quanto cada um integraliza, e essa decisão prevalece sobre a fração. Daí as
// duas colunas de `titularidade` (migration 20260914152326) e daí este módulo,
// que é a conta pura por trás delas.
//
// Duas regras mandam aqui:
//
//   · A VERDADE MORA NA LINHA DE DIREITO. Quem integraliza é quem tem a
//     propriedade, então os valores entram em `DIREITO`/`NUE_PROP`, nunca em
//     `FATO` nem `USUFRUTO` (o usufrutuário não integraliza). A mesma pessoa
//     pode ter linha de fato e de direito, e as duas são a MESMA titularidade:
//     `titularesEfetivos` funde por pessoa, como o `dedupTitulares` do mapeador.
//   · VAZIO EM `vlr_integralizar` SIGNIFICA "NÃO INTEGRALIZA". É isso que
//     expressa a integralização parcial (A integraliza 33%, B segura os 67%):
//     quem está vazio não entra no capital, não recebe quota e segue no texto
//     como área remanescente.

/** Uma linha de `titularidade` da matrícula, no mínimo que a conta precisa. */
export interface LinhaDeTitularidade {
  id: string;
  titular_pessoa_id: string;
  tipo: string;
  fracao: number | null;
  vlr_contabil: number | null;
  vlr_integralizar: number | null;
}

/** Uma PESSOA titular da matrícula, com as linhas dela já fundidas. */
export interface TitularEfetivo {
  pessoaId: string;
  /** A linha que carrega (ou carregaria) os valores: a de direito, se houver. */
  linhaDosValores: string;
  fracao: number | null;
  vlrContabil: number | null;
  vlrIntegralizar: number | null;
}

/** Espécies em que a propriedade (e portanto o valor) mora. */
const ESPECIES_DE_DIREITO = new Set(['DIREITO', 'NUE_PROP']);

export const ehEspecieDeDireito = (tipo: string): boolean => ESPECIES_DE_DIREITO.has(tipo);

/**
 * Uma entrada por PESSOA, na ordem de aparição, fundindo as linhas dela.
 *
 * A fusão prefere a linha DE DIREITO para os valores, e não "a primeira que
 * aparecer": a de fato pode vir antes na lista, e é a de direito que o
 * formulário edita. A fração continua sendo a primeira não nula de qualquer
 * linha, que é o que o mapeador sempre fez.
 */
export function titularesEfetivos(linhas: LinhaDeTitularidade[]): TitularEfetivo[] {
  const porPessoa = new Map<string, TitularEfetivo>();
  const ordem: TitularEfetivo[] = [];

  for (const linha of linhas) {
    const existente = porPessoa.get(linha.titular_pessoa_id);
    if (!existente) {
      const novo: TitularEfetivo = {
        pessoaId: linha.titular_pessoa_id,
        linhaDosValores: linha.id,
        fracao: linha.fracao,
        vlrContabil: linha.vlr_contabil,
        vlrIntegralizar: linha.vlr_integralizar,
      };
      porPessoa.set(linha.titular_pessoa_id, novo);
      ordem.push(novo);
      continue;
    }
    if (existente.fracao == null) existente.fracao = linha.fracao;
    // A linha de direito manda nos valores; entre duas da mesma espécie, quem
    // tem valor preenchido ganha de quem está vazio.
    const preferida =
      ehEspecieDeDireito(linha.tipo) ||
      (existente.vlrContabil == null && existente.vlrIntegralizar == null &&
        (linha.vlr_contabil != null || linha.vlr_integralizar != null));
    if (preferida) {
      existente.linhaDosValores = linha.id;
      existente.vlrContabil = linha.vlr_contabil;
      existente.vlrIntegralizar = linha.vlr_integralizar;
    }
  }

  return ordem;
}

/** Soma dos valores preenchidos, ou `null` quando ninguém preencheu. */
function somar(valores: Array<number | null>): number | null {
  const preenchidos = valores.filter((v): v is number => v != null);
  if (preenchidos.length === 0) return null;
  // Em centavos: 0,1 + 0,2 em float dá 0,30000000000000004, e o rodapé do
  // painel imprimiria isso.
  return preenchidos.reduce((soma, v) => soma + Math.round(v * 100), 0) / 100;
}

/** Σ do contábil declarado pelos titulares. `null` = ninguém declarou. */
export const somaContabilDosTitulares = (titulares: TitularEfetivo[]): number | null =>
  somar(titulares.map((t) => t.vlrContabil));

/** Σ do que entra na sociedade por esta matrícula. `null` = ninguém integraliza. */
export const somaAIntegralizarDosTitulares = (titulares: TitularEfetivo[]): number | null =>
  somar(titulares.map((t) => t.vlrIntegralizar));

/** O que o titular integraliza confere com a fração dele? */
export interface AderenciaDoTitular {
  pessoaId: string;
  /** O que a distribuição de titularidade esperaria dele, em R$. */
  esperado: number;
  /** Diferença (positivo = integraliza mais do que a fração dele pediria). */
  diferenca: number;
  /** Passa de um centavo: a linha acende. */
  foraDoEsperado: boolean;
}

/** Um centavo: abaixo disso é resíduo de arredondamento, não divergência. */
const TOLERANCIA = 0.01;

/**
 * O aviso de §6 do plano: entre QUEM INTEGRALIZA, o esperado de cada um é
 *
 *     esperado_i = Σ vlr_integralizar × (fracao_i / Σ fracao de quem integraliza)
 *
 * e a linha acende quando a diferença passa de um centavo.
 *
 * É AVISO, NÃO TRAVA: a decisão do contador prevalece e o dado salva do mesmo
 * jeito. No exemplo da OSG, titularidade 50/50 com 60/40 a integralizar acende,
 * e apaga quando o contador ajusta para 50/50.
 *
 * Devolve lista VAZIA quando não há o que comparar: ninguém integralizando, ou
 * algum dos que integralizam sem fração cadastrada. Sem fração não existe
 * distribuição de titularidade contra a qual conferir, e acender o aviso ali
 * seria inventar uma expectativa que o cadastro não tem. Na integralização
 * parcial isso não atrapalha: A com 33% integralizando sozinho tem Σ fração =
 * 33, o esperado dele é o próprio total, e nada acende.
 */
export function aderenciaAosTitulares(titulares: TitularEfetivo[]): AderenciaDoTitular[] {
  const integralizam = titulares.filter((t) => t.vlrIntegralizar != null);
  if (integralizam.length === 0) return [];
  if (integralizam.some((t) => t.fracao == null)) return [];

  const somaFracao = integralizam.reduce((soma, t) => soma + t.fracao!, 0);
  if (somaFracao <= 0) return [];
  const total = integralizam.reduce((soma, t) => soma + t.vlrIntegralizar!, 0);

  return integralizam.map((t) => {
    const esperado = (total * t.fracao!) / somaFracao;
    const diferenca = t.vlrIntegralizar! - esperado;
    return {
      pessoaId: t.pessoaId,
      esperado,
      diferenca,
      foraDoEsperado: Math.abs(diferenca) > TOLERANCIA,
    };
  });
}

/** Atalho: mapa por pessoa, que é como a UI consulta linha a linha. */
export function aderenciaPorPessoa(
  titulares: TitularEfetivo[],
): Map<string, AderenciaDoTitular> {
  return new Map(aderenciaAosTitulares(titulares).map((a) => [a.pessoaId, a]));
}
