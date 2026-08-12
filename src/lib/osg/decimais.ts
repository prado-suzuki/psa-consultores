// Limite de casas decimais na DIGITAÇÃO, em um lugar só.
//
// Truncar o que o usuário digita é sempre perda de dado, então quem define o
// limite tem de justificá-lo (ver areaUtils e fracaoUtils). Aqui fica só a
// mecânica: cortar as casas excedentes sem arredondar (arredondar em silêncio
// foi o bug de área) e sem mexer em valor vazio ou ainda incompleto.
export function clampDecimais(valor: string, casas: number): string {
  if (!valor) return valor;
  const ponto = valor.indexOf('.');
  if (ponto === -1) return valor;
  const decimais = valor.length - ponto - 1;
  return decimais > casas ? valor.slice(0, ponto + 1 + casas) : valor;
}

/** Passo do `<input type="number">` correspondente a `casas` decimais. */
export const stepDeDecimais = (casas: number): string =>
  casas <= 0 ? '1' : `0.${'0'.repeat(casas - 1)}1`;
