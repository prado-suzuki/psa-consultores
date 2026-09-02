import type { UseFormReturn } from 'react-hook-form';
import { AlignLeft, Building2, CheckCircle2, FolderKanban, GitBranch, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ModalTopBar } from '@/components/ui/modal-top-bar';
import { RequiredMark } from '@/components/ui/required-mark';
import { SectionHeading } from '@/components/ui/section-heading';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { TaskContextSelect } from '@/components/equipe/fiscal/tasks/task-modal/TaskContextSelect';
import { TaskPropertyBar } from '@/components/equipe/fiscal/tasks/task-modal/TaskPropertyBar';
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
 * Formulário de criação com a mesma anatomia da edição: título em corpo grande,
 * cartão de contexto (cliente, projeto, tarefa-pai), contribuinte opcional, faixa de
 * propriedades em pílulas e, por último, a descrição.
 *
 * A diferença é que aqui o contexto nasce vazio, então os selects aparecem
 * abertos — não faz sentido esconder atrás de "Alterar contexto" o que ainda
 * precisa ser escolhido. As ações vivem na barra do topo, como na edição.
 */
export function TaskCreateFields({
  form,
  options,
  onAssigneeChange,
  showDraftNotice,
  isSaving,
  onCancel,
}: TaskCreateFieldsProps) {
  const { clients, projects, contribuintes, parentTasks } = options;
  const clientId = form.watch('client_id');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-6">
        <ModalTopBar
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title="Nova Tarefa"
          description="Formulário de tarefa fiscal"
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                Criar
              </Button>
            </>
          }
        />

        {showDraftNotice && (
          <p className="mt-3 animate-pulse text-xs text-warning">
            Rascunho restaurado — clique em Salvar para confirmar.
          </p>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="mt-3 space-y-0">
              <FormLabel className="sr-only">Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Título da tarefa"
                  // `md:text-[1.6rem]` é obrigatório: o Input traz `md:text-sm`
                  // na base e a media query venceria o tamanho sem variante.
                  className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[1.6rem] font-semibold leading-tight tracking-tight shadow-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[1.6rem]"
                  {...field}
                />
              </FormControl>
              <FormMessage className="pt-1" />
            </FormItem>
          )}
        />

        {/* O contexto vem da OS/projeto; na criação ele fica aberto para seleção. */}
        <div className="mt-3 grid gap-4 rounded-xl border bg-muted/30 px-4 py-3.5 sm:grid-cols-2">
          <TaskContextSelect
            form={form}
            name="project_id"
            label="Projeto"
            icon={<FolderKanban className="h-3.5 w-3.5" />}
            required
            placeholder="Selecione"
            emptyValue=""
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
          />
          <TaskContextSelect
            form={form}
            name="client_id"
            label="Cliente"
            icon={<Building2 className="h-3.5 w-3.5" />}
            required
            placeholder="Selecione"
            emptyValue={undefined}
            options={clients.map((client) => ({ value: client.id, label: client.nome }))}
          />
          <TaskContextSelect
            form={form}
            name="parent_task_id"
            label="Tarefa Pai (subtarefa de)"
            icon={<GitBranch className="h-3.5 w-3.5" />}
            placeholder="Nenhuma (tarefa principal)"
            emptyValue={undefined}
            emptyLabel="Nenhuma"
            options={parentTasks.map((parent) => ({ value: parent.id, label: parent.title }))}
          />
        </div>

        <div className="mt-3 w-full max-w-sm rounded-lg border bg-muted/20 px-3 py-2.5">
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
      </div>

      <div className="mt-4">
        <TaskPropertyBar form={form} options={options} onAssigneeChange={onAssigneeChange} />
      </div>

      <section className="px-6 pb-5 pt-4">
        {/* A Descrição sempre foi obrigatória no `taskSchema`, mas era a única
            sem a marca: quem olhava a tela via asterisco só em Projeto e Cliente
            e não tinha como saber que faltava preencher aqui. */}
        <SectionHeading icon={<AlignLeft className="h-4 w-4 text-primary" />}>
          Descrição <RequiredMark />
        </SectionHeading>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="mt-2 space-y-0">
              <FormLabel className="sr-only">Descrição</FormLabel>
              <FormControl>
                {/* Mesmo editor da edição: o que for escrito aqui tem que abrir
                    formatado depois, e o rich text de chamado delegado também. */}
                <TarefaRichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel="Descrição"
                  withCode={false}
                  placeholder="Descreva a tarefa..."
                  minHeight="min-h-[104px]"
                  maxHeight="max-h-[280px]"
                  className="rounded-xl bg-muted/20"
                />
              </FormControl>
              <FormMessage className="pt-1.5" />
            </FormItem>
          )}
        />
      </section>
    </div>
  );
}
