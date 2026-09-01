/**
 * Clusters que a diretoria pediu FORA da leitura (28/08): não são a estrutura
 * viva (PSA Auditores, PSA Norte, Prado Advogados).
 *
 * Comparação por nome normalizado — o id muda entre ambientes; o rótulo é o
 * que a reunião nomeou. "Prado Advogados" não casa com "Prado Suzuki".
 */

const LEGADO = new Set(['psa consultores', 'p consultores', 'prado suzuki']);

export function normalizarNomeCluster(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function eClusterLegado(nome: string | null | undefined): boolean {
  if (!nome) return false;
  return LEGADO.has(normalizarNomeCluster(nome));
}

export function filtrarLegado<T extends { cluster_nome?: string | null }>(linhas: T[]): T[] {
  return linhas.filter((l) => !eClusterLegado(l.cluster_nome));
}
