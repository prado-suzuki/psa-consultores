import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ListTree, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { TaskCompletionHoursDialog } from '@/components/equipe/fiscal/tasks/TaskCompletionHoursDialog';
 import { useTaskCompletionHours } from '@/hooks/useTaskCompletionHours';
import { TaskStatusDot } from '@/components/equipe/tarefas/TaskStatusDot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { SectionHeading } from '@/components/ui/section-heading';
import type { AreaKey } from '@/config/areaCategories';
import {
  useCreateOrgTask,
  useOrgSubtasks,
  useUpdateOrgTask,
  type OrgTask,
  type OrgTaskPriority,
  type OrgTaskStatus,
} from '@/hooks/useOrgTasks';
import {
  buildSubtaskInput,
  subtaskPriorityLabels,
  subtaskPriorityList,
  summarizeSubtasks,
} from '@/lib/orgSubtasks';
import { statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

const GRID = 'grid grid-cols-[minmax(0,1fr)_8rem_6rem] items-center';

interface TaskSubtasksSectionProps {
  /** Tarefa-mãe: dela saem o vínculo e os campos herdados na criação rápida. */
  parentTask: Pick<OrgTask, 'id' | 'project_id' | 'client_id'>;
  area: AreaKey;
  /** Responsáveis possíveis — os mesmos membros do projeto da tarefa-mãe. */
  teamMembers: { id: string; name: string }[];
  /** Revisor delegado apenas revisa: não cria nem altera subtarefa. */
  disabled?: boolean;
}

/**
 * Lista as subtarefas vinculadas à tarefa aberta e permite criar novas sem sair
 * do modal: o nome basta, o resto (projeto e cliente) é herdado da tarefa-mãe.
 */
export function TaskSubtasksSection({
  parentTask,
  area,
  teamMembers,
  disabled = false,
}: TaskSubtasksSectionProps) {
  const { data: subtasks = [], isLoading } = useOrgSubtasks(parentTask.id);
  const createSubtask = useCreateOrgTask(area, { showToasts: false });
  const updateSubtask = useUpdateOrgTask(area, { showToasts: false });

  const conclusao = useTaskCompletionHours();
  const [expandido, setExpandido] = useState(true);
  const [adicionando, setAdicionando] = useState(false);
  const [novoNome, setNovoNome] = useState('');

  const progresso = useMemo(() => summarizeSubtasks(subtasks), [subtasks]);
  const semProjeto = !parentTask.project_id;
  const podeAdicionar = !disabled && !semProjeto;

  const abrirNovaLinha = () => {
    setExpandido(true);
    setAdicionando(true);
  };

  const fecharNovaLinha = () => {
    setAdicionando(false);
    setNovoNome('');
  };

  const criarSubtarefa = async () => {
    const input = buildSubtaskInput(novoNome, parentTask);
    if (!input) return;
    try {
      await createSubtask.mutateAsync(input);
      // Mantém a linha aberta: quem cria subtarefa quase sempre cria a próxima.
      setNovoNome('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar subtarefa');
    }
  };

  const alterarSubtarefa = async (subtask: OrgTask, patch: Partial<OrgTask>) => {
    // Concluir a subtarefa daqui também exige o apontamento — o diálogo pergunta
    // as horas e conclui; sem isso a mutation recusaria e a linha só piscaria.
    if (patch.status === 'done' && !conclusao.pedirHoras(subtask)) return;
    try {
      await updateSubtask.mutateAsync({ id: subtask.id, ...patch });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar subtarefa');
    }
  };

  const alterarResponsavel = (subtask: OrgTask, userId: string) => {
    if (userId === '_none') {
      void alterarSubtarefa(subtask, { assigned_to: null, assigned_to_name: null });
      return;
    }
    const membro = teamMembers.find((member) => member.id === userId);
    void alterarSubtarefa(subtask, {
      assigned_to: userId,
      assigned_to_name: membro?.name || null,
    });
  };

  return (
    <section>
      <SectionHeading
        icon={<ListTree className="h-4 w-4 text-primary" />}
        action={
          podeAdicionar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={abrirNovaLinha}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          )
        }
      >
        <button
          type="button"
          onClick={() => setExpandido((atual) => !atual)}
          aria-expanded={expandido}
          className="flex items-center gap-2 uppercase tracking-wide transition-colors hover:text-foreground"
        >
          {expandido ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          Subtarefas
        </button>
        {progresso.total > 0 && (
          <span className="flex items-center gap-2 text-xs font-normal normal-case tracking-normal text-muted-foreground">
            {progresso.concluidas}/{progresso.total} concluídas
            <Progress value={progresso.percentual} className="h-1.5 w-16 bg-primary/15" />
          </span>
        )}
      </SectionHeading>

      {expandido && (
        <div className="mt-3 overflow-hidden rounded-xl border">
          {progresso.total > 0 && (
            <div
              className={cn(
                GRID,
                'bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
              )}
            >
              <div className="px-3 py-2">Nome</div>
              <div className="px-2 py-2">Responsável</div>
              <div className="px-2 py-2">Prioridade</div>
            </div>
          )}

          {subtasks.map((subtask) => (
            <div key={subtask.id} className={cn(GRID, 'border-t text-sm hover:bg-muted/30')}>
              <div className="flex min-w-0 items-center gap-2 px-3 py-1.5">
                <Select
                  value={subtask.status}
                  onValueChange={(value) =>
                    void alterarSubtarefa(subtask, { status: value as OrgTaskStatus })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger
                    aria-label={`Status de ${subtask.title}`}
                    className="h-6 w-6 shrink-0 justify-center border-0 bg-transparent p-0 shadow-none focus:ring-0 disabled:opacity-100 [&>span]:!flex [&>span]:items-center [&>svg]:hidden"
                  >
                    <span>
                      <TaskStatusDot status={subtask.status} />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {statusList.map((status) => (
                      <SelectItem key={status.key} value={status.key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="truncate font-medium text-foreground">{subtask.title}</span>
              </div>

              <div className="min-w-0 px-2 py-1.5">
                <Select
                  value={subtask.assigned_to || '_none'}
                  onValueChange={(value) => alterarResponsavel(subtask, value)}
                  disabled={disabled}
                >
                  <SelectTrigger
                    aria-label={`Responsável de ${subtask.title}`}
                    className="h-7 w-full justify-start border-0 bg-transparent px-1 shadow-none focus:ring-0 disabled:opacity-100 [&>span]:!flex [&>span]:items-center [&>svg]:hidden"
                  >
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {subtask.assigned_to_name || 'Atribuir'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Não atribuído</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="px-2 py-1.5">
                <Select
                  value={subtask.priority}
                  onValueChange={(value) =>
                    void alterarSubtarefa(subtask, { priority: value as OrgTaskPriority })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger
                    aria-label={`Prioridade de ${subtask.title}`}
                    className="h-7 w-full justify-start border-0 bg-transparent px-1 shadow-none focus:ring-0 disabled:opacity-100 [&>span]:!flex [&>span]:items-center [&>svg]:hidden"
                  >
                    <span className="truncate text-xs text-muted-foreground">
                      {subtaskPriorityLabels[subtask.priority]}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {subtaskPriorityList.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {subtaskPriorityLabels[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {progresso.total === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              {isLoading ? 'Carregando subtarefas…' : 'Nenhuma subtarefa vinculada a esta tarefa.'}
            </p>
          )}

          {podeAdicionar &&
            (adicionando ? (
              <div className="flex items-center gap-2 border-t bg-muted/20 px-3 py-1.5">
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  autoFocus
                  aria-label="Nome da nova subtarefa"
                  placeholder="Nome da subtarefa"
                  value={novoNome}
                  onChange={(event) => setNovoNome(event.target.value)}
                  onKeyDown={(event) => {
                    // O modal inteiro vive dentro de um <form>: sem o preventDefault,
                    // o Enter salvaria a tarefa-mãe em vez de criar a subtarefa.
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void criarSubtarefa();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      fecharNovaLinha();
                    }
                  }}
                  className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-7"
                  disabled={!novoNome.trim() || createSubtask.isPending}
                  onClick={() => void criarSubtarefa()}
                >
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={fecharNovaLinha}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={abrirNovaLinha}
                className="flex w-full items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar subtarefa
              </button>
            ))}

          {semProjeto && !disabled && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Defina o projeto da tarefa para criar subtarefas.
            </p>
          )}
        </div>
      )}
      <TaskCompletionHoursDialog
        task={conclusao.taskPendente}
        area={area}
        onClose={conclusao.fechar}
      />
    </section>
  );
}
