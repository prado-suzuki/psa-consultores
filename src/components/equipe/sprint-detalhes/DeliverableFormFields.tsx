// Campos do modal de tarefa da sprint (criar/editar), organizados em seções.
// A descrição tem modo "tela cheia": quem controla o estado é o modal, porque
// ele precisa crescer junto para o campo ocupar a altura toda.
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { cn } from '@/lib/utils';
import type {
  DeliverableForm,
  EquipeSprintDetalhesController,
} from '@/hooks/useEquipeSprintDetalhesController';

interface DeliverableFormFieldsProps {
  prefix: 'edit' | 'create';
  form: DeliverableForm;
  setForm: React.Dispatch<React.SetStateAction<DeliverableForm>>;
  controller: EquipeSprintDetalhesController;
  editingId?: string;
  descriptionExpanded: boolean;
  onToggleDescription: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export function DeliverableFormFields({
  prefix,
  form,
  setForm,
  controller: c,
  editingId,
  descriptionExpanded,
  onToggleDescription,
}: DeliverableFormFieldsProps) {
  const update = (field: keyof DeliverableForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const linkedProcesses = c.processes.filter(
    (process) =>
      !form.project_id ||
      process.project_id === form.project_id ||
      c.projectProcesses.some(
        (link) => link.process_id === process.id && link.project_id === form.project_id,
      ),
  );

  const description = (
    <div className={cn('space-y-2', descriptionExpanded && 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex items-center justify-between gap-2">
        {/* Sem htmlFor: o editor rico não é um <textarea>, o rótulo vai por aria-label. */}
        <Label>Descrição</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          onClick={onToggleDescription}
        >
          {descriptionExpanded ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              Reduzir
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              Expandir
            </>
          )}
        </Button>
      </div>
      <TarefaRichTextEditor
        value={form.description}
        onChange={(next) => update('description', next)}
        ariaLabel="Descrição"
        fillHeight={descriptionExpanded}
        minHeight="min-h-[120px]"
        maxHeight="max-h-[240px]"
      />
    </div>
  );

  if (descriptionExpanded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <p className="truncate text-sm font-medium text-foreground">
          {form.title || 'Tarefa sem título'}
        </p>
        {description}
        <p className="text-xs text-muted-foreground">
          Pressione Esc ou clique em “Reduzir” para voltar aos demais campos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-title`}>
            Título
            {prefix === 'create' && <RequiredMark />}
          </Label>
          <Input
            id={`${prefix}-title`}
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="O que precisa ser entregue"
            className="h-10"
          />
        </div>
        {description}
      </section>

      <section className="space-y-3">
        <SectionLabel>Atribuição e prazos</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-assigned`}>Responsável</Label>
            <Select
              value={form.assigned_to || 'unassigned'}
              onValueChange={(value) => update('assigned_to', value === 'unassigned' ? '' : value)}
            >
              <SelectTrigger id={`${prefix}-assigned`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {c.profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.first_name} {profile.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {prefix === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={form.status} onValueChange={(value) => update('status', value)}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-hours`}>Horas Estimadas</Label>
            <Input
              id={`${prefix}-hours`}
              type="number"
              step="0.5"
              min="0"
              placeholder="0"
              value={form.estimated_hours}
              onChange={(event) => update('estimated_hours', event.target.value)}
            />
          </div>

          {/* Célula vazia só na criação, para as duas datas caírem juntas na linha de baixo. */}
          {prefix === 'create' && <div className="hidden sm:block" aria-hidden />}

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-start`}>Data Início</Label>
            <Input
              id={`${prefix}-start`}
              type="date"
              value={form.start_date}
              onChange={(event) => update('start_date', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-due`}>
              Data Entrega
              {prefix === 'create' && <RequiredMark />}
            </Label>
            <Input
              id={`${prefix}-due`}
              type="date"
              value={form.due_date}
              onChange={(event) => update('due_date', event.target.value)}
            />
          </div>

          {prefix === 'edit' && form.status === 'completed' && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 sm:col-span-3">
              <Label htmlFor="edit-actual-hours" className="font-medium text-amber-800">
                Horas Realizadas
              </Label>
              <Input
                id="edit-actual-hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={form.actual_hours}
                onChange={(event) => update('actual_hours', event.target.value)}
                className="border-amber-300 bg-white sm:max-w-[12rem]"
              />
              <p className="text-xs text-amber-700">
                Usado nas análises da sprint (estimadas × realizadas).
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Vínculos</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-project`}>Projeto</Label>
            <Select
              value={form.project_id || 'none'}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  project_id: value === 'none' ? '' : value,
                  process_id: value === 'none' ? current.process_id : '',
                }))
              }
            >
              <SelectTrigger id={`${prefix}-project`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {c.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-process`}>Processo</Label>
            <Select
              value={form.process_id || 'none'}
              onValueChange={(value) => update('process_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger id={`${prefix}-process`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {linkedProcesses.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}-parent`}>Tarefa Pai</Label>
            <Select
              value={form.parent_id || 'none'}
              onValueChange={(value) =>
                setForm((current) =>
                  c.selectParent(current, value === 'none' ? '' : value, prefix === 'edit'),
                )
              }
            >
              <SelectTrigger id={`${prefix}-parent`}>
                <SelectValue placeholder="Nenhuma (tarefa principal)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (tarefa principal)</SelectItem>
                {c.parentTaskOptions
                  .filter((item) => item.id !== editingId)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.task_code && `${item.task_code} - `}
                      {item.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {(prefix === 'create' || form.parent_id) && (
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-task-code`}>ID / Ordem</Label>
              <Input
                id={`${prefix}-task-code`}
                value={form.task_code}
                onChange={(event) => update('task_code', event.target.value)}
              />
              {form.parent_id && (
                <p className="text-xs text-muted-foreground">
                  Alterar reordena automaticamente as demais subtarefas
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
