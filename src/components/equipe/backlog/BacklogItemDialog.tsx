// Modal de criar/editar item do backlog, no mesmo casco do "Nova Tarefa" da
// sprint. Os campos são os que `sprint_backlog_items` tem: responsável, datas e
// processo não existem aqui, são escolhidos ao mover o item para uma sprint.
import { useState } from 'react';
import { ClipboardList, Gauge, Link2, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DescricaoDaTarefa,
  DescricaoExpandida,
  PropertySection,
  SectionLabel,
  TitleSeal,
} from '@/components/equipe/sprint-detalhes/tarefaModalVisual';
import {
  tarefaModalBodyClass,
  tarefaModalContentClass,
  tarefaModalFooterClass,
  tarefaModalHeaderClass,
  tarefaModalTabTriggerClass,
} from '@/components/equipe/sprint-detalhes/tarefaModalClasses';
import type { BacklogItemForm } from '@/lib/backlogItemForm';
import { AnexosEntregavel } from '@/components/equipe/AnexosEntregavel';
import type { BacklogCluster, Project } from '@/hooks/useDomainBacklog';
import { cn } from '@/lib/utils';

const NONE = '__none__';

interface BacklogItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  /** Id do item em edição: sem ele (criação) o bloco de anexos não aparece. */
  itemId?: string;
  form: BacklogItemForm;
  setForm: React.Dispatch<React.SetStateAction<BacklogItemForm>>;
  clusters: BacklogCluster[];
  projects: Project[];
  saving: boolean;
  onSave: () => void;
}

export function BacklogItemDialog({
  open,
  onOpenChange,
  editing,
  itemId,
  form,
  setForm,
  clusters,
  projects,
  saving,
  onSave,
}: BacklogItemDialogProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const update = (field: keyof BacklogItemForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const changeCluster = (value: string) =>
    setForm((current) => {
      const cluster_id = value === NONE ? '' : value;
      // Limpa projeto se o cluster do projeto atual não bate mais.
      const project = projects.find((p) => p.id === current.project_id);
      const keepProject = !cluster_id || (project && project.cluster_id === cluster_id);
      return { ...current, cluster_id, project_id: keepProject ? current.project_id : '' };
    });

  const description = (
    <DescricaoDaTarefa
      value={form.description}
      onChange={(next) => update('description', next)}
      expanded={descriptionExpanded}
      onToggle={() => setDescriptionExpanded((current) => !current)}
    />
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDescriptionExpanded(false);
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={tarefaModalContentClass(descriptionExpanded)}
        onEscapeKeyDown={(event) => {
          if (descriptionExpanded) {
            event.preventDefault();
            setDescriptionExpanded(false);
          }
        }}
      >
        <DialogHeader className={tarefaModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <TitleSeal icon={editing ? ClipboardList : ListPlus} />
            <DialogTitle className="text-xl tracking-tight">
              {editing ? 'Editar Tarefa do Backlog' : 'Nova Tarefa'}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">Formulário de item do backlog</DialogDescription>
        </DialogHeader>

        <div className={tarefaModalBodyClass}>
          {descriptionExpanded ? (
            <DescricaoExpandida title={form.title}>{description}</DescricaoExpandida>
          ) : (
            <div className="grid shrink-0 gap-5 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
              <section className="rounded-3xl border border-primary/20 bg-superficie-cartao p-4 shadow-sm sm:p-5">
                <div className="mb-5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <SectionLabel>{editing ? 'Conteúdo da tarefa' : 'Nova tarefa'}</SectionLabel>
                    {!editing && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Título obrigatório
                      </span>
                    )}
                  </div>
                  <Input
                    id="backlog-title"
                    value={form.title}
                    onChange={(event) => update('title', event.target.value)}
                    placeholder="Dê um título claro para a entrega"
                    className="h-auto min-w-0 border-0 bg-transparent px-0 py-1 text-[1.15rem] font-semibold leading-tight tracking-tight shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-[1.15rem]"
                  />
                  <Label htmlFor="backlog-title" className="sr-only">
                    Título
                    <RequiredMark />
                  </Label>
                </div>
                {description}
              </section>

              <aside className="rounded-3xl border border-accent/30 bg-accent/10 p-4 shadow-sm sm:p-5">
                <Tabs defaultValue="planning">
                  <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-accent/20 p-1">
                    <TabsTrigger
                      value="planning"
                      className={cn(tarefaModalTabTriggerClass, 'h-9 gap-2 rounded-lg text-xs')}
                    >
                      <Gauge className="h-3.5 w-3.5" />
                      Planejamento
                    </TabsTrigger>
                    <TabsTrigger
                      value="context"
                      className={cn(tarefaModalTabTriggerClass, 'h-9 gap-2 rounded-lg text-xs')}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Vínculos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="planning" className="mt-0 space-y-5">
                    <div>
                      <SectionLabel>Como a tarefa entra na fila</SectionLabel>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Responsável e prazo são definidos ao mover para uma sprint.
                      </p>
                    </div>

                    <PropertySection title="Prioridade e esforço">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="backlog-priority" className="text-xs">
                            Prioridade
                          </Label>
                          <Select value={form.priority} onValueChange={(value) => update('priority', value)}>
                            <SelectTrigger id="backlog-priority" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="backlog-hours" className="text-xs">
                            Horas Estimadas
                          </Label>
                          <Input
                            id="backlog-hours"
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="0"
                            value={form.estimated_hours}
                            onChange={(event) => update('estimated_hours', event.target.value)}
                            className="h-9"
                          />
                        </div>
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
                          <Label htmlFor="backlog-cluster" className="text-xs">
                            Cluster
                          </Label>
                          <Select value={form.cluster_id || NONE} onValueChange={changeCluster}>
                            <SelectTrigger id="backlog-cluster" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Nenhum</SelectItem>
                              {clusters.map((cluster) => (
                                <SelectItem key={cluster.id} value={cluster.id}>
                                  {cluster.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="backlog-project" className="text-xs">
                            Projeto
                          </Label>
                          <Select
                            value={form.project_id || NONE}
                            onValueChange={(value) => update('project_id', value === NONE ? '' : value)}
                          >
                            <SelectTrigger id="backlog-project" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Nenhum</SelectItem>
                              {projects
                                .filter((p) => !form.cluster_id || p.cluster_id === form.cluster_id)
                                .map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PropertySection>
                  </TabsContent>
                </Tabs>
              </aside>
            </div>
          )}
          {!descriptionExpanded && <AnexosEntregavel backlogItemId={itemId} ativo={open} />}
        </div>

        <DialogFooter className={tarefaModalFooterClass}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
