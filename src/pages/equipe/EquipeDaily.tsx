import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDomainEquipeDaily,
  type DailyStandup,
  type Process,
  type Project,
  type Sprint,
  type TeamMember,
} from '@/hooks/useDomainEquipeDaily';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { renderMarkdown } from '@/lib/markdownRenderer';
import { 
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Users,
  Filter,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Target,
  FileSpreadsheet,
  X,
  FolderOpen,
  Zap,
  Copy
} from 'lucide-react';
import * as XLSX from 'xlsx';

const EquipeDaily = () => {
  const { user } = useAuth();
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [myStandup, setMyStandup] = useState<DailyStandup | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const [form, setForm] = useState({
    did_yesterday: '',
    will_do_today: '',
    blockers: '',
    sprint_id: '',
    project_id: '',
    process_id: ''
  });

  // Estado para edição
  const [editingStandup, setEditingStandup] = useState<DailyStandup | null>(null);
  const [editForm, setEditForm] = useState({
    did_yesterday: '',
    will_do_today: '',
    blockers: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  // Filtros para histórico
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterPerson, setFilterPerson] = usePersistedState<string>('rotina.daily.pessoa', 'all');
  const [filterSprint, setFilterSprint] = usePersistedState<string>('rotina.daily.sprint', 'all');
  const {
    teamMembersResult,
    sprintsResult,
    projectsResult,
    processesResult,
    standupsResult,
    refetchStandups,
    updateDailyStandup,
    insertDailyStandup,
    deleteDailyStandup,
    copyFromYesterday,
  } = useDomainEquipeDaily({
    userId: user?.id,
    today,
    membersLoaded,
    filters: {
      startDate: filterStartDate,
      endDate: filterEndDate,
      person: filterPerson,
      sprint: filterSprint,
    },
  });

  useEffect(() => {
    if (user) {
      setSelectedUserId(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!teamMembersResult) return;

    if (teamMembersResult.roleProfiles) {
      setTeamMembers(teamMembersResult.roleProfiles);
    }

    if (teamMembersResult.additionalProfiles) {
      const additionalProfiles = teamMembersResult.additionalProfiles;
      setTeamMembers(prev => {
        const existingIds = new Set(prev.map(member => member.id));
        const newMembers = additionalProfiles.filter(
          profile => !existingIds.has(profile.id),
        );
        return [...prev, ...newMembers];
      });
    }

    setMembersLoaded(true);
  }, [teamMembersResult]);

  useEffect(() => {
    if (sprintsResult?.data) {
      setSprints(sprintsResult.data);
    }
  }, [sprintsResult]);

  useEffect(() => {
    if (projectsResult?.data) {
      setProjects(projectsResult.data);
    }
  }, [projectsResult]);

  useEffect(() => {
    if (processesResult?.data) {
      setProcesses(processesResult.data);
    }
  }, [processesResult]);

  useEffect(() => {
    if (!standupsResult) return;

    if (standupsResult.myStandup) {
      const standup = standupsResult.myStandup;
      setMyStandup(standup);
      setForm({
        did_yesterday: standup.did_yesterday || '',
        will_do_today: standup.will_do_today || '',
        blockers: standup.blockers || '',
        sprint_id: standup.sprint_id || '',
        project_id: standup.project_id || '',
        process_id: standup.process_id || ''
      });
    }

    if (standupsResult.standups) {
      setStandups(standupsResult.standups);
    }

    setLoading(false);
  }, [standupsResult]);

  // Filtrar processos pelo projeto selecionado
  const filteredProcesses = form.project_id
    ? processes.filter(p => p.project_id === form.project_id)
    : processes;

  const fetchStandups = async () => {
    if (!user) return;
    await refetchStandups();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUserId) return;
    
    setSubmitting(true);
    
    try {
      if (myStandup && selectedUserId === user.id) {
        await updateDailyStandup.mutateAsync({
          standupId: myStandup.id,
          payload: {
            did_yesterday: form.did_yesterday,
            will_do_today: form.will_do_today,
            blockers: form.blockers || null,
            sprint_id: form.sprint_id || null,
            project_id: form.project_id || null,
            process_id: form.process_id || null
          },
        });

        toast({ title: "Daily atualizado", description: "Seu registro foi atualizado." });
      } else {
        await insertDailyStandup.mutateAsync({
          user_id: selectedUserId,
          date: today,
          did_yesterday: form.did_yesterday,
          will_do_today: form.will_do_today,
          blockers: form.blockers || null,
          sprint_id: form.sprint_id || null,
          project_id: form.project_id || null,
          process_id: form.process_id || null
        });

        toast({ title: "Daily registrado", description: "O registro foi salvo com sucesso." });
      }

      fetchStandups();
    } catch (error) {
      console.error('Error submitting standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar o daily.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyFromYesterday = async () => {
    if (!user || copyingYesterday) return;
    setCopyingYesterday(true);
    try {
      const data = await copyFromYesterday.mutateAsync({ copyUserId: user.id, copyDate: today });

      if (!data || !data.will_do_today?.trim()) {
        toast({
          title: 'Nada para copiar',
          description: 'Não encontramos um daily anterior com plano preenchido.',
          variant: 'destructive'
        });
        return;
      }

      setForm((prev) => ({ ...prev, did_yesterday: data.will_do_today || '' }));
      const dateLabel = new Date(data.date + 'T12:00:00').toLocaleDateString('pt-BR');
      toast({
        title: 'Plano trazido',
        description: `Copiado do daily de ${dateLabel} (sobrescreve o que estava em "ontem").`
      });
    } catch (err) {
      console.error('Error copying from yesterday:', err);
      toast({ title: 'Erro', description: 'Não foi possível trazer o plano anterior.', variant: 'destructive' });
    } finally {
      setCopyingYesterday(false);
    }
  };

  const handleEdit = (standup: DailyStandup) => {
    setEditingStandup(standup);
    setEditForm({
      did_yesterday: standup.did_yesterday || '',
      will_do_today: standup.will_do_today || '',
      blockers: standup.blockers || ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editingStandup) return;
    
    setEditSubmitting(true);
    
    try {
      await updateDailyStandup.mutateAsync({
        standupId: editingStandup.id,
        payload: {
          did_yesterday: editForm.did_yesterday,
          will_do_today: editForm.will_do_today,
          blockers: editForm.blockers || null
        },
      });

      toast({ title: "Daily atualizado", description: "O registro foi atualizado com sucesso." });
      setEditingStandup(null);
      fetchStandups();
    } catch (error) {
      console.error('Error updating standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível atualizar o daily.", 
        variant: "destructive" 
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (standupId: string) => {
    try {
      await deleteDailyStandup.mutateAsync(standupId);
      
      toast({ title: "Daily excluído", description: "O registro foi removido." });
      fetchStandups();
    } catch (error) {
      console.error('Error deleting standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível excluir o daily.", 
        variant: "destructive" 
      });
    }
  };

  const getMemberName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    if (member) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Sem nome';
    }
    return userId === user?.id ? 'Você' : 'Membro da equipe';
  };

  const getSprintName = (sprintId: string | null): string => {
    if (!sprintId) return 'Sem sprint';
    const sprint = sprints.find(s => s.id === sprintId);
    return sprint?.name || 'Sprint não encontrada';
  };

  const getProjectName = (projectId: string | null): string => {
    if (!projectId) return '';
    const project = projects.find(p => p.id === projectId);
    return project?.name || '';
  };

  const getProcessName = (processId: string | null): string => {
    if (!processId) return '';
    const process = processes.find(p => p.id === processId);
    return process?.name || '';
  };

  const handleExportExcel = () => {
    if (standups.length === 0) {
      toast({ 
        title: "Sem dados", 
        description: "Não há dailys para exportar.", 
        variant: "destructive" 
      });
      return;
    }

    const data = standups.map((standup) => ({
      'Data': new Date(standup.date).toLocaleDateString('pt-BR'),
      'Membro': getMemberName(standup.user_id),
      'Sprint': getSprintName(standup.sprint_id),
      'Projeto': getProjectName(standup.project_id) || '-',
      'Processo': getProcessName(standup.process_id) || '-',
      'Horário': new Date(standup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      'Ontem': standup.did_yesterday || '-',
      'Hoje': standup.will_do_today || '-',
      'Bloqueios': standup.blockers || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dailys');

    const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(wb, `dailys_${today}.xlsx`);

    toast({ 
      title: "Excel exportado", 
      description: `${standups.length} daily(s) exportado(s) com sucesso.` 
    });
  };

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterPerson('all');
    setFilterSprint('all');
    toast({ 
      title: "Filtros limpos", 
      description: "Todos os filtros foram removidos." 
    });
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <EquipeLayout 
      title="Daily Standup" 
      subtitle={todayFormatted}
    >
      <div className="space-y-6">
        {/* Formulário de Daily */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Daily (15 min)
              {myStandup && selectedUserId === user?.id && (
                <Badge className="bg-green-100 text-green-700 ml-2">Registrado</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                💡 <strong>Trabalhou numa rotina recorrente?</strong> Comece o texto de
                {' '}<em>O que fiz ontem</em> com{' '}
                <code className="bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-700">[ROTINA]</code>{' '}
                seguido do nome. Ex:{' '}
                <code className="bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-700">[ROTINA] Atualizar PSA Faturamento</code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <fieldset className="space-y-3 border border-gray-200 rounded-lg p-3">
                  <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                    Quem e quando
                  </legend>

                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Membro da equipe
                    </Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione o membro" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                            {member.id === user?.id && ' (você)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-500" />
                      Sprint
                    </Label>
                    <Select value={form.sprint_id} onValueChange={(value) => setForm({ ...form, sprint_id: value })}>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione a sprint" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {sprints.map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            {sprint.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </fieldset>

                <fieldset className="space-y-3 border border-gray-200 rounded-lg p-3">
                  <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                    Contexto do trabalho
                  </legend>

                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-gray-500" />
                      Projeto <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Select
                      value={form.project_id}
                      onValueChange={(value) => setForm({
                        ...form,
                        project_id: value === '__none__' ? '' : value,
                        process_id: ''
                      })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione um projeto" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-gray-500" />
                      Processo <span className="text-gray-400 text-xs">(opcional)</span>
                    </Label>
                    <Select
                      value={form.process_id}
                      onValueChange={(value) => setForm({ ...form, process_id: value === '__none__' ? '' : value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione um processo" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {filteredProcesses.map((process) => (
                          <SelectItem key={process.id} value={process.id}>
                            {process.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.project_id && (
                      <p className="text-xs text-gray-500">
                        Mostrando processos do projeto selecionado
                      </p>
                    )}
                  </div>
                </fieldset>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-gray-700 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    O que fiz ontem?
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyFromYesterday}
                    disabled={copyingYesterday}
                    className="h-8"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    {copyingYesterday ? 'Buscando...' : 'Trazer plano de ontem'}
                  </Button>
                </div>
                <MarkdownEditor
                  value={form.did_yesterday}
                  onChange={(value) => setForm({ ...form, did_yesterday: value })}
                  className="bg-white"
                  placeholder="Descreva suas entregas de ontem..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  O que vou fazer hoje?
                </Label>
                <MarkdownEditor
                  value={form.will_do_today}
                  onChange={(value) => setForm({ ...form, will_do_today: value })}
                  className="bg-white"
                  placeholder="Suas tarefas para hoje..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  Bloqueios? (opcional)
                </Label>
                <Textarea
                  value={form.blockers}
                  onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 min-h-[60px]"
                  placeholder="Algum impedimento ou bloqueio?"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={submitting || !selectedUserId}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Salvando...' : myStandup && selectedUserId === user?.id ? 'Atualizar Daily' : 'Registrar Daily'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Histórico de Dailys com Filtros */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                Histórico de Dailys
              </CardTitle>
              
              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Filtros:</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">De:</span>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 w-40"
                    placeholder="Data Início"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Até:</span>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 w-40"
                    placeholder="Data Fim"
                  />
                </div>
                
                <Select value={filterPerson} onValueChange={setFilterPerson}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44">
                    <SelectValue placeholder="Pessoa" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all">Todas as pessoas</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterSprint} onValueChange={setFilterSprint}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44">
                    <SelectValue placeholder="Sprint" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all">Todas as sprints</SelectItem>
                    {sprints.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  onClick={() => fetchStandups()}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>

                <Button 
                  onClick={handleClearFilters}
                  variant="outline"
                  className="border-gray-400 text-gray-600 hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>

                <Button 
                  onClick={handleExportExcel}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : standups.length > 0 ? (
              <div className="space-y-4">
                {standups.map((standup) => (
                  <div 
                    key={standup.id}
                    className={`p-4 rounded-lg border ${
                      standup.user_id === user?.id 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">
                            {getMemberName(standup.user_id)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(standup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* Botões de edição/exclusão apenas para o próprio usuário */}
                          {standup.user_id === user?.id && (
                            <div className="flex gap-1 ml-auto">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEdit(standup)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Daily?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O registro do daily será permanentemente removido.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(standup.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        
                        {/* Data, Sprint, Projeto e Processo */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(standup.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {getSprintName(standup.sprint_id)}
                          </span>
                          {standup.project_id && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <FolderOpen className="h-3 w-3" />
                                {getProjectName(standup.project_id)}
                              </span>
                            </>
                          )}
                          {standup.process_id && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {getProcessName(standup.process_id)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {standup.did_yesterday && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Ontem:</p>
                        <div className="text-sm text-gray-700">{renderMarkdown(standup.did_yesterday)}</div>
                      </div>
                    )}

                    {standup.will_do_today && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Hoje:</p>
                        <div className="text-sm text-gray-700">{renderMarkdown(standup.will_do_today)}</div>
                      </div>
                    )}

                    {standup.blockers && (
                      <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-700 mb-1">Bloqueio:</p>
                        <div className="text-sm text-yellow-800">{renderMarkdown(standup.blockers)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum daily encontrado para os filtros selecionados</p>
                <p className="text-sm text-gray-400">Tente alterar a data ou os filtros</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editingStandup !== null} onOpenChange={(open) => !open && setEditingStandup(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Daily</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">O que fiz ontem?</Label>
              <MarkdownEditor
                value={editForm.did_yesterday}
                onChange={(value) => setEditForm({ ...editForm, did_yesterday: value })}
                placeholder="Descreva suas entregas de ontem..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">O que vou fazer hoje?</Label>
              <MarkdownEditor
                value={editForm.will_do_today}
                onChange={(value) => setEditForm({ ...editForm, will_do_today: value })}
                placeholder="Suas tarefas para hoje..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Bloqueios? (opcional)</Label>
              <Textarea
                value={editForm.blockers}
                onChange={(e) => setEditForm({ ...editForm, blockers: e.target.value })}
                className="min-h-[60px]"
                placeholder="Algum impedimento ou bloqueio?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStandup(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeDaily;
