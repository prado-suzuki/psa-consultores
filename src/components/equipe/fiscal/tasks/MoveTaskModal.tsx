import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, FolderKanban, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AreaKey } from '@/config/areaCategories';
import { type OrgProject, useProjectMembers } from '@/hooks/useOrgProjects';
import { type OrgTask, useMoveOrgTaskToProject } from '@/hooks/useOrgTasks';
import { buildMoveTaskPlan, collectDescendantIds } from '@/lib/orgTaskMove';
import { STATUS_LABELS } from '@/lib/projetosCadastro';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';

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

function normalizeSearch(value: string | null | undefined) {
  return (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function clientName(project: OrgProject | null | undefined) {
  return project?.external_client?.nome || 'Cliente não informado';
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
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const moveTask = useMoveOrgTaskToProject(area);
  const { data: targetMembers = [] } = useProjectMembers(selectedProjectId || undefined);

  // Cada abertura começa limpa: manter a seleção anterior faria mover a tarefa
  // errada num clique distraído.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedProjectId('');
  }, [open, task?.id]);

  const currentProject = projects.find(project => project.id === task?.project_id) || null;
  const targetProject = projects.find(project => project.id === selectedProjectId) || null;

  // Projetos duplicados (mesmo nome, mesmo cliente) só se distinguem pela OS,
  // pelo status e pelo volume de tarefas — é o que decide qual é o que fica.
  const osLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const row of osRows) {
      if (!row.numero_os) continue;
      labels.set(row.os_id, /^os/i.test(row.numero_os) ? row.numero_os : `OS ${row.numero_os}`);
    }
    return labels;
  }, [osRows]);

  const taskCountByProject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of tasks) {
      if (!item.project_id) continue;
      counts.set(item.project_id, (counts.get(item.project_id) || 0) + 1);
    }
    return counts;
  }, [tasks]);

  const osLabel = (project: OrgProject) => (project.ordem_servico_id
    ? osLabelById.get(project.ordem_servico_id) || 'OS vinculada'
    : 'Sem OS');

  const projectHint = (project: OrgProject) => [
    osLabel(project),
    STATUS_LABELS[project.status] || project.status,
    `${taskCountByProject.get(project.id) || 0} tarefa(s)`,
  ].join(' · ');

  const options = useMemo(() => {
    const normalizedSearch = normalizeSearch(search.trim());
    return projects
      .filter(project => project.id !== task?.project_id)
      .filter(project => !normalizedSearch || normalizeSearch(
        `${project.name} ${project.external_client?.nome} ${project.ordem_servico_id ? osLabelById.get(project.ordem_servico_id) : ''}`,
      ).includes(normalizedSearch))
      .sort((a, b) => {
        const byClient = clientName(a).localeCompare(clientName(b), 'pt-BR');
        if (byClient !== 0) return byClient;
        const byName = a.name.localeCompare(b.name, 'pt-BR');
        return byName !== 0 ? byName : osLabel(a).localeCompare(osLabel(b), 'pt-BR');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, task?.project_id, search, osLabelById]);

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
                  {projectHint(currentProject)}
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Projeto de destino</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por projeto, cliente ou OS"
                className="pl-9"
              />
            </div>
            {/* Rolagem nativa em vez de <ScrollArea>: o viewport do Radix envolve
                o conteúdo num wrapper `display:table`, que cresce com o texto e
                impede o truncate dos nomes de projeto. */}
            <div className="h-52 overflow-y-auto rounded-lg border p-2">
              {options.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Nenhum outro projeto disponível.
                </p>
              ) : (
                <RadioGroup value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  {options.map(project => (
                    <div key={project.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted">
                      <RadioGroupItem value={project.id} id={`move-to-${project.id}`} className="mt-1" />
                      <Label htmlFor={`move-to-${project.id}`} className="min-w-0 flex-1 cursor-pointer font-normal">
                        <span className="block truncate font-medium">{project.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {clientName(project)}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                          {projectHint(project)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-md border border-warning bg-warning/5 p-3 dark:bg-warning/20">
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
