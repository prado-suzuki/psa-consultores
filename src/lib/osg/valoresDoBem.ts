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
//
// Soma parcial não se apresenta como total: cada métrica leva quantas matrículas
// CONTRIBUÍRAM, porque duas matrículas com só uma preenchida dão um número
// menor que o real, e a tela precisa dizer isso em vez de afirmar "soma de 2".

// A terceira métrica, o valor de ITR, sai de `vlr_imposto_anual`. O nome da
// coluna diz imposto, mas o campo guarda o valor DECLARADO no ITR — é assim que
// o Diagnóstico Patrimonial a usa e é isso que a OSG preenche; o formulário da
// matrícula a rotula "ITR anual" para rural e "IPTU anual" para urbano. O nome
// ficou infeliz e renomear coluna em uso é outra conversa.

/** O que a leitura precisa de cada matrícula do bem. */
export interface ValoresDaMatricula {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  /** Valor declarado no ITR/IPTU, apesar do nome da coluna. */
  vlr_imposto_anual: number | null;
}

/** O que a leitura precisa do próprio bem (fonte quando não há matrícula). */
export interface ValoresProprios {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  vlr_imposto_anual: number | null;
}

export interface ValorDerivado {
  /** null = nenhuma parcela preenchida (diferente de zero). */
  valor: number | null;
  /** Quantas matrículas tinham este valor preenchido (0 quando vem do bem). */
  comValor: number;
}

export interface ValoresDoBem {
  contabil: ValorDerivado;
  mercado: ValorDerivado;
  itr: ValorDerivado;
  /** De onde o número veio — a tela usa para explicar a soma ao consultor. */
  origem: 'matriculas' | 'bem';
  /** Quantas matrículas o bem tem (nem todas necessariamente com valor). */
  matriculas: number;
}

// Soma ignorando nulos, mas devolvendo null quando NENHUMA parcela tem valor:
// "não preenchido" e "zero" são coisas diferentes na tela e no total.
const somar = (valores: Array<number | null | undefined>): ValorDerivado => {
  const preenchidos = valores.filter((v): v is number => v != null && !Number.isNaN(Number(v)));
  if (preenchidos.length === 0) return { valor: null, comValor: 0 };
  return {
    valor: preenchidos.reduce((total, v) => total + Number(v), 0),
    comValor: preenchidos.length,
  };
};

export function derivarValoresDoBem(
  bem: ValoresProprios,
  matriculas: ValoresDaMatricula[] = [],
): ValoresDoBem {
  if (matriculas.length > 0) {
    return {
      contabil: somar(matriculas.map((m) => m.vlr_contabil)),
      mercado: somar(matriculas.map((m) => m.vlr_mercado)),
      itr: somar(matriculas.map((m) => m.vlr_imposto_anual)),
      origem: 'matriculas',
      matriculas: matriculas.length,
    };
  }
  return {
    contabil: { valor: bem.vlr_contabil ?? null, comValor: 0 },
    mercado: { valor: bem.vlr_mercado ?? null, comValor: 0 },
    itr: { valor: bem.vlr_imposto_anual ?? null, comValor: 0 },
    origem: 'bem',
    matriculas: 0,
  };
}

/**
 * De onde saiu o número da célula, para a lista não afirmar "soma de 2
 * matrículas" quando só uma tinha valor.
 */
export function origemDoValor(
  valores: ValoresDoBem,
  metrica: 'contabil' | 'mercado' | 'itr',
): string {
  if (valores.origem === 'bem') return 'Valor do próprio bem (sem matrícula)';
  const { comValor } = valores[metrica];
  if (comValor === 0) return `Nenhuma das ${valores.matriculas} matrículas do bem tem este valor`;
  if (comValor === valores.matriculas) {
    return `Soma das ${valores.matriculas} matrícula(s) do bem`;
  }
  return `Soma parcial: ${comValor} de ${valores.matriculas} matrículas com este valor`;
}

/** Totais do rodapé da lista, sempre sobre o valor derivado. */
export function totalizarValoresDosBens(bens: Array<{ valores: ValoresDoBem }>) {
  return bens.reduce(
    (acc, b) => ({
      contabil: acc.contabil + Number(b.valores.contabil.valor ?? 0),
      mercado: acc.mercado + Number(b.valores.mercado.valor ?? 0),
    }),
    { contabil: 0, mercado: 0 },
  );
}
