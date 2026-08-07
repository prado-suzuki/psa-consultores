export const META_TAXA_ERRO_API = 0.02;
export const META_P95_MS = 5_000;

const CLUSTER_LABELS: Record<string, string> = {
  'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3': 'PSA Consultores',
  '0523512c-f980-4236-8a7c-53e06c9c7a80': 'PSA OSG',
  '952435d2-ef26-4829-80a2-e186dc61158c': 'PSA Digital',
};

export const rotuloCluster = (clusterId: string | null): string => {
  if (!clusterId) return 'Sem vínculo';
  return CLUSTER_LABELS[clusterId] ?? `Cluster ${clusterId.slice(0, 9)}`;
};

const ultimoDiaDoMes = (mes: string): string => {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, numeroMes, 0)).getUTCDate();
  return `${mes}-${String(ultimoDia).padStart(2, '0')}`;
};

/** Indica quando o fim do recorte ainda não alcançou o último dia do mês. */
export const mesEstaParcial = (mes: string, fimPeriodo: string): boolean =>
  ultimoDiaDoMes(mes) > fimPeriodo;

export function filtrarMesesFechados<T extends { mes: string }>(
  linhas: T[],
  fimPeriodo: string,
): T[] {
  return linhas.filter((linha) => !mesEstaParcial(linha.mes, fimPeriodo));
}

/**
 * Variacao entre os dois ultimos meses FECHADOS. Nunca usa o mes corrente:
 * comparar 6 dias com 31 produz queda que e artefato de calendario, nao operacao.
 * Devolve null quando nao ha dois meses completos na serie.
 */
export function variacaoMesFechado<T extends { mes: string }>(
  serie: T[],
  valor: (item: T) => number,
  fimPeriodo: string,
): { pct: number; rotulo: string } | null {
  const fechados = filtrarMesesFechados(serie, fimPeriodo);
  if (fechados.length < 2) return null;
  const atual = fechados[fechados.length - 1];
  const anterior = fechados[fechados.length - 2];
  const base = valor(anterior);
  if (base === 0) return null;
  const mm = atual.mes.slice(5, 7);
  const aa = atual.mes.slice(2, 4);
  return { pct: (valor(atual) - base) / base, rotulo: `vs. mês anterior (${mm}/${aa})` };
}

/**
 * Ultimo mes FECHADO com seu proprio valor e a variacao contra o anterior.
 * Existe porque pendurar "vs. mes anterior" no total de 8 meses compara
 * grandezas diferentes: o numero grande e do periodo, o delta e de um mes.
 */
export function ultimoMesFechado<T extends { mes: string }>(
  serie: T[],
  valor: (item: T) => number,
  fimPeriodo: string,
): { mes: string; valor: number; pct: number | null } | null {
  const fechados = filtrarMesesFechados(serie, fimPeriodo);
  if (fechados.length === 0) return null;
  const atual = fechados[fechados.length - 1];
  const anterior = fechados[fechados.length - 2];
  const base = anterior ? valor(anterior) : 0;
  return {
    mes: atual.mes,
    valor: valor(atual),
    pct: base > 0 ? (valor(atual) - base) / base : null,
  };
}

/**
 * Mes mais recente da serie, INCLUINDO o corrente, com a variacao contra o
 * anterior e um sinalizador de parcialidade.
 *
 * Substitui `ultimoMesFechado`. A decisao mudou: excluir o mes corrente deixava
 * o dashboard sempre desatualizado em ate 30 dias. Agora ele entra, mas o
 * consumidor recebe `parcial` para poder dizer isso na tela — comparar 6 dias
 * com 31 continua sendo invalido, so que agora e declarado em vez de escondido.
 *
 * Observacao: a serie do payload e mensal, entao "ultimos 30 dias" de verdade
 * exigiria uma quebra diaria vinda do endpoint. Aqui o recorte e o mes.
 */
export function mesMaisRecente<T extends { mes: string }>(
  serie: T[],
  valor: (item: T) => number,
  fimPeriodo: string,
): { mes: string; valor: number; pct: number | null; parcial: boolean } | null {
  if (serie.length === 0) return null;
  const atual = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  const base = anterior ? valor(anterior) : 0;
  return {
    mes: atual.mes,
    valor: valor(atual),
    pct: base > 0 ? (valor(atual) - base) / base : null,
    parcial: mesEstaParcial(atual.mes, fimPeriodo),
  };
}
