// Formatação de exibição da Calculadora de ITCD.
//
// O motor devolve `string` decimal ("25678598.54"), e é dela que a tela formata:
// passar por `Number` antes de exibir reintroduziria o float que a especificação
// proíbe, ainda que só na casa que o usuário lê. Agrupar dígitos em string custa
// seis linhas e não tem casa de erro.
//
// Ausência é `—`, nunca `R$ 0,00`. Zero e ausência são coisas diferentes, e um
// cenário que soma parcial e se apresenta como total é a pior saída possível
// numa ferramenta de decisão.

export const TRACO = '—';

export const fmtQuotas = new Intl.NumberFormat('pt-BR');

const agrupar = (inteiro: string) => inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** "25678598.54" → "R$ 25.678.598,54"; `null` → "—". */
export function brlDeDecimal(valor: string | null | undefined): string {
  if (valor == null) return TRACO;
  const negativo = valor.startsWith('-');
  const [inteiro, decimais = '00'] = (negativo ? valor.slice(1) : valor).split('.');
  return `${negativo ? '-' : ''}R$ ${agrupar(inteiro)},${decimais.padEnd(2, '0').slice(0, 2)}`;
}

/** `number` do cadastro → "R$ 1.234,56"; `null` → "—". */
export function brlDeNumero(valor: number | null | undefined): string {
  if (valor == null) return TRACO;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "50.0000" → "50,0000%". */
export function pctDeDecimal(valor: string): string {
  return `${valor.replace('.', ',')}%`;
}

/** Quotas em bigint → "6.649.400". */
export function quotasDeBigint(valor: bigint): string {
  return agrupar(valor.toString());
}

/**
 * Dígitos crus → agrupados: "1000000" → "1.000.000".
 *
 * Para CAMPO, e não só leitura: um milhão digitado como `1000000` é o tipo de número
 * que induz erro de uma casa, e agrupar enquanto se digita é o que evita isso.
 */
export function agruparDigitos(digitos: string): string {
  const so = digitos.replace(/\D/g, '');
  return so === '' ? '' : agrupar(so);
}

/**
 * Texto de valor em reais SENDO DIGITADO → com milhar agrupado, preservando o que
 * ainda está no meio: "1000000," fica "1.000.000," e não perde a vírgula.
 */
export function agruparValorDigitado(texto: string): string {
  if (texto.trim() === '') return '';
  const [inteiro = '', ...resto] = texto.replace(/\./g, '').split(',');
  const agrupado = agruparDigitos(inteiro);
  if (resto.length === 0) return agrupado;
  return `${agrupado},${resto.join('').replace(/\D/g, '').slice(0, 2)}`;
}
