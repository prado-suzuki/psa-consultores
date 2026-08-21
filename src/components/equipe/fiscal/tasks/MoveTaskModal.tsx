import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, FolderKanban } from 'lucide-react';
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
import { type OrgTask, useMoveOrgTaskToProject } from '@/hooks/useOrgTasks';
import { buildMoveTaskPlan, collectDescendantIds } from '@/lib/orgTaskMove';
import { buildProjectHint, clientName } from '@/lib/moveTargetLabels';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';
import { MoveTargetProjectPicker } from '@/components/equipe/fiscal/tasks/MoveTargetProjectPicker';

interface MoveTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: OrgTask | null;
  area: AreaKey;
  /** Projetos elegíveis como destino — os mesmos que a tela lista. */
  projects: OrgProject[];
  /** Tarefas carregadas, para prever quantas subtarefas vão junto. */
  tasks: OrgTask[];
  /** OS dos projetos, para distinguir projetos de nome igual. */
  osRows: ProjetosTarefasOs[];
}

export const MoveTaskModal = ({
  open,
  onOpenChange,
  task,
  area,
  projects,
  tasks,
  osRows,
}: MoveTaskModalProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const moveTask = useMoveOrgTaskToProject(area);
  const { data: targetMembers = [] } = useProjectMembers(selectedProjectId || undefined);
  const labels = useMemo(() => buildProjectHint(tasks, osRows), [tasks, osRows]);

  // Cada abertura começa limpa: manter a seleção anterior faria mover a tarefa
  // errada num clique distraído.
  useEffect(() => {
    if (!open) return;
    setSelectedProjectId('');
  }, [open, task?.id]);

  const currentProject = projects.find(project => project.id === task?.project_id) || null;
  const targetProject = projects.find(project => project.id === selectedProjectId) || null;

  const descendantIds = useMemo(
    () => (task ? collectDescendantIds(task.id, tasks) : []),
    [task, tasks],
  );

  const plan = useMemo(() => (task && targetProject
    ? buildMoveTaskPlan({ task, target: targetProject, descendantIds })
    : null), [task, targetProject, descendantIds]);

  const parentTitle = task?.parent_task_id
    ? tasks.find(item => item.id === task.parent_task_id)?.title
    : null;

  const warnings = useMemo(() => {
    if (!plan || !targetProject) return [];
    const items: string[] = [];
    if (descendantIds.length > 0) {
      items.push(`${descendantIds.length} subtarefa(s) serão movidas junto com esta tarefa.`);
    }
    if (plan.detachesFromParent) {
      items.push(
        `Esta subtarefa deixará de pertencer a "${parentTitle || 'tarefa mãe'}" e passará a ser uma tarefa principal do projeto de destino.`,
      );
    }
    if (plan.changesClient) {
      items.push(
        `O cliente da tarefa passará de "${clientName(currentProject)}" para "${clientName(targetProject)}".`,
      );
    }
    if (plan.changesContribuinte) {
      items.push(targetProject.contribuinte_id
        ? 'O contribuinte passará a ser o do projeto de destino.'
        : 'O contribuinte será limpo — reabra a tarefa para informar o contribuinte correto.');
    }
    // Projeto legado sem membros gravados não gera aviso: a lista vazia não
    // significa que ninguém participa (mesmo critério do TaskModal).
    if (
      task?.assigned_to
      && targetMembers.length > 0
      && !targetMembers.some(member => member.user_id === task.assigned_to)
    ) {
      items.push(
        `${task.assigned_to_name || 'O responsável'} não é membro do projeto de destino — reatribua a tarefa se necessário.`,
      );
    }
    return items;
  }, [plan, targetProject, currentProject, descendantIds.length, parentTitle, task?.assigned_to, task?.assigned_to_name, targetMembers]);

  const handleMove = async () => {
    if (!task || !selectedProjectId) return;
    try {
      await moveTask.mutateAsync({ taskId: task.id, targetProjectId: selectedProjectId });
      onOpenChange(false);
    } catch (error) {
      // O toast de erro já vem do hook; aqui só mantemos o modal aberto.
      console.error('Error moving task:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover tarefa</DialogTitle>
          <DialogDescription className="line-clamp-2">{task?.title}</DialogDescription>
        </DialogHeader>

        {/* min-w-0: DialogContent é um grid — sem isso, um nome de projeto longo
            estica a coluna e o conteúdo vaza para fora do modal. */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Projeto atual</p>
            <div className="mt-1 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-medium">
                {currentProject?.name || task?.project?.name || 'Sem projeto'}
              </span>
            </div>
            {currentProject && (
              <>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{clientName(currentProject)}</span>
                </div>
                <p className="mt-1 truncate pl-[22px] text-[11px] text-muted-foreground/80">
                  {labels.hint(currentProject)}
                </p>
              </>
            )}
          </div>

          <MoveTargetProjectPicker
            projects={projects}
            tasks={tasks}
            osRows={osRows}
            excludeProjectId={task?.project_id}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moveTask.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleMove} disabled={!selectedProjectId || moveTask.isPending}>
            {moveTask.isPending ? 'Movendo...' : 'Mover tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
