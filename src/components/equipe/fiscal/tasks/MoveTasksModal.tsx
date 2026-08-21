import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ListChecks } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AreaKey } from '@/config/areaCategories';
import { type OrgProject, useProjectMembers } from '@/hooks/useOrgProjects';
import { type OrgTask, useMoveOrgTasksToProject } from '@/hooks/useOrgTasks';
import { clientName } from '@/lib/moveTargetLabels';
import { previewBulkMove } from '@/lib/orgTaskMove';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';
import { MoveTargetProjectPicker } from '@/components/equipe/fiscal/tasks/MoveTargetProjectPicker';

interface MoveTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tarefas marcadas na lista. */
  selectedTasks: OrgTask[];
  area: AreaKey;
  /** Projetos elegíveis como destino — os mesmos que a tela lista. */
  projects: OrgProject[];
  /** Tarefas carregadas, para prever quais subtarefas vão junto. */
  tasks: OrgTask[];
  /** OS dos projetos, para distinguir projetos de nome igual. */
  osRows: ProjetosTarefasOs[];
  /** Chamado depois de um movimento bem-sucedido, para limpar a seleção. */
  onMoved?: () => void;
}

/**
 * Move várias tarefas marcadas para o mesmo projeto de uma vez. A prévia usa a
 * mesma regra do movimento avulso (`previewBulkMove` → `buildMoveTaskPlan`),
 * agregada: quantas vão de fato, quantas subtarefas vão de carona e o que muda
 * de cliente/contribuinte.
 */
export const MoveTasksModal = ({
  open,
  onOpenChange,
  selectedTasks,
  area,
  projects,
  tasks,
  osRows,
  onMoved,
}: MoveTasksModalProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const moveTasks = useMoveOrgTasksToProject(area);
  const { data: targetMembers = [] } = useProjectMembers(selectedProjectId || undefined);

  // Cada abertura começa limpa: manter a seleção anterior faria mover para o
  // projeto errado num clique distraído.
  useEffect(() => {
    if (!open) return;
    setSelectedProjectId('');
  }, [open]);

  const projectNameById = useMemo(
    () => new Map(projects.map(project => [project.id, project.name])),
    [projects],
  );
  const targetProject = projects.find(project => project.id === selectedProjectId) || null;

  const preview = useMemo(() => (targetProject
    ? previewBulkMove({
      selectedIds: selectedTasks.map(task => task.id),
      target: targetProject,
      tasks,
    })
    : null), [targetProject, selectedTasks, tasks]);

  const warnings = useMemo(() => {
    if (!preview || !targetProject) return [];
    const items: string[] = [];
    if (preview.extraDescendantIds.length > 0) {
      items.push(`${preview.extraDescendantIds.length} subtarefa(s) não marcada(s) serão movidas junto com as tarefas mãe.`);
    }
    if (preview.detachCount > 0) {
      items.push(`${preview.detachCount} subtarefa(s) marcada(s) deixarão de pertencer à tarefa mãe e virarão tarefas principais no destino.`);
    }
    if (preview.changesClientCount > 0) {
      items.push(`${preview.changesClientCount} tarefa(s) passarão para o cliente "${clientName(targetProject)}".`);
    }
    if (preview.changesContribuinteCount > 0) {
      items.push(targetProject.contribuinte_id
        ? `O contribuinte de ${preview.changesContribuinteCount} tarefa(s) passará a ser o do projeto de destino.`
        : `O contribuinte de ${preview.changesContribuinteCount} tarefa(s) será limpo — reabra as tarefas para informar o contribuinte correto.`);
    }
    if (preview.alreadyThereIds.length > 0) {
      items.push(`${preview.alreadyThereIds.length} tarefa(s) já estão neste projeto e serão ignoradas.`);
    }
    // Projeto legado sem membros gravados não gera aviso: a lista vazia não
    // significa que ninguém participa (mesmo critério do TaskModal).
    if (targetMembers.length > 0) {
      const memberIds = new Set(targetMembers.map(member => member.user_id));
      const movingIds = new Set(preview.movingIds);
      const outsiders = new Set(selectedTasks
        .filter(task => movingIds.has(task.id) && task.assigned_to && !memberIds.has(task.assigned_to))
        .map(task => task.assigned_to_name || 'Sem nome'));
      if (outsiders.size > 0) {
        items.push(`${[...outsiders].join(', ')} não é/são membro(s) do projeto de destino — reatribua as tarefas se necessário.`);
      }
    }
    return items;
  }, [preview, targetProject, targetMembers, selectedTasks]);

  const handleMove = async () => {
    if (!selectedProjectId || selectedTasks.length === 0) return;
    try {
      await moveTasks.mutateAsync({
        taskIds: selectedTasks.map(task => task.id),
        targetProjectId: selectedProjectId,
      });
      onMoved?.();
      onOpenChange(false);
    } catch (error) {
      // O toast de erro já vem do hook; aqui só mantemos o modal aberto.
      console.error('Error moving tasks:', error);
    }
  };

  const movingCount = preview ? preview.movingIds.length : selectedTasks.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover {selectedTasks.length} tarefa(s)</DialogTitle>
          <DialogDescription>
            Todas as tarefas marcadas vão para o mesmo projeto de destino.
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: DialogContent é um grid — sem isso, um nome de projeto longo
            estica a coluna e o conteúdo vaza para fora do modal. */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5 shrink-0" />
              Tarefas selecionadas
            </div>
            <ul className="mt-1.5 max-h-28 space-y-1 overflow-y-auto">
              {selectedTasks.map(task => (
                <li key={task.id} className="min-w-0">
                  <span className="block truncate font-medium">{task.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {task.project_id
                      ? projectNameById.get(task.project_id) || task.project?.name || 'Projeto atual'
                      : 'Sem projeto'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <MoveTargetProjectPicker
            projects={projects}
            tasks={tasks}
            osRows={osRows}
            value={selectedProjectId}
            onChange={setSelectedProjectId}
          />

          {warnings.length > 0 && (
            <div className="rounded-md border border-warning bg-warning/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {warnings.map(warning => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moveTasks.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedProjectId || movingCount === 0 || moveTasks.isPending}
          >
            {moveTasks.isPending ? 'Movendo...' : `Mover ${movingCount} tarefa(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
