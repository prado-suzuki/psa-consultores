import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock, Copy, FolderOpen, ListChecks, Send, SlidersHorizontal, Target, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DailySprintTask } from '@/hooks/useDailySprintTasks';
import type { Process, Project, Sprint, TeamMember } from '@/hooks/useDomainEquipeDaily';
import { describeDailyMember, groupDailyTasksByParent, type DailyFormDraft } from '@/lib/equipeDaily';

interface DailyFormCardProps {
  authenticatedUserId?: string;
  selectedUserId: string;
  onSelectedUserIdChange: (userId: string) => void;
  teamMembers: TeamMember[];
  sprints: Sprint[];
  projects: Project[];
  processes: Process[];
  sprintTasks: DailySprintTask[];
  form: DailyFormDraft;
  onFormChange: (form: DailyFormDraft) => void;
  registered: boolean;
  submitting: boolean;
  copyingYesterday: boolean;
  onSubmit: (event: FormEvent) => void;
  onCopyFromYesterday: () => void;
  onOpenQuickUpdate: () => void;
}

export function DailyFormCard({
  authenticatedUserId,
  selectedUserId,
  onSelectedUserIdChange,
  teamMembers,
  sprints,
  projects,
  processes,
  sprintTasks,
  form,
  onFormChange,
  registered,
  submitting,
  copyingYesterday,
  onSubmit,
  onCopyFromYesterday,
  onOpenQuickUpdate,
}: DailyFormCardProps) {
  // Contexto (quem/sprint/projeto/processo) fica recolhido: vem preenchido pelo usuário
  // logado + sprint ativa, e só abre quando a pessoa realmente quer trocar algo.
  const [contextOpen, setContextOpen] = useState(false);

  // Tarefas agrupadas por mãe para o dropdown de bloqueio.
  const blockerGroups = groupDailyTasksByParent(sprintTasks);

  const isSelf = Boolean(selectedUserId) && selectedUserId === authenticatedUserId;
  const memberLabel = describeDailyMember(teamMembers, selectedUserId, authenticatedUserId);
  const selectedSprint = sprints.find((sprint) => sprint.id === form.sprint_id);
  const sprintLabel = selectedSprint?.name;
  const projectLabel = projects.find((project) => project.id === form.project_id)?.name;
  const processLabel = processes.find((process) => process.id === form.process_id)?.name;

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Clock className="h-5 w-5 text-gray-500" />
          Daily (15 min)
          {registered && <Badge className="ml-2 bg-green-100 text-green-700">Registrado</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-3 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className={isSelf ? 'text-gray-700' : 'font-medium text-amber-700'}>
                  {memberLabel || 'Sem membro selecionado'}
                </span>
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                <span className={sprintLabel ? 'text-gray-700' : 'text-gray-400'}>{sprintLabel || 'Sem sprint'}</span>
              </span>
              {projectLabel && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5" />{projectLabel}</span>
                </>
              )}
              {processLabel && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />{processLabel}</span>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setContextOpen((open) => !open)}
                className="ml-auto h-7 px-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-expanded={contextOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                Ajustar contexto
                {contextOpen ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>

            {!isSelf && selectedUserId && (
              <p className="text-xs text-amber-700">Você está registrando a daily de outra pessoa.</p>
            )}

            {contextOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                <ContextField label="Membro da equipe">
                  <Select value={selectedUserId} onValueChange={onSelectedUserIdChange}>
                    <SelectTrigger className="h-9 bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione o membro" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}{member.id === authenticatedUserId && ' (você)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ContextField>
                <ContextField label="Sprint" hint={selectedSprint?.status === 'active' ? '(ativa)' : undefined}>
                  <Select value={form.sprint_id} onValueChange={(sprint_id) => onFormChange({ ...form, sprint_id })}>
                    <SelectTrigger className="h-9 bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione a sprint" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {sprints.map((sprint) => <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ContextField>
                <ContextField label="Projeto" hint="(opcional)">
                  <Select
                    value={form.project_id}
                    onValueChange={(value) => onFormChange({ ...form, project_id: value === '__none__' ? '' : value, process_id: '' })}
                  >
                    <SelectTrigger className="h-9 bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ContextField>
                <ContextField
                  label="Processo"
                  hint={form.project_id ? '(do projeto)' : '(opcional)'}
                >
                  <Select value={form.process_id} onValueChange={(value) => onFormChange({ ...form, process_id: value === '__none__' ? '' : value })}>
                    <SelectTrigger className="h-9 bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione um processo" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {processes.map((process) => <SelectItem key={process.id} value={process.id}>{process.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ContextField>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-gray-700 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gray-500" />O que fiz ontem?</Label>
              <Button type="button" variant="outline" size="sm" onClick={onCopyFromYesterday} disabled={copyingYesterday} className="h-8">
                <Copy className="h-3.5 w-3.5 mr-1.5" />{copyingYesterday ? 'Buscando...' : 'Trazer plano de ontem'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sprintTasks.length > 0 && <DailyTaskPicker tasks={sprintTasks} onPick={insertTask('did_yesterday')} />}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenQuickUpdate}
                className="group h-8 border-teal-300 bg-teal-50 text-teal-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-100 hover:text-teal-800 hover:shadow-md"
              >
                <span className="relative mr-1.5 flex h-3.5 w-3.5 items-center justify-center">
                  <span className="absolute h-2 w-2 rounded-full bg-teal-400 opacity-60 motion-safe:animate-ping" aria-hidden />
                  <ListChecks className="relative h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
                </span>
                Atualizar Tarefas
              </Button>
            </div>
            <TarefaRichTextEditor
              value={form.did_yesterday}
              onChange={(did_yesterday) => onFormChange({ ...form, did_yesterday })}
              placeholder="Descreva suas entregas de ontem..."
              ariaLabel="O que fiz ontem?"
              minHeight="min-h-[100px]"
              className="border-slate-300 bg-white shadow-md shadow-slate-200/70 transition-[border-color,box-shadow] duration-200 hover:shadow-lg hover:shadow-slate-200/70 focus-within:border-teal-500 focus-within:ring-teal-500"
              taskReferences={sprintTasks.map((task) => ({
                ...task,
                href: `/equipe/sprints/${form.sprint_id}?taskId=${task.id}`,
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" />O que vou fazer hoje?</Label>
            {sprintTasks.length > 0 && <DailyTaskPicker tasks={sprintTasks} onPick={insertTask('will_do_today')} />}
            <TarefaRichTextEditor
              value={form.will_do_today}
              onChange={(will_do_today) => onFormChange({ ...form, will_do_today })}
              placeholder="Suas tarefas para hoje..."
              ariaLabel="O que vou fazer hoje?"
              minHeight="min-h-[100px]"
              className="border-slate-300 bg-white shadow-md shadow-slate-200/70 transition-[border-color,box-shadow] duration-200 hover:shadow-lg hover:shadow-slate-200/70 focus-within:border-teal-500 focus-within:ring-teal-500"
              taskReferences={sprintTasks.map((task) => ({
                ...task,
                href: `/equipe/sprints/${form.sprint_id}?taskId=${task.id}`,
              }))}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-gray-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-gray-500" />Tem bloqueio hoje?</Label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant={form.has_blocker ? 'outline' : 'default'} className="h-8" onClick={() => onFormChange({ ...form, has_blocker: false })}>Não</Button>
                <Button type="button" size="sm" variant={form.has_blocker ? 'default' : 'outline'} className="h-8" onClick={() => onFormChange({ ...form, has_blocker: true })}>Sim</Button>
              </div>
            </div>
            {form.has_blocker && (
              <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                <div className="space-y-1.5">
                  <Label className="text-amber-800 text-sm font-medium">Tarefa travada</Label>
                  <Select value={form.blocked_deliverable_id || '__none__'} onValueChange={(value) => onFormChange({ ...form, blocked_deliverable_id: value === '__none__' ? '' : value })}>
                    <SelectTrigger className="bg-white border-amber-300 text-gray-900"><SelectValue placeholder="Selecione a tarefa" /></SelectTrigger>
                    <SelectContent className="bg-white border-amber-200">
                      <SelectItem value="__none__">Nenhuma específica</SelectItem>
                      {blockerGroups.map((group, index) => (
                        <SelectGroup key={group.header ?? '__avulsas__'}>
                          {group.header ? (
                            <SelectLabel>{group.header}</SelectLabel>
                          ) : index > 0 ? (
                            <SelectLabel>Avulsas</SelectLabel>
                          ) : null}
                          {group.tasks.map((task) => (
                            <SelectItem
                              key={task.id}
                              value={task.id}
                              className={task.status === 'completed' ? 'text-gray-400 line-through' : ''}
                            >
                              {task.task_code ? `${task.task_code} - ` : ''}{task.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  {sprintTasks.length === 0 && <p className="text-xs text-amber-700">Escolha uma sprint com tarefas suas para vincular o bloqueio a uma tarefa.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-amber-800 text-sm font-medium">Por quê?</Label>
                  <Textarea value={form.blockers} onChange={(event) => onFormChange({ ...form, blockers: event.target.value })} className="bg-white border-amber-300 text-gray-900 min-h-[60px]" placeholder="O que está impedindo?" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-amber-800 text-sm font-medium">Quem/o que destrava? <span className="text-amber-600 font-normal">(opcional)</span></Label>
                  <Input value={form.blocker_owner} onChange={(event) => onFormChange({ ...form, blocker_owner: event.target.value })} className="bg-white border-amber-300 text-gray-900" placeholder="Ex.: TI, cliente, João" />
                </div>
              </div>
            )}
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting || !selectedUserId}>
            <Send className="h-4 w-4 mr-2" />{submitting ? 'Salvando...' : registered ? 'Atualizar Daily' : 'Registrar Daily'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Campo do painel de contexto: rótulo curto em cima, controle compacto embaixo. */
function ContextField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
        {hint && <span className="ml-1 font-normal normal-case tracking-normal text-gray-400">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
