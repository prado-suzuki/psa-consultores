import type { UseFormReturn } from 'react-hook-form';

import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskContextFields } from '@/components/equipe/fiscal/tasks/task-modal/TaskContextFields';
import { TaskDetailsFields } from '@/components/equipe/fiscal/tasks/task-modal/TaskDetailsFields';
import { TaskExecutionFields } from '@/components/equipe/fiscal/tasks/task-modal/TaskExecutionFields';
import { TaskModalFooter } from '@/components/equipe/fiscal/tasks/task-modal/TaskModalFooter';
import type { TaskFieldOptions, TaskFormValues } from '@/lib/orgTaskForm';

interface TaskCreateFieldsProps {
  form: UseFormReturn<TaskFormValues>;
  options: TaskFieldOptions;
  onAssigneeChange: (userId: string) => void;
  showDraftNotice: boolean;
  isSaving: boolean;
  onCancel: () => void;
}

/**
 * Formulário de criação: coluna única, campos empilhados por seção
 * (contexto → tarefa → execução). Sem cabeçalho de contexto nem faixa de
 * propriedades, que só fazem sentido quando cliente e projeto já existem.
 */
export function TaskCreateFields({
  form,
  options,
  onAssigneeChange,
  showDraftNotice,
  isSaving,
  onCancel,
}: TaskCreateFieldsProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
      <DialogHeader className="border-b pb-4">
        <DialogTitle>Nova Tarefa</DialogTitle>
        <DialogDescription className="sr-only">Formulário de tarefa fiscal</DialogDescription>
        {showDraftNotice && (
          <p className="mt-1 animate-pulse text-xs text-warning">
            Rascunho restaurado — clique em Salvar para confirmar.
          </p>
        )}
      </DialogHeader>

      <div className="space-y-6 pt-5">
        <TaskContextFields
          form={form}
          clients={options.clients}
          projects={options.projects}
          contribuintes={options.contribuintes}
        />
        <TaskDetailsFields form={form} parentTasks={options.parentTasks} />
        <TaskExecutionFields
          form={form}
          teamMembers={options.teamMembers}
          statusOptions={options.statusOptions}
          onAssigneeChange={onAssigneeChange}
        />
        <TaskModalFooter isSaving={isSaving} onCancel={onCancel} />
      </div>
    </div>
  );
}
