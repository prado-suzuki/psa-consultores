// Valor do bem: uma fonte só.
//
// Os valores (contábil, mercado) migraram do bem para a matrícula, mas a lista
// do Diagnóstico Patrimonial continuou lendo a coluna do bem — que ninguém mais
// preenche para imóvel. Resultado: matrícula com R$ 558.413,55 e "Total
// contábil: R$ 0,00" na tela.
//
// A regra, genérica e independente do tipo de bem:
//   · bem COM matrícula  → o valor é a soma das matrículas (derivado na leitura);
//   · bem SEM matrícula  → o valor é o do próprio bem (onde o formulário edita).
//
// Derivar na leitura é deliberado: copiar o valor da matrícula para a coluna do
// bem ao salvar criaria duas verdades, e a segunda desatualizaria no primeiro
// edit que não passasse pela tela.

/** O que a leitura precisa de cada matrícula do bem. */
export interface ValoresDaMatricula {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
}

/** O que a leitura precisa do próprio bem (fonte quando não há matrícula). */
export interface ValoresProprios {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
}

export interface ValoresDoBem {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  /** De onde o número veio — a tela usa para explicar a soma ao consultor. */
  origem: 'matriculas' | 'bem';
  /** Quantas matrículas entraram na soma (0 quando a origem é o bem). */
  matriculas: number;
}

// Soma ignorando nulos, mas devolvendo null quando NENHUMA parcela tem valor:
// "não preenchido" e "zero" são coisas diferentes na tela e no total.
const somar = (valores: Array<number | null | undefined>): number | null => {
  const preenchidos = valores.filter((v): v is number => v != null && !Number.isNaN(Number(v)));
  if (preenchidos.length === 0) return null;
  return preenchidos.reduce((total, v) => total + Number(v), 0);
};

export function derivarValoresDoBem(
  bem: ValoresProprios,
  matriculas: ValoresDaMatricula[] = [],
): ValoresDoBem {
  if (matriculas.length > 0) {
    return {
      vlr_contabil: somar(matriculas.map((m) => m.vlr_contabil)),
      vlr_mercado: somar(matriculas.map((m) => m.vlr_mercado)),
      origem: 'matriculas',
      matriculas: matriculas.length,
    };
  }
  return {
    vlr_contabil: bem.vlr_contabil ?? null,
    vlr_mercado: bem.vlr_mercado ?? null,
    origem: 'bem',
    matriculas: 0,
  };
}

/** Totais do rodapé da lista, sempre sobre o valor derivado. */
export function totalizarValoresDosBens(bens: Array<{ valores: ValoresDoBem }>) {
  return bens.reduce(
    (acc, b) => ({
      contabil: acc.contabil + Number(b.valores.vlr_contabil ?? 0),
      mercado: acc.mercado + Number(b.valores.vlr_mercado ?? 0),
    }),
    { contabil: 0, mercado: 0 },
  );
}
