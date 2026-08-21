import type { UseFormReturn } from 'react-hook-form';
import { AlignLeft, Paperclip, Plus, UserCheck } from 'lucide-react';

import { OrgEntityAttachments } from '@/components/comentarios/OrgCommentAttachments';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { TaskSubtasksSection } from '@/components/equipe/fiscal/tasks/task-modal/TaskSubtasksSection';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SectionHeading } from '@/components/ui/section-heading';
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
      {/* Aviso de revisão delegada: papel `revisao` da área (index.css). */}
      {isReviewer && (
        <div className="rounded-xl border border-status-revisao/25 bg-status-revisao-soft/50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-status-revisao-soft p-2 text-status-revisao">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-status-revisao">
                Revisão delegada a você
              </p>
              <p className="mt-1 text-sm text-status-revisao/80">
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
                  {/* Mesmo editor da descrição de entregável. Tarefa aberta por
                      chamado delegado nasce com o rich text do chamado copiado
                      pelo trigger: num textarea ela mostraria o JSON cru. */}
                  <TarefaRichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    ariaLabel="Descrição"
                    placeholder="Descreva a tarefa..."
                    disabled={isReviewer}
                    withCode={false}
                    minHeight="min-h-[132px]"
                    maxHeight="max-h-[360px]"
                    // opacity-100 mantém o campo legível para o revisor, que o vê
                    // desabilitado: era o que o `disabled:opacity-100` do textarea fazia.
                    className="rounded-xl bg-muted/20 opacity-100"
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
