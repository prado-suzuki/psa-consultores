// Helper puro para o filtro de Cluster por página (Digital Rotina). Sem contexto
// global — só a constante do sentinela "Sem cluster" e a função de match usada
// nas páginas Projetos e Processos (tabelas `projects`/`processes` têm cluster_id).

/** Valor do dropdown que isola apenas itens sem cluster (cluster_id NULL). */
export const SEM_CLUSTER = '__sem_cluster__';

/**
 * @param selected '' = todos (inclui sem cluster) · SEM_CLUSTER = só sem cluster · uuid = cluster específico
 * @param clusterId cluster_id da linha
 */
export function matchCluster(selected: string, clusterId: string | null | undefined): boolean {
  if (!selected) return true;
  if (selected === SEM_CLUSTER) return !clusterId;
  return clusterId === selected;
}
