// Regras puras de "mover tarefa para outro projeto" (org_tasks.project_id).
//
// Mover uma tarefa não é só trocar project_id: a hierarquia da tela de Projetos
// e tarefas agrupa por projeto e monta a árvore mãe→filha DENTRO de cada projeto
// (ver buildProjetosTarefasHierarchy). Então:
//  - as subtarefas precisam ir junto, senão elas viram tarefas soltas no projeto
//    antigo enquanto a mãe aparece no novo;
//  - uma subtarefa movida sozinha deixa de ser subtarefa (parent_task_id = null),
//    porque a mãe continua no projeto de origem;
//  - se o projeto de destino é de outro cliente, cliente e contribuinte da tarefa
//    acompanham o projeto — contribuinte pertence a um cliente.

/** Subconjunto de OrgProject necessário para calcular o movimento. */
export interface MoveTargetProject {
  id: string;
  name: string;
  external_client_id: string | null;
  contribuinte_id: string | null;
}

/** Subconjunto de OrgTask necessário para calcular o movimento. */
export interface MovableTask {
  id: string;
  project_id: string | null;
  client_id: string | null;
  contribuinte_id: string | null;
  parent_task_id: string | null;
}

export interface MoveTaskPlan {
  /** Campos a atualizar na tarefa movida. */
  rootChanges: Record<string, unknown>;
  /** Campos a atualizar em cada descendente (mesmo payload para todos). */
  descendantChanges: Record<string, unknown>;
  descendantIds: string[];
  /** A tarefa é uma subtarefa e vai perder o vínculo com a mãe. */
  detachesFromParent: boolean;
  /** O cliente da tarefa muda por causa do cliente do projeto de destino. */
  changesClient: boolean;
  /** O contribuinte atual não vale mais no destino e será substituído/limpo. */
  changesContribuinte: boolean;
}

/**
 * IDs de todos os descendentes (subtarefas, netas, …) de uma tarefa dentro de
 * uma lista já carregada. Guarda contra ciclos em parent_task_id.
 */
export function collectDescendantIds(rootId: string, tasks: { id: string; parent_task_id: string | null }[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const task of tasks) {
    if (!task.parent_task_id || task.parent_task_id === task.id) continue;
    const siblings = childrenByParent.get(task.parent_task_id) || [];
    siblings.push(task.id);
    childrenByParent.set(task.parent_task_id, siblings);
  }

  const collected: string[] = [];
  const visited = new Set<string>([rootId]);
  let frontier = [rootId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const parentId of frontier) {
      for (const childId of childrenByParent.get(parentId) || []) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        collected.push(childId);
        next.push(childId);
      }
    }
    frontier = next;
  }
  return collected;
}

/**
 * Monta o plano de movimentação. `descendantIds` vem do banco (no hook) ou da
 * lista em memória (na prévia do modal) — a regra dos campos é a mesma.
 */
export function buildMoveTaskPlan({
  task,
  target,
  descendantIds,
}: {
  task: MovableTask;
  target: MoveTargetProject;
  descendantIds: string[];
}): MoveTaskPlan {
  // Projeto sem cliente cadastrado não zera o cliente da tarefa: seria perda de
  // informação sem ganho, já que a hierarquia agrupa pelo projeto.
  const changesClient = !!target.external_client_id && target.external_client_id !== task.client_id;
  const nextContribuinteId = target.contribuinte_id ?? null;
  const changesContribuinte = changesClient && task.contribuinte_id !== nextContribuinteId;

  const clientChanges = changesClient
    ? { client_id: target.external_client_id, contribuinte_id: nextContribuinteId }
    : {};

  const detachesFromParent = !!task.parent_task_id;

  return {
    rootChanges: {
      project_id: target.id,
      ...clientChanges,
      ...(detachesFromParent ? { parent_task_id: null } : {}),
    },
    descendantChanges: { project_id: target.id, ...clientChanges },
    descendantIds,
    detachesFromParent,
    changesClient,
    changesContribuinte,
  };
}

/**
 * Reduz uma seleção às tarefas "raiz": descarta as marcadas que já viajam como
 * descendentes de outra marcada. Sem isso, uma filha selecionada junto com a mãe
 * seria movida em separado e `buildMoveTaskPlan` zeraria seu `parent_task_id` —
 * ela chegaria ao destino solta, fora da mãe.
 *
 * `tasks` precisa conter também os ancestrais (mesmo não selecionados), senão a
 * cadeia mãe→avó se quebra e uma neta selecionada passaria como raiz.
 */
export function pruneNestedSelection(
  selectedIds: string[],
  tasks: { id: string; parent_task_id: string | null }[],
): string[] {
  const parentById = new Map(tasks.map(task => [task.id, task.parent_task_id]));
  const selected = new Set(selectedIds);

  return [...selected].filter(id => {
    // Guarda contra ciclos em parent_task_id (mesmo cuidado de collectDescendantIds).
    const visited = new Set<string>([id]);
    let parentId = parentById.get(id) ?? null;
    while (parentId && !visited.has(parentId)) {
      if (selected.has(parentId)) return false;
      visited.add(parentId);
      parentId = parentById.get(parentId) ?? null;
    }
    return true;
  });
}

export interface BulkMovePreview {
  /** Tarefas que serão efetivamente movidas (raízes fora do projeto de destino). */
  movingIds: string[];
  /** Descendentes que vão junto sem estarem marcados. */
  extraDescendantIds: string[];
  /** Selecionadas que já estão no destino e serão ignoradas. */
  alreadyThereIds: string[];
  /** Quantas das que serão movidas perdem o vínculo com a tarefa mãe. */
  detachCount: number;
  changesClientCount: number;
  changesContribuinteCount: number;
}

/**
 * Prévia agregada de mover várias tarefas de uma vez — mesma regra por tarefa
 * (`buildMoveTaskPlan`), somada para caber num aviso só no modal.
 */
export function previewBulkMove({
  selectedIds,
  target,
  tasks,
}: {
  selectedIds: string[];
  target: MoveTargetProject;
  tasks: MovableTask[];
}): BulkMovePreview {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const roots = pruneNestedSelection(selectedIds, tasks).filter(id => byId.has(id));
  const alreadyThereIds = roots.filter(id => byId.get(id)!.project_id === target.id);
  const movingIds = roots.filter(id => byId.get(id)!.project_id !== target.id);

  const selected = new Set(selectedIds);
  const extraDescendants = new Set<string>();
  let detachCount = 0;
  let changesClientCount = 0;
  let changesContribuinteCount = 0;

  for (const id of movingIds) {
    const descendantIds = collectDescendantIds(id, tasks);
    for (const descendantId of descendantIds) {
      if (!selected.has(descendantId)) extraDescendants.add(descendantId);
    }
    const plan = buildMoveTaskPlan({ task: byId.get(id)!, target, descendantIds });
    if (plan.detachesFromParent) detachCount += 1;
    if (plan.changesClient) changesClientCount += 1;
    if (plan.changesContribuinte) changesContribuinteCount += 1;
  }

  return {
    movingIds,
    extraDescendantIds: [...extraDescendants],
    alreadyThereIds,
    detachCount,
    changesClientCount,
    changesContribuinteCount,
  };
}

/** Diff campo-a-campo para o log de auditoria, a partir do payload aplicado. */
export function moveChangedFields(
  before: Record<string, unknown>,
  changes: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> {
  const fields: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, value] of Object.entries(changes)) {
    fields[key] = { old: before[key] ?? null, new: value };
  }
  return fields;
}
