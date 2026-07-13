// Resolução nome→id dos vínculos de etapa no save. Extraído de MapearProcessoPage
// para ser testável — é onde vivia a colisão entre homônimos de clusters diferentes.

export interface SistemaCand {
  id: string;
  cluster_id?: string | null;
}

/**
 * Resolve o id de um vínculo (documento/responsável) a partir do nome exibido:
 *  - sem nome → mantém o id atual (vínculo real ainda não resolvido; não dropar);
 *  - id atual ainda casa com o nome → mantém (evita colisão entre homônimos de clusters diferentes);
 *  - nome mudou → resolve por nome (undefined faz o sync exigir cadastro, em vez de
 *    religar silenciosamente ao id antigo).
 */
export function resolveVinculoId(
  nome: string | undefined,
  curId: string | undefined,
  byNome: Map<string, string>,
  byId: Map<string, string>,
): string | undefined {
  if (!nome?.trim()) return curId;
  if (curId && byId.get(curId) === nome) return curId;
  return byNome.get(nome);
}

/**
 * Sistema não carrega id no editor (enrich resolve p/ nome). Escolhe o candidato
 * do cluster do processo; senão o sem cluster (global); senão o primeiro.
 * Sem candidato → devolve o próprio nome (legado; o sync trata).
 */
export function resolveSistemaId(
  nome: string,
  candidatosPorNome: Map<string, SistemaCand[]>,
  procClusterId: string | null,
): string {
  const cands = candidatosPorNome.get(nome);
  if (!cands || cands.length === 0) return nome;
  return (cands.find((c) => c.cluster_id === procClusterId) ?? cands.find((c) => !c.cluster_id) ?? cands[0]).id;
}
