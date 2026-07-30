import type { UseFormReturn } from 'react-hook-form';
import { AlignLeft, Paperclip, Plus, UserCheck } from 'lucide-react';

import { OrgEntityAttachments } from '@/components/comentarios/OrgCommentAttachments';
import { TaskSubtasksSection } from '@/components/equipe/fiscal/tasks/task-modal/TaskSubtasksSection';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SectionHeading } from '@/components/ui/section-heading';
import { Textarea } from '@/components/ui/textarea';
import type { AreaKey } from '@/config/areaCategories';
import type { TaskFormValues } from '@/lib/orgTaskForm';

interface TaskEditBodyProps {
  form: UseFormReturn<TaskFormValues>;
  taskId: string;
  projectId?: string | null;
  clientId?: string | null;
  area: AreaKey;
  /** O usuário atual é o revisor delegado desta tarefa. */
  isReviewer: boolean;
  assignedToName?: string | null;
  /** Responsáveis possíveis nas subtarefas — membros do projeto da tarefa. */
  teamMembers: { id: string; name: string }[];
  /** Leva o foco para o compositor de comentários, onde o anexo é enviado. */
  onAddAttachment: () => void;
}

/** Corpo do modo edição: descrição, subtarefas e os anexos já enviados na conversa. */
export function TaskEditBody({
  form,
  taskId,
  projectId,
  clientId,
  area,
  isReviewer,
  assignedToName,
  teamMembers,
  onAddAttachment,
}: TaskEditBodyProps) {
  return (
    <div className="space-y-6 px-6 pb-6 pt-5">
      {isReviewer && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-purple-100 p-2 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-purple-950 dark:text-purple-100">
                Revisão delegada a você
              </p>
              <p className="mt-1 text-sm text-purple-800/80 dark:text-purple-200/80">
                Revise a tarefa de {assignedToName || 'responsável'} e escolha uma ação ao final.
              </p>
            </div>
          </div>
        </div>
      )}

      <section>
        <SectionHeading icon={<AlignLeft className="h-4 w-4 text-primary" />}>
          Descrição
        </SectionHeading>
        <fieldset disabled={isReviewer} className="contents">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="mt-3 space-y-0">
                <FormLabel className="sr-only">Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva a tarefa..."
                    rows={5}
                    className="resize-none rounded-xl bg-muted/20 leading-6 disabled:cursor-default disabled:opacity-100"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="pt-1.5" />
              </FormItem>
            )}
          />
        </fieldset>
      </section>

      <TaskSubtasksSection
        parentTask={{ id: taskId, project_id: projectId ?? null, client_id: clientId ?? null }}
        area={area}
        teamMembers={teamMembers}
        disabled={isReviewer}
      />

      <section>
        <SectionHeading
          icon={<Paperclip className="h-4 w-4 text-primary" />}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={onAddAttachment}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          }
        >
          Anexos
        </SectionHeading>
        <OrgEntityAttachments
          entityId={taskId}
          projectId={projectId}
          area={area}
          className="mt-3"
        />
      </section>
    </div>
  );
}
