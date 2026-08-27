// Campos do modal de tarefa da sprint (criar/editar), organizados em seções.
// A descrição tem modo "tela cheia": quem controla o estado é o modal, porque
// ele precisa crescer junto para o campo ocupar a altura toda.
import { CalendarClock, Link2, Maximize2, Minimize2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvisoHorasDigitadas } from '@/components/equipe/AvisoHorasDigitadas';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import { avaliarHorasApontadas } from '@/lib/horasApontamento';
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

// Rótulo de seção com o traço do accent da área (teal): é o que dá cor ao
// formulário sem mexer no fundo dos cartões.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
      <span className="h-[3px] w-5 shrink-0 rounded-full bg-teal-600" aria-hidden />
      {children}
    </h3>
  );
}

// Aba ativa marcada no accent: texto, ícone e um contorno fino em teal.
const tabTriggerClass =
  'data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-accent/25';

/** Status com cor semântica: leitura rápida de andamento dentro do formulário. */
const statusOptions = [
  { value: 'pending', label: 'Pendente', dot: 'bg-amber-400' },
  { value: 'in_progress', label: 'Em Progresso', dot: 'bg-sky-500' },
  { value: 'completed', label: 'Concluído', dot: 'bg-emerald-500' },
];

function StatusOption({ label, dot }: { label: string; dot: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  );
}

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-teal-600/35 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700/70">
        {title}
      </h3>
      {children}
    </section>
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
    <div className={cn('space-y-3', descriptionExpanded && 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex items-center justify-between gap-2">
        {/* Sem htmlFor: o editor rico não é um <textarea>, o rótulo vai por aria-label. */}
        <div>
          <Label className="text-sm font-semibold">Descrição</Label>
          {!descriptionExpanded && (
            <p className="text-xs text-muted-foreground">
              Detalhe o objetivo, critérios de aceite e contexto da entrega.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-teal-700"
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
        // Sombra suave e tonal: destaca o campo de descrição dentro do cartão.
        className="shadow-md shadow-teal-700/15"
        fillHeight={descriptionExpanded}
        minHeight={descriptionExpanded ? 'min-h-[360px]' : 'min-h-[280px]'}
        maxHeight={descriptionExpanded ? undefined : 'max-h-[420px]'}
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
    <div className="grid shrink-0 gap-5 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
      <section className="rounded-3xl border border-teal-600/20 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>
              {prefix === 'create' ? 'Nova tarefa' : 'Conteúdo da tarefa'}
            </SectionLabel>
            {prefix === 'create' && (
              <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-700">
                Título obrigatório
              </span>
            )}
          </div>
          <div className="flex min-w-0 items-baseline gap-2 text-[1.15rem] font-semibold tracking-tight">
            {form.task_code && <span className="shrink-0 text-teal-700">[{form.task_code}]</span>}
            <Input
              id={`${prefix}-title`}
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Dê um título claro para a entrega"
              className="h-auto min-w-0 border-0 bg-transparent px-0 py-1 text-[1.15rem] font-semibold leading-tight tracking-tight shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-[1.15rem]"
            />
          </div>
          <Label htmlFor={`${prefix}-title`} className="sr-only">
            Título
            {prefix === 'create' && <RequiredMark />}
          </Label>
        </div>
        {description}
      </section>

      {/* Painel de propriedades tingido: junto com a faixa do cabeçalho, é o
          segundo bloco de cor do modal e separa planejamento de conteúdo. */}
      <aside className="rounded-3xl border border-accent/30 bg-accent/10 p-4 shadow-sm sm:p-5">
        <Tabs defaultValue="planning">
          <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-accent/20 p-1">
            <TabsTrigger
              value="planning"
              className={cn(tabTriggerClass, 'h-9 gap-2 rounded-lg text-xs')}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Planejamento
            </TabsTrigger>
            <TabsTrigger
              value="context"
              className={cn(tabTriggerClass, 'h-9 gap-2 rounded-lg text-xs')}
            >
              <Link2 className="h-3.5 w-3.5" />
              Vínculos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="mt-0 space-y-5">
            <div>
              <SectionLabel>Como a tarefa será executada</SectionLabel>
              <p className="mt-1 text-xs text-muted-foreground">
                Defina responsável, esforço e prazo da entrega.
              </p>
            </div>

            <PropertySection title="Execução">
              <div className={cn('grid gap-3', prefix === 'edit' && 'grid-cols-2')}>
                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-assigned`} className="text-xs">
                    Responsável
                  </Label>
                  <Select
                    value={form.assigned_to || 'unassigned'}
                    onValueChange={(value) =>
                      update('assigned_to', value === 'unassigned' ? '' : value)
                    }
                  >
                    <SelectTrigger id={`${prefix}-assigned`} className="h-9">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-status" className="text-xs">
                      Status
                    </Label>
                    <Select value={form.status} onValueChange={(value) => update('status', value)}>
                      <SelectTrigger id="edit-status" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <StatusOption label={option.label} dot={option.dot} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PropertySection>

            <PropertySection title="Estimativa e prazo">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-start`} className="text-xs">
                    Início
                  </Label>
                  <Input
                    id={`${prefix}-start`}
                    type="date"
                    value={form.start_date}
                    onChange={(event) => update('start_date', event.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-due`} className="text-xs">
                    Entrega
                    {prefix === 'create' && <RequiredMark />}
                  </Label>
                  <Input
                    id={`${prefix}-due`}
                    type="date"
                    value={form.due_date}
                    onChange={(event) => update('due_date', event.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-hours`} className="text-xs">
                    Horas Estimadas
                  </Label>
                  <Input
                    id={`${prefix}-hours`}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    value={form.estimated_hours}
                    onChange={(event) => update('estimated_hours', event.target.value)}
                    className="h-9"
                  />
                </div>

                {prefix === 'edit' && form.status === 'completed' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-actual-hours" className="text-xs text-amber-700">
                      Horas realizadas
                    </Label>
                    <Input
                      id="edit-actual-hours"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={form.actual_hours}
                      onChange={(event) => update('actual_hours', event.target.value)}
                      className="h-9 border-warning/50"
                    />
                    <AvisoHorasDigitadas
                      aviso={avaliarHorasApontadas({
                        realizadas: form.actual_hours,
                        estimadas: form.estimated_hours,
                      })}
                      onUsarSugestao={(horas) => update('actual_hours', String(horas))}
                    />
                  </div>
                )}
              </div>
            </PropertySection>
          </TabsContent>

          <TabsContent value="context" className="mt-0 space-y-5">
            <div>
              <SectionLabel>Onde a tarefa se encaixa</SectionLabel>
              <p className="mt-1 text-xs text-muted-foreground">
                Relacione a entrega sem sobrecarregar seu planejamento.
              </p>
            </div>

            <PropertySection title="Contexto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-project`} className="text-xs">
                    Projeto
                  </Label>
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
                    <SelectTrigger id={`${prefix}-project`} className="h-9">
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

                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-process`} className="text-xs">
                    Processo
                  </Label>
                  <Select
                    value={form.process_id || 'none'}
                    onValueChange={(value) => update('process_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger id={`${prefix}-process`} className="h-9">
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
              </div>
            </PropertySection>

            <PropertySection title="Organização na sprint">
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${prefix}-parent`} className="text-xs">
                    Tarefa principal
                  </Label>
                  <Select
                    value={form.parent_id || 'none'}
                    onValueChange={(value) =>
                      setForm((current) =>
                        c.selectParent(current, value === 'none' ? '' : value, prefix === 'edit'),
                      )
                    }
                  >
                    <SelectTrigger id={`${prefix}-parent`} className="h-9">
                      <SelectValue placeholder="Tarefa principal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma, é uma tarefa principal</SelectItem>
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
                  <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}-task-code`} className="text-xs">
                      Ordem
                    </Label>
                    <Input
                      id={`${prefix}-task-code`}
                      value={form.task_code}
                      onChange={(event) => update('task_code', event.target.value)}
                      placeholder="1.2"
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            </PropertySection>
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
