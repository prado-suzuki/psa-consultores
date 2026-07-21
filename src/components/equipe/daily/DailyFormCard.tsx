import type { FormEvent } from 'react';
import { AlertTriangle, CheckCircle, Clock, Copy, FolderOpen, Send, Target, Users, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Process, Project, Sprint, TeamMember } from '@/hooks/useDomainEquipeDaily';
import type { DailyFormDraft } from '@/lib/equipeDaily';

interface DailyFormCardProps {
  authenticatedUserId?: string;
  selectedUserId: string;
  onSelectedUserIdChange: (userId: string) => void;
  teamMembers: TeamMember[];
  sprints: Sprint[];
  projects: Project[];
  processes: Process[];
  form: DailyFormDraft;
  onFormChange: (form: DailyFormDraft) => void;
  registered: boolean;
  submitting: boolean;
  copyingYesterday: boolean;
  onSubmit: (event: FormEvent) => void;
  onCopyFromYesterday: () => void;
}

export function DailyFormCard({
  authenticatedUserId,
  selectedUserId,
  onSelectedUserIdChange,
  teamMembers,
  sprints,
  projects,
  processes,
  form,
  onFormChange,
  registered,
  submitting,
  copyingYesterday,
  onSubmit,
  onCopyFromYesterday,
}: DailyFormCardProps) {
  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Daily (15 min)
          {registered && <Badge className="bg-green-100 text-green-700 ml-2">Registrado</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            💡 <strong>Trabalhou numa rotina recorrente?</strong> Comece o texto de{' '}
            <em>O que fiz ontem</em> com{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-700">[ROTINA]</code>{' '}
            seguido do nome. Ex:{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-700">[ROTINA] Atualizar PSA Faturamento</code>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset className="space-y-3 border border-gray-200 rounded-lg p-3">
              <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Quem e quando</legend>
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2"><Users className="h-4 w-4 text-gray-500" />Membro da equipe</Label>
                <Select value={selectedUserId} onValueChange={onSelectedUserIdChange}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione o membro" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}{member.id === authenticatedUserId && ' (você)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2"><Target className="h-4 w-4 text-gray-500" />Sprint</Label>
                <Select value={form.sprint_id} onValueChange={(sprint_id) => onFormChange({ ...form, sprint_id })}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione a sprint" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {sprints.map((sprint) => <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            <fieldset className="space-y-3 border border-gray-200 rounded-lg p-3">
              <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Contexto do trabalho</legend>
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2"><FolderOpen className="h-4 w-4 text-gray-500" />Projeto <span className="text-gray-400 text-xs">(opcional)</span></Label>
                <Select
                  value={form.project_id}
                  onValueChange={(value) => onFormChange({ ...form, project_id: value === '__none__' ? '' : value, process_id: '' })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2"><Zap className="h-4 w-4 text-gray-500" />Processo <span className="text-gray-400 text-xs">(opcional)</span></Label>
                <Select value={form.process_id} onValueChange={(value) => onFormChange({ ...form, process_id: value === '__none__' ? '' : value })}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue placeholder="Selecione um processo" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {processes.map((process) => <SelectItem key={process.id} value={process.id}>{process.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.project_id && <p className="text-xs text-gray-500">Mostrando processos do projeto selecionado</p>}
              </div>
            </fieldset>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-gray-700 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-gray-500" />O que fiz ontem?</Label>
              <Button type="button" variant="outline" size="sm" onClick={onCopyFromYesterday} disabled={copyingYesterday} className="h-8">
                <Copy className="h-3.5 w-3.5 mr-1.5" />{copyingYesterday ? 'Buscando...' : 'Trazer plano de ontem'}
              </Button>
            </div>
            <MarkdownEditor value={form.did_yesterday} onChange={(did_yesterday) => onFormChange({ ...form, did_yesterday })} className="bg-white" placeholder="Descreva suas entregas de ontem..." required />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" />O que vou fazer hoje?</Label>
            <MarkdownEditor value={form.will_do_today} onChange={(will_do_today) => onFormChange({ ...form, will_do_today })} className="bg-white" placeholder="Suas tarefas para hoje..." required />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-gray-500" />Bloqueios? (opcional)</Label>
            <Textarea value={form.blockers} onChange={(event) => onFormChange({ ...form, blockers: event.target.value })} className="bg-white border-gray-300 text-gray-900 min-h-[60px]" placeholder="Algum impedimento ou bloqueio?" />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting || !selectedUserId}>
            <Send className="h-4 w-4 mr-2" />{submitting ? 'Salvando...' : registered ? 'Atualizar Daily' : 'Registrar Daily'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
