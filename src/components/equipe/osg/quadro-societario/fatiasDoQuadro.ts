import type { LinhaSocio } from './TabelaSocios';

// As cores e as fatias do quadro societário: uma rampa SEQUENCIAL, não um arco-íris.
//
// As fatias entram ordenadas da maior para a menor, e a cor acompanha o
// tamanho: o maior sócio fica no verde-musgo cheio da marca e os demais vão
// clareando na mesma matiz. Paleta categórica (uma cor por sócio, tiradas da
// roda) colocaria seis matizes concorrendo num painel cuja identidade é bege e
// musgo, e ainda sugeriria que sócio tem categoria — o que ele não tem: o que
// distingue um do outro aqui é só quanto do capital ele detém.
//
// A matiz é a do `--osg-moss` (149). Claridade e saturação andam juntas para o
// contraste com o texto branco/escuro não desabar no meio da rampa.

/** Quantas fatias a rosca desenha antes de agrupar o resto em "Outros". */
export const MAXIMO_DE_FATIAS = 8;

/** Cinza-areia dos agrupados: fora da rampa, porque não é um sócio. */
export const COR_DOS_OUTROS = 'hsl(30 18% 66%)';

/**
 * A cor da i-ésima fatia (da maior para a menor) numa rosca de `quantas`. A
 * rampa se ESTICA pelo número de fatias em vez de andar em degraus fixos: com
 * degrau fixo, uma sociedade de dois sócios ganhava dois verdes quase iguais —
 * que é o caso mais comum da base, não a exceção. Além da rampa (i >= 8) tudo
 * cai no cinza dos agrupados: a rosca nunca chega lá, mas a tabela sim.
 */
export function corDaFatia(i: number, quantas: number): string {
  if (i >= MAXIMO_DE_FATIAS) return COR_DOS_OUTROS;
  const passos = Math.min(quantas, MAXIMO_DE_FATIAS) - 1;
  const t = passos > 0 ? i / passos : 0;
  const saturacao = 66 - 36 * t;
  const claridade = 22 + 38 * t;
  return `hsl(149 ${saturacao.toFixed(1)}% ${claridade.toFixed(1)}%)`;
}

export interface FatiaDaRosca {
  chave: string;
  nome: string;
  /** Participação no capital, em pontos percentuais (0 a 100). */
  percentual: number;
  cor: string;
}

/**
 * As fatias, na ordem da rampa: o maior sócio primeiro, o excedente agrupado.
 * Devolve também a cor de CADA pessoa, que a tabela usa nos pontos das linhas —
 * quem ficou no agrupamento recebe o cinza de "Outros", e não uma cor própria
 * que a rosca não desenhou.
 */
export function montarFatias(
  linhas: readonly { pessoaId: string | null; denominacao: string; percentual: number }[],
): { fatias: FatiaDaRosca[]; corPorLinha: Map<string, string> } {
  const ordenadas = [...linhas].sort((a, b) => b.percentual - a.percentual);
  const chaveDe = (l: { pessoaId: string | null; denominacao: string }) => l.pessoaId ?? l.denominacao;

  // Quantas cores a rampa tem de cobrir: uma por sócio, ou as sete nominais
  // mais o agrupamento quando houver mais gente do que a rosca desenha.
  const quantas = Math.min(ordenadas.length, MAXIMO_DE_FATIAS);

  const corPorLinha = new Map<string, string>();
  ordenadas.forEach((l, i) => corPorLinha.set(chaveDe(l), corDaFatia(i, quantas)));

  if (ordenadas.length <= MAXIMO_DE_FATIAS) {
    return {
      fatias: ordenadas.map((l, i) => ({
        chave: chaveDe(l),
        nome: l.denominacao,
        percentual: l.percentual,
        cor: corDaFatia(i, quantas),
      })),
      corPorLinha,
    };
  }

  // Sete nominais + o agrupamento, para a rosca fechar em oito fatias.
  const nominais = ordenadas.slice(0, MAXIMO_DE_FATIAS - 1);
  const resto = ordenadas.slice(MAXIMO_DE_FATIAS - 1);
  for (const l of resto) corPorLinha.set(chaveDe(l), COR_DOS_OUTROS);

  return {
    fatias: [
      ...nominais.map((l, i) => ({
        chave: chaveDe(l),
        nome: l.denominacao,
        percentual: l.percentual,
        cor: corDaFatia(i, quantas),
      })),
      {
        chave: '__outros__',
        nome: `Outros ${resto.length} sócios`,
        percentual: resto.reduce((s, l) => s + l.percentual, 0),
        cor: COR_DOS_OUTROS,
      },
    ],
    corPorLinha,
  };
}

/** A mesma chave que a rosca e a tabela usam para casar fatia e linha. */
export const chaveDaLinha = (l: Pick<LinhaSocio, 'pessoaId' | 'denominacao'>) =>
  l.pessoaId ?? l.denominacao;
