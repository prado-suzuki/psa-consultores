/**
 * Insights DERIVADOS do dado, nunca escritos para o cenario de hoje.
 *
 * O que motivou este arquivo: o rodape da aba de ingestao dizia "vale checar se
 * alguma pasta esta sendo subida inteira mais de uma vez". Os numeros eram
 * variaveis, mas a HIPOTESE era fixa — se a concentracao mudasse de pasta, ou
 * se as duplicatas se espalhassem, a frase continuaria afirmando a mesma causa.
 *
 * Regra deste modulo: toda funcao devolve `null` quando a condicao que torna a
 * frase verdadeira nao existe. Nada de texto que sobrevive a mudanca do dado.
 *
 * O formato `{ destaque, texto }` deixa o componente aplicar `<strong>` no
 * destaque sem precisar de HTML dentro da string.
 */

export interface Insight {
  /** Entidade ou numero que abre a frase, renderizado em negrito. */
  destaque: string;
  /** O resto da frase. Comeca em minuscula e emenda no destaque. */
  texto: string;
  tom?: 'neutro' | 'risco' | 'alerta';
}

const pctInt = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%` : '0%';

const br = (v: number) => v.toLocaleString('pt-BR');

/** Piso de relevancia: abaixo disso "concentra" e uma palavra grande demais. */
const PISO_CONCENTRACAO = 0.4;

/**
 * "X concentra N% de Y". So aparece quando ha concentracao de verdade — se o
 * volume estiver distribuido, nao ha o que apontar e a funcao devolve null.
 */
export function insightConcentracao<T>(
  itens: T[],
  valor: (item: T) => number,
  nome: (item: T) => string,
  substantivo: string,
  opcoes: { rotuloEntidade?: string; tom?: Insight['tom']; piso?: number } = {},
): Insight | null {
  const total = itens.reduce((acc, i) => acc + valor(i), 0);
  if (total <= 0) return null;

  const lider = itens.reduce<T | null>((acc, i) => (!acc || valor(i) > valor(acc) ? i : acc), null);
  if (!lider) return null;

  const parte = valor(lider);
  const piso = opcoes.piso ?? PISO_CONCENTRACAO;
  if (parte / total < piso) return null;

  const prefixo = opcoes.rotuloEntidade ? `${opcoes.rotuloEntidade} ` : '';
  return {
    destaque: `${prefixo}${nome(lider)}`,
    texto: `concentra ${br(parte)} de ${br(total)} ${substantivo} (${pctInt(parte, total)}).`,
    tom: opcoes.tom,
  };
}

/** "X lidera com N". Sem piso: e ranking, nao concentracao. */
export function insightLider<T>(
  itens: T[],
  valor: (item: T) => number,
  nome: (item: T) => string,
  frase: (valorFormatado: string) => string,
): Insight | null {
  const lider = itens.reduce<T | null>((acc, i) => (!acc || valor(i) > valor(acc) ? i : acc), null);
  if (!lider || valor(lider) <= 0) return null;
  return { destaque: nome(lider), texto: frase(br(valor(lider))) };
}

/**
 * Proporcao entre duas grandezas, dita como fato — sem sugerir a causa.
 * A versao anterior afirmava POR QUE havia tanta duplicata; esta so diz quanto.
 */
export function insightProporcao(
  numerador: number,
  denominador: number,
  substantivoNum: string,
  substantivoDen: string,
): Insight | null {
  if (denominador <= 0 || numerador <= 0) return null;
  const razao = numerador / denominador;
  if (razao < 1) return null;
  const formatada = razao.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return {
    destaque: `${formatada}×`,
    texto: `mais ${substantivoNum} do que ${substantivoDen} no período (${br(numerador)} contra ${br(denominador)}).`,
    tom: 'alerta',
  };
}

/** Pior periodo de uma serie mensal, com o valor ja formatado pelo chamador. */
export function insightPiorMes<T extends { mes: string }>(
  serie: T[],
  valor: (item: T) => number,
  formatar: (v: number) => string,
  substantivo: string,
): Insight | null {
  const pior = serie.reduce<T | null>((acc, m) => (!acc || valor(m) > valor(acc) ? m : acc), null);
  if (!pior || valor(pior) <= 0) return null;
  const rotulo = `${pior.mes.slice(5, 7)}/${pior.mes.slice(2, 4)}`;
  return { destaque: rotulo, texto: `foi o pior mês em ${substantivo}: ${formatar(valor(pior))}.` };
}
