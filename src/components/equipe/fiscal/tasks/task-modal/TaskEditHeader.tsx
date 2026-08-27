import { useEffect, useState, type ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { CheckCircle2, ChevronDown, Receipt, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ModalTopBar } from '@/components/ui/modal-top-bar';
import { TaskContextSelect } from '@/components/equipe/fiscal/tasks/task-modal/TaskContextSelect';
import type { TaskFieldOptions, TaskFormValues } from '@/lib/orgTaskForm';
import { cn } from '@/lib/utils';

interface TaskEditHeaderProps {
  form: UseFormReturn<TaskFormValues>;
  options: TaskFieldOptions;
  /** Botões de ação (salvar / revisão), renderizados na barra do topo. */
  actions: ReactNode;
  /** Revisor delegado só lê os campos da tarefa. */
  disabled?: boolean;
}

/**
 * Cabeçalho do modo edição: o título é o próprio campo, e o contexto da tarefa
 * (cliente, projeto e tarefa-pai) aparece como texto.
 *
 * Trocar o contexto de uma tarefa que já existe é raro, então os selects ficam
 * atrás de "Alterar contexto" — e abrem sozinhos quando algum desses campos
 * reprova na validação, senão a mensagem de erro ficaria escondida.
 * O contribuinte é opcional e pertence à tarefa, então permanece sempre editável.
 */
export function TaskEditHeader({ form, options, actions, disabled }: TaskEditHeaderProps) {
  const { clients, projects, contribuintes, parentTasks } = options;
  const [contextOpen, setContextOpen] = useState(false);

  const clientId = form.watch('client_id');
  const projectId = form.watch('project_id');
  const parentTaskId = form.watch('parent_task_id');

  const { errors } = form.formState;
  const hasContextError = !!errors.client_id || !!errors.project_id;
  useEffect(() => {
    if (hasContextError) setContextOpen(true);
  }, [hasContextError]);

  return (
    <div className="px-6">
      <ModalTopBar
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        title="Editar Tarefa"
        description="Formulário de tarefa fiscal"
        actions={actions}
      />

      <fieldset disabled={disabled} className="contents">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="mt-4 space-y-0">
              <FormLabel className="sr-only">Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Título da tarefa"
                  // `md:text-[1.6rem]` é obrigatório: o Input traz `md:text-sm`
                  // na base e a media query venceria o tamanho sem variante.
                  className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[1.6rem] font-semibold leading-tight tracking-tight shadow-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100 md:text-[1.6rem]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="pt-1" />
            </FormItem>
          )}
        />

        <Collapsible open={contextOpen} onOpenChange={setContextOpen} className="mt-3 pb-4">
          <dl className="space-y-1">
            <ContextRow
              label="Cliente"
              value={clients.find((client) => client.id === clientId)?.nome}
            />
            <ContextRow
              label="Projeto"
              value={projects.find((project) => project.id === projectId)?.name}
            />
            {parentTaskId && (
              <ContextRow
                label="Subtarefa de"
                value={parentTasks.find((parent) => parent.id === parentTaskId)?.title}
              />
            )}
          </dl>

          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'mt-2 h-7 gap-1.5 px-2 text-xs text-muted-foreground',
                hasContextError && 'text-destructive hover:text-destructive',
              )}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Alterar contexto
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', contextOpen && 'rotate-180')}
              />
            </Button>
          </CollapsibleTrigger>

          {/* O `display` das classes fica no filho: aplicado no próprio
              CollapsibleContent, venceria o `hidden` do estado fechado. */}
          <CollapsibleContent>
            <div className="mt-3 grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <TaskContextSelect
                form={form}
                name="client_id"
                label="Cliente"
                placeholder="Selecione"
                emptyValue={undefined}
                options={clients.map((client) => ({ value: client.id, label: client.nome }))}
              />
              <TaskContextSelect
                form={form}
                name="project_id"
                label="Projeto"
                placeholder="Selecione"
                emptyValue=""
                options={projects.map((project) => ({ value: project.id, label: project.name }))}
              />
              <TaskContextSelect
                form={form}
                name="parent_task_id"
                label="Tarefa Pai (subtarefa de)"
                placeholder="Nenhuma (tarefa principal)"
                emptyValue={undefined}
                emptyLabel="Nenhuma"
                options={parentTasks.map((parent) => ({ value: parent.id, label: parent.title }))}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mb-4 w-full max-w-sm rounded-lg border bg-muted/20 px-3 py-2.5">
          <TaskContextSelect
            form={form}
            name="contribuinte_id"
            label="Contribuinte (opcional)"
            icon={<Receipt className="h-3.5 w-3.5" />}
            placeholder={clientId ? 'Selecione o contribuinte' : 'Selecione um cliente primeiro'}
            emptyValue={undefined}
            emptyLabel="Não informado"
            disabled={!clientId}
            options={contribuintes.map((item) => ({
              value: item.id,
              label: item.cpf_cnpj
                ? `${item.nome_razao_social} (${item.cpf_cnpj})`
                : item.nome_razao_social,
            }))}
          />
        </div>
      </fieldset>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex min-w-0 gap-2 text-sm">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80 leading-5">
        {label}
      </dt>
      <dd className={cn('min-w-0 flex-1 truncate', value ? 'text-foreground/90' : 'text-warning')}>
        {value || 'Não informado'}
      </dd>
    </div>
  );
}
