import { clampDecimais, stepDeDecimais } from '@/lib/osg/decimais';

// Helpers de formatação/validação de área de matrícula, compartilhados entre
// MatriculaModal, BemModal e ImpedimentosPanel. Mantidos fora dos componentes
// para o Fast Refresh funcionar (react-refresh/only-export-components).
//
// PRECISÃO NÃO DEPENDE DA UNIDADE. A regra antiga dava 2 casas para m² e 4 para
// ha, partindo da premissa de que m² não precisa de decimais — matrícula urbana
// com 699,8677 m² desmente a premissa, e o número era truncado na digitação.
// Precisão de entrada não pode ser menor que a precisão do documento de origem:
// quatro casas atendem ha, m² e a decomposição ha + m², em qualquer unidade que
// venha depois. O que varia por unidade é só a EXIBIÇÃO.

/** Casas decimais aceitas na digitação, iguais para toda unidade. */
export const AREA_DECIMAIS = 4;

/** Passo das setinhas do input numérico — derivado da precisão, não da unidade. */
export const AREA_STEP = stepDeDecimais(AREA_DECIMAIS);

export const formatAreaUnidade = (u: string | null | undefined) => {
  if (u === 'm2') return 'm²';
  if (u === 'ha_m2') return 'ha e m²';
  return u ?? '';
};

// Quantos m² vale uma unidade da grandeza. 'ha_m2' armazena o valor em hectare
// (o inteiro é ha, as 4 decimais são os m²), então é a mesma grandeza de 'ha' —
// trocar entre as duas nunca converte nada, só muda como se lê.
const M2_POR_UNIDADE: Record<string, number> = { ha: 10_000, ha_m2: 10_000, m2: 1 };

const fatorM2 = (u: string | null | undefined) => M2_POR_UNIDADE[u ?? ''] ?? 1;

/** Duas unidades que representam a mesma grandeza (ha e "ha e m²"). */
export const unidadesEquivalentes = (a: string | null | undefined, b: string | null | undefined) =>
  fatorM2(a) === fatorM2(b);

/**
 * Converte de fato o valor digitado ao trocar a unidade (10.000 m² = 1 ha), em
 * vez de reinterpretar o número e mudar a quantidade em silêncio. Campo vazio ou
 * não numérico volta como está.
 */
export function converterArea(
  valor: string,
  de: string | null | undefined,
  para: string | null | undefined,
): string {
  if (!valor.trim()) return valor;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return valor;
  if (unidadesEquivalentes(de, para)) return valor;
  const convertido = (numero * fatorM2(de)) / fatorM2(para);
  // toPrecision limpa o ruído binário (0.06998677000000001) sem tocar na
  // quantidade — a conversão pode legitimamente pedir mais casas do que a
  // digitação aceita (699,8677 m² = 0,06998677 ha).
  return String(Number(convertido.toPrecision(15)));
}

// Decompõe um valor em ha nas partes "ha" e "m²" (123.1234 ha -> 123 ha e 1234 m²).
export const splitHaM2 = (v: number): { ha: number; m2: number } => {
  const ha = Math.floor(v);
  const m2 = Math.round((v - ha) * 10_000);
  // Arredondamento pode estourar para 10000 m² (ex.: 122.99999) — normaliza para o ha seguinte.
  return m2 >= 10_000 ? { ha: ha + 1, m2: 0 } : { ha, m2 };
};

// Casas decimais realmente presentes no valor gravado, para a exibição nunca
// esconder precisão (um valor convertido de m² para ha tem mais de quatro).
const casasDe = (v: number): number => {
  const texto = String(v);
  const ponto = texto.indexOf('.');
  return ponto === -1 ? 0 : Math.min(texto.length - ponto - 1, 8);
};

// Formata o valor completo (número + unidade) para exibição em listas.
export const formatArea = (v: number | null | undefined, u: string | null | undefined): string => {
  if (v == null) return '—';
  if (u === 'ha_m2') {
    const { ha, m2 } = splitHaM2(v);
    return `${ha.toLocaleString('pt-BR')} ha e ${m2.toLocaleString('pt-BR')} m²`;
  }
  const num = v.toLocaleString('pt-BR', {
    maximumFractionDigits: Math.max(AREA_DECIMAIS, casasDe(v)),
  });
  return `${num} ${formatAreaUnidade(u)}`.trim();
};

/** Limita a digitação à precisão única de área — sem olhar a unidade. */
export const clampAreaInput = (v: string) => clampDecimais(v, AREA_DECIMAIS);
