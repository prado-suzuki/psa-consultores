/**
 * Aviso de erro de digitação nas horas realizadas.
 *
 * Um apontamento de 1.580h numa tarefa de 159h estimadas não é produtividade
 * ruim: é um dígito a mais. Como as horas alimentam a auditoria de
 * produtividade (`auditProdutividade.ts`), o erro só aparece semanas depois,
 * no relatório, já misturado à soma do colaborador. O aviso nasce aqui, no
 * momento em que o responsável digita.
 *
 * O aviso NÃO é um erro: as horas podem ter estourado de verdade. Quem digitou
 * confirma e salva — o objetivo é impedir o erro silencioso, não o estouro.
 */

/** A partir de quantas vezes a estimativa o apontamento vira suspeito. */
export const RAZAO_HORAS_SUSPEITA = 3;
/** Teto para uma tarefa sem estimativa: uma semana cheia num item só. */
export const LIMITE_HORAS_SEM_ESTIMATIVA = 40;
/** Teto absoluto: nenhuma tarefa isolada consome um trimestre de trabalho. */
export const LIMITE_HORAS_ABSOLUTO = 500;
/** Quão perto da estimativa o valor corrigido precisa cair para ser sugerido. */
const RAZAO_SUGESTAO = 2;

export interface AvisoHorasApontadas {
  /** Frase curta exibida ao lado do campo. */
  mensagem: string;
  /** Valor provável quando o erro parece ser um dígito/vírgula a mais (10× ou 100×). */
  sugestao: number | null;
}

/**
 * Avalia as horas realizadas contra a estimativa da tarefa.
 *
 * Devolve `null` quando o valor é plausível (ou ainda não é um número — a
 * obrigatoriedade continua com a validação do formulário).
 */
export function avaliarHorasApontadas(params: {
  realizadas: number | string | null | undefined;
  estimadas: number | string | null | undefined;
}): AvisoHorasApontadas | null {
  const realizadas = parseHoras(params.realizadas);
  if (realizadas === null || realizadas <= 0) return null;
  const estimadas = parseHoras(params.estimadas);
  const temEstimativa = estimadas !== null && estimadas > 0;

  if (temEstimativa) {
    const razao = realizadas / estimadas;
    if (razao >= RAZAO_HORAS_SUSPEITA) {
      return {
        mensagem: `${formatarHoras(realizadas)}h é ${formatarRazao(
          razao,
        )} vezes as ${formatarHoras(estimadas)}h estimadas — confira a digitação.`,
        sugestao: sugerirCorrecao(realizadas, estimadas),
      };
    }
  }

  if (realizadas > LIMITE_HORAS_ABSOLUTO) {
    return {
      mensagem: `${formatarHoras(realizadas)}h numa tarefa só — confira a digitação.`,
      sugestao: null,
    };
  }

  if (!temEstimativa && realizadas > LIMITE_HORAS_SEM_ESTIMATIVA) {
    return {
      mensagem: `${formatarHoras(
        realizadas,
      )}h numa tarefa sem estimativa — confira a digitação.`,
      sugestao: null,
    };
  }

  return null;
}

/**
 * Valor provável quando o erro é de escala: 158,5 digitado como 1585 (vírgula
 * esquecida) ou 15850. Só sugere quando o candidato cai perto da estimativa —
 * senão a "sugestão" seria um chute pior que o valor digitado.
 */
function sugerirCorrecao(realizadas: number, estimadas: number): number | null {
  for (const divisor of [10, 100]) {
    const candidato = Math.round((realizadas / divisor) * 100) / 100;
    const razao = candidato / estimadas;
    if (razao <= RAZAO_SUGESTAO && razao >= 1 / RAZAO_SUGESTAO) return candidato;
  }
  return null;
}

/** Aceita número, string com ponto ou com vírgula (o campo é digitado à mão). */
function parseHoras(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

export function formatarHoras(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function formatarRazao(razao: number): string {
  return razao.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
