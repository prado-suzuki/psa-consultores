// Conversão de números para texto por extenso (pt-BR) e formatação numérica.
// É a peça mais sensível do engine: o cartório confere caractere a caractere,
// e a vault aponta o "por extenso" como fonte recorrente de exigência cartorial.
// Por isso é implementado e testado aqui, sem depender de formatação de locale (ICU).

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

const ESCALAS = [
  { singular: '', plural: '' },
  { singular: 'mil', plural: 'mil' },
  { singular: 'milhão', plural: 'milhões' },
  { singular: 'bilhão', plural: 'bilhões' },
];

function ate99(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIAIS[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DEZENAS[d] : `${DEZENAS[d]} e ${UNIDADES[u]}`;
}

function ate999(n: number): string {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) partes.push(ate99(resto));
  return partes.join(' e ');
}

/**
 * Junta os grupos (unidades, milhares, milhões…) com os conectores pt-BR.
 * Convenção: o último grupo é ligado por " e " quando vale menos de 100 ou é
 * múltiplo exato de 100; caso contrário, por ", ".
 * Ex.: 558.413 → "quinhentos e cinquenta e oito mil, quatrocentos e treze".
 */
function juntarGrupos(partes: Array<{ texto: string; valor: number }>): string {
  if (partes.length === 1) return partes[0].texto;
  const ultimo = partes[partes.length - 1];
  const inicio = partes.slice(0, -1).map((p) => p.texto).join(', ');
  const conector = ultimo.valor < 100 || ultimo.valor % 100 === 0 ? ' e ' : ', ';
  return `${inicio}${conector}${ultimo.texto}`;
}

/** Cardinal por extenso (masculino). Ex.: 396 → "trezentos e noventa e seis". */
export function cardinalExtenso(valor: number): string {
  const n = Math.floor(Math.abs(valor));
  if (n === 0) return 'zero';

  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  const partes: Array<{ texto: string; valor: number }> = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    let texto: string;
    if (i === 0) {
      texto = ate999(g);
    } else if (i === 1) {
      texto = g === 1 ? 'mil' : `${ate999(g)} mil`;
    } else {
      const escala = ESCALAS[i];
      texto = `${ate999(g)} ${g === 1 ? escala.singular : escala.plural}`;
    }
    partes.push({ texto, valor: g });
  }
  return juntarGrupos(partes);
}

function listaComE(itens: string[]): string {
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** Valor monetário por extenso. Ex.: 558413.55 → "...reais e cinquenta e cinco centavos". */
export function valorExtenso(valor: number): string {
  const total = Math.round(valor * 100);
  const reais = Math.floor(total / 100);
  const centavos = total % 100;
  const partes: string[] = [];
  if (reais > 0) partes.push(`${cardinalExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos > 0) partes.push(`${cardinalExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  if (partes.length === 0) return 'zero reais';
  return partes.join(' e ');
}

/**
 * Área rural por extenso, na decomposição cartorial hectare/are/centiare.
 * As 4 casas decimais do hectare representam ares (2 primeiras) e centiares (2 últimas).
 * Ex.: 396,4000 ha → "trezentos e noventa e seis hectares e quarenta ares".
 */
export function areaExtenso(hectares: number): string {
  const totalCentiares = Math.round(hectares * 10000);
  const ha = Math.floor(totalCentiares / 10000);
  const ares = Math.floor((totalCentiares % 10000) / 100);
  const centiares = totalCentiares % 100;

  const componentes: string[] = [];
  if (ha > 0) componentes.push(`${cardinalExtenso(ha)} ${ha === 1 ? 'hectare' : 'hectares'}`);
  if (ares > 0) componentes.push(`${cardinalExtenso(ares)} ${ares === 1 ? 'are' : 'ares'}`);
  if (centiares > 0) componentes.push(`${cardinalExtenso(centiares)} ${centiares === 1 ? 'centiare' : 'centiares'}`);
  if (componentes.length === 0) return 'zero hectares';
  return listaComE(componentes);
}

// --- Ordinais e romanos (numeração de cláusulas, parágrafos e capítulos) ----

const ORDINAL_UNIDADES_M = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono'];
const ORDINAL_DEZENAS_M = ['', 'décimo', 'vigésimo', 'trigésimo', 'quadragésimo', 'quinquagésimo', 'sexagésimo', 'septuagésimo', 'octogésimo', 'nonagésimo'];
const ORDINAL_CENTENAS_M = ['', 'centésimo', 'ducentésimo', 'trecentésimo', 'quadringentésimo', 'quingentésimo', 'sexcentésimo', 'septingentésimo', 'octingentésimo', 'nongentésimo'];

/**
 * Ordinal por extenso (1–999). Ex.: 15 → "décimo quinto"; (22, 'f') → "vigésima segunda".
 * É a base dos rótulos "CLÁUSULA DÉCIMA QUINTA" / "Parágrafo Terceiro" da numeração automática.
 */
export function ordinalExtenso(n: number, genero: 'm' | 'f' = 'm'): string {
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    throw new Error(`Ordinal fora do intervalo suportado (1–999): ${n}`);
  }
  const partes = [
    ORDINAL_CENTENAS_M[Math.floor(n / 100)],
    ORDINAL_DEZENAS_M[Math.floor((n % 100) / 10)],
    ORDINAL_UNIDADES_M[n % 10],
  ].filter(Boolean);
  const texto = partes.join(' ');
  // Todas as formas masculinas terminam em "o" ("primeiro", "décimo", "centésimo"):
  // o feminino troca a vogal final de cada palavra.
  return genero === 'f' ? texto.replace(/o\b/g, 'a') : texto;
}

const ROMANOS: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** Numeral romano. Ex.: 13 → "XIII" (capítulos de contrato). */
export function romano(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw new Error(`Romano fora do intervalo suportado (1–3999): ${n}`);
  }
  let resto = n;
  let saida = '';
  for (const [valor, simbolo] of ROMANOS) {
    while (resto >= valor) {
      saida += simbolo;
      resto -= valor;
    }
  }
  return saida;
}

/** Agrupa milhares com ponto: "558413" → "558.413". */
function agruparMilhar(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Área no formato numérico pt-BR com 4 casas. Ex.: 396.4 → "396,4000 ha". */
export function formatarArea(hectares: number): string {
  const [inteiro, decimais] = Math.abs(hectares).toFixed(4).split('.');
  return `${agruparMilhar(inteiro)},${decimais} ha`;
}

/** Valor no formato numérico pt-BR com 2 casas (sem "R$"). Ex.: 558413.55 → "558.413,55". */
export function formatarValor(valor: number): string {
  const [inteiro, decimais] = Math.abs(valor).toFixed(2).split('.');
  return `${agruparMilhar(inteiro)},${decimais}`;
}

/** Inteiro no formato pt-BR (quotas, quantidades). Ex.: 558413 → "558.413". */
export function formatarInteiro(valor: number): string {
  return agruparMilhar(String(Math.floor(Math.abs(valor))));
}

/** Percentual pt-BR com 3 casas e sufixo "%". Ex.: 23.8999 → "23,900%". */
export function formatarPercentual(valor: number): string {
  const [inteiro, decimais] = Math.abs(valor).toFixed(3).split('.');
  return `${agruparMilhar(inteiro)},${decimais}%`;
}

/**
 * Percentual por extenso na forma cartorial "inteiros … por cento", com a parte
 * decimal em milésimos (3 casas, espelhando formatarPercentual).
 * Ex.: 50 → "cinquenta inteiros por cento"; 33,333 → "trinta e três inteiros e
 * trezentos e trinta e três milésimos por cento".
 */
export function percentualExtenso(valor: number): string {
  const total = Math.round(Math.abs(valor) * 1000);
  const inteiro = Math.floor(total / 1000);
  const milesimos = total % 1000;
  const partes: string[] = [];
  if (inteiro > 0) partes.push(`${cardinalExtenso(inteiro)} ${inteiro === 1 ? 'inteiro' : 'inteiros'}`);
  if (milesimos > 0) partes.push(`${cardinalExtenso(milesimos)} ${milesimos === 1 ? 'milésimo' : 'milésimos'}`);
  if (partes.length === 0) return 'zero por cento';
  return `${partes.join(' e ')} por cento`;
}
