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
  /**
   * O MESMO VALOR EM DECIMAL EXATO, para quem não pode passar por float.
   *
   * `valor` é `number` porque a lista formata e soma para exibir. A apuração do ITCD
   * não pode: somar 100,10 com 200,20 em `number` dá 300.29999999999995, e o motor
   * recusa mais de quatro casas — com razão, porque arredondar por conta própria seria
   * inventar dado. A soma aqui é feita em inteiro e este campo carrega o resultado sem
   * ter passado por ponto flutuante nenhuma vez.
   */
  decimal: string | null;
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

/**
 * Um número do cadastro em partes, do jeito que ele está escrito.
 *
 * `String(v)` dá a forma mais curta que volta ao mesmo número, então `100.1` sai
 * "100.1" e não "100.09999999999999". É por aí que a soma escapa do float: as partes
 * viram inteiro e a conta acontece em `bigint`.
 *
 * Notação exponencial é expandida por `toFixed(20)`, que resolve o caso pequeno
 * (`1e-7`). O que sobrar sem forma decimal simples é erro de cadastro, não de escala,
 * e sobe como erro em vez de virar soma errada em silêncio.
 */
const emPartes = (v: number) => {
  let s = String(v);
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    s = v.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new Error(
      `Valor sem forma decimal no cadastro: ${String(v)}. Corrija o cadastro.`,
    );
  }
  const negativo = s.startsWith('-');
  const [inteiro = '0', decimais = ''] = s.replace('-', '').split('.');
  return { negativo, inteiro, decimais };
};

/** Soma exata: alinha as casas das parcelas e soma em `bigint`. */
const somarExato = (valores: number[]): string => {
  const partes = valores.map(emPartes);
  const casas = partes.reduce((max, p) => Math.max(max, p.decimais.length), 0);
  const total = partes.reduce((acc, p) => {
    const n = BigInt(p.inteiro + p.decimais.padEnd(casas, '0'));
    return acc + (p.negativo ? -n : n);
  }, 0n);
  if (casas === 0) return total.toString();
  const negativo = total < 0n;
  const cru = (negativo ? -total : total).toString().padStart(casas + 1, '0');
  const corte = cru.length - casas;
  return `${negativo ? '-' : ''}${cru.slice(0, corte)}.${cru.slice(corte)}`;
};

// Soma ignorando nulos, mas devolvendo null quando NENHUMA parcela tem valor:
// "não preenchido" e "zero" são coisas diferentes na tela e no total.
const somar = (valores: Array<number | null | undefined>): ValorDerivado => {
  const preenchidos = valores.filter((v): v is number => v != null && !Number.isNaN(Number(v)));
  if (preenchidos.length === 0) return { valor: null, decimal: null, comValor: 0 };
  const decimal = somarExato(preenchidos);
  return {
    // O `number` sai do decimal exato, e não de uma soma de floats: para as parcelas
    // reais do cadastro ele tem as mesmas casas das parcelas, e `String()` volta a
    // imprimir exatamente este decimal.
    valor: Number(decimal),
    decimal,
    comValor: preenchidos.length,
  };
};

/** O valor do próprio bem, sem soma: já é uma parcela só. */
const doBem = (v: number | null | undefined): ValorDerivado => (
  v == null
    ? { valor: null, decimal: null, comValor: 0 }
    : { valor: v, decimal: somarExato([v]), comValor: 0 }
);

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
    contabil: doBem(bem.vlr_contabil),
    mercado: doBem(bem.vlr_mercado),
    itr: doBem(bem.vlr_imposto_anual),
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
