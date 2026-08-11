import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
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
import { useClusters } from '@/hooks/useClusters';
import { useDomainDailySprintProgress } from '@/hooks/useDomainDailySprintProgress';
import {
  useDailySprintTasks,
  useUpdateDailyTaskStatus,
  type DailySprintTask,
  type DailyTaskStatus,
} from '@/hooks/useDailySprintTasks';
import { matchCluster, SEM_CLUSTER } from '@/lib/clusterFilter';
import { buildDailySprintProgress } from '@/lib/dailySprintProgress';
import { toast } from '@/hooks/use-toast';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import {
  buildDailyBlockerFields,
  buildDailyExportRows,
  createDailyEditDraft,
  createDailyFormDraft,
  createDailyLookups,
  filterProcesses,
  findCurrentActiveSprintId,
  isDailyTextEmpty,
  toDailyRichText,
  hydrateDailyForm,
  mergeTeamMembers,
  type DailyEditDraft,
  type DailyFilters,
  type DailyFormDraft,
} from '@/lib/equipeDaily';

export function useEquipeDailyController() {
  const { user } = useAuth();
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [myStandup, setMyStandup] = useState<DailyStandup | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [sprintsLoaded, setSprintsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const [quickUpdateOpen, setQuickUpdateOpen] = useState(false);
  const [form, setForm] = useState<DailyFormDraft>(createDailyFormDraft);
  const [editingStandup, setEditingStandup] = useState<DailyStandup | null>(null);
  const [editForm, setEditForm] = useState<DailyEditDraft>(createDailyEditDraft);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterPerson, setFilterPerson] = usePersistedState<string>('rotina.daily.pessoa', 'all');
  const [filterSprint, setFilterSprint] = usePersistedState<string>('rotina.daily.sprint', 'all');
  const [filterCluster, setFilterCluster] = usePersistedState<string>('rotina.cluster', '');
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<DailyFilters>(() => ({
    startDate: '',
    endDate: '',
    person: filterPerson,
    sprint: filterSprint,
  }));
  const [appliedCluster, setAppliedCluster] = useState(filterCluster);
  const { data: clusters = [] } = useClusters();
  // Tarefas da pessoa na sprint escolhida — alimentam os chips e o dropdown de bloqueio.
  const { data: sprintTasks = [] } = useDailySprintTasks(form.sprint_id, selectedUserId);
  const {
    data: quickUpdateTasks = [],
    isLoading: quickUpdateLoading,
  } = useDailySprintTasks(form.sprint_id, user?.id ?? '', quickUpdateOpen);
  const updateDailyTaskStatus = useUpdateDailyTaskStatus(user?.id);
  const activeSprintId = useMemo(() => findCurrentActiveSprintId(sprints), [sprints]);
  const activeSprint = useMemo(
    () => sprints.find((sprint) => sprint.id === activeSprintId) ?? null,
    [activeSprintId, sprints],
  );
  const activeSprintProgressQuery = useDomainDailySprintProgress(activeSprintId);
  const activeSprintProgress = useMemo(
    () => buildDailySprintProgress(activeSprintProgressQuery.data ?? [], teamMembers),
    [activeSprintProgressQuery.data, teamMembers],
  );
  const today = new Date().toISOString().split('T')[0];
  const filters: DailyFilters = {
    startDate: filterStartDate,
    endDate: filterEndDate,
    person: filterPerson,
    sprint: filterSprint,
  };
  const clusterProjectIds = useMemo(() => projects
    .filter((project) => appliedCluster === SEM_CLUSTER
      ? !project.cluster_id
      : project.cluster_id === appliedCluster)
    .map((project) => project.id), [appliedCluster, projects]);
  const clusterProjectIdSet = useMemo(() => new Set(clusterProjectIds), [clusterProjectIds]);
  const clusterSprintIds = useMemo(() => sprints
    .filter((sprint) => appliedCluster === SEM_CLUSTER
      ? !sprint.project_id || clusterProjectIdSet.has(sprint.project_id)
      : Boolean(sprint.project_id && clusterProjectIdSet.has(sprint.project_id)))
    .map((sprint) => sprint.id), [appliedCluster, clusterProjectIdSet, sprints]);

  const domain = useDomainEquipeDaily({
    userId: user?.id,
    today,
    filters: appliedFilters,
    page,
    clusterFilter: appliedCluster,
    clusterProjectIds,
    clusterSprintIds,
    clusterDataLoaded: projectsLoaded && sprintsLoaded,
  });

  useEffect(() => {
    if (user) setSelectedUserId(user.id);
  }, [user]);

  useEffect(() => {
    if (!domain.teamMembersResult) return;
    setTeamMembers((current) => mergeTeamMembers(
      current,
      domain.teamMembersResult?.roleProfiles,
      domain.teamMembersResult?.additionalProfiles,
    ));
  }, [domain.teamMembersResult]);

  useEffect(() => {
    if (!domain.sprintsResult?.data) return;
    setSprints(domain.sprintsResult.data);
    setSprintsLoaded(true);
  }, [domain.sprintsResult]);

  useEffect(() => {
    if (!domain.projectsResult?.data) return;
    setProjects(domain.projectsResult.data);
    setProjectsLoaded(true);
  }, [domain.projectsResult]);

  useEffect(() => {
    if (domain.processesResult?.data) setProcesses(domain.processesResult.data);
  }, [domain.processesResult]);

  useEffect(() => {
    if (!domain.standupsResult) return;
    if (domain.standupsResult.standups?.length === 0 && page > 1) {
      setPage((currentPage) => currentPage - 1);
      return;
    }
    if (domain.standupsResult.myStandup) {
      setMyStandup(domain.standupsResult.myStandup);
      setForm(hydrateDailyForm(domain.standupsResult.myStandup));
    }
    if (domain.standupsResult.standups) setStandups(domain.standupsResult.standups);
    setLoading(false);
  }, [domain.standupsResult, page]);

  // Sprint sugerida: a ativa mais atual, uma única vez e só quando ainda não existe
  // daily de hoje (um daily já gravado manda no valor, inclusive quando é "sem sprint").
  const sprintAutofillDoneRef = useRef(false);
  useEffect(() => {
    if (sprintAutofillDoneRef.current || !domain.standupsResult) return;
    if (domain.standupsResult.myStandup) {
      sprintAutofillDoneRef.current = true;
      return;
    }
    const activeSprintId = findCurrentActiveSprintId(sprints);
    if (!activeSprintId) return;
    sprintAutofillDoneRef.current = true;
    setForm((current) => (current.sprint_id ? current : { ...current, sprint_id: activeSprintId }));
  }, [domain.standupsResult, sprints]);

  const lookups = useMemo(() => createDailyLookups({
    members: teamMembers,
    sprints,
    projects,
    processes,
    authenticatedUserId: user?.id,
  }), [teamMembers, sprints, projects, processes, user?.id]);

  // Cluster de um daily: pelo projeto direto ou, na falta, pelo projeto da sprint.
  const clusterOfStandup = useMemo(() => {
    const projectCluster = new Map(projects.map((p) => [p.id, p.cluster_id ?? null]));
    const sprintProject = new Map(sprints.map((s) => [s.id, s.project_id ?? null]));
    return (standup: DailyStandup): string | null => {
      if (standup.project_id) return projectCluster.get(standup.project_id) ?? null;
      if (standup.sprint_id) {
        const projectId = sprintProject.get(standup.sprint_id);
        if (projectId) return projectCluster.get(projectId) ?? null;
      }
      return null;
    };
  }, [projects, sprints]);

  const visibleStandups = useMemo(
    () => standups.filter((standup) => matchCluster(appliedCluster, clusterOfStandup(standup))),
    [standups, appliedCluster, clusterOfStandup],
  );

  const fetchStandups = async () => {
    if (!user) return;
    await domain.refetchStandups();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selectedUserId) return;
    // O editor rico não tem validação nativa de campo obrigatório (o textarea tinha).
    if (isDailyTextEmpty(form.did_yesterday) || isDailyTextEmpty(form.will_do_today)) {
      toast({
        title: 'Preencha ontem e hoje',
        description: 'Descreva o que você fez ontem e o que vai fazer hoje.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      if (myStandup && selectedUserId === user.id) {
        await domain.updateDailyStandup.mutateAsync({
          standupId: myStandup.id,
          payload: {
            did_yesterday: form.did_yesterday,
            will_do_today: form.will_do_today,
            sprint_id: form.sprint_id || null,
            project_id: form.project_id || null,
            process_id: form.process_id || null,
            ...buildDailyBlockerFields(form),
          } as TablesUpdate<'daily_standups'>,
        });
        toast({ title: 'Daily atualizado', description: 'Seu registro foi atualizado.' });
      } else {
        await domain.insertDailyStandup.mutateAsync({
          user_id: selectedUserId,
          date: today,
          did_yesterday: form.did_yesterday,
          will_do_today: form.will_do_today,
          sprint_id: form.sprint_id || null,
          project_id: form.project_id || null,
          process_id: form.process_id || null,
          ...buildDailyBlockerFields(form),
        } as TablesInsert<'daily_standups'>);
        toast({ title: 'Daily registrado', description: 'O registro foi salvo com sucesso.' });
      }
      await fetchStandups();
    } catch (error) {
      console.error('Error submitting standup:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o daily.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyFromYesterday = async () => {
    if (!user || copyingYesterday) return;
    setCopyingYesterday(true);
    try {
      const data = await domain.copyFromYesterday.mutateAsync({ copyUserId: user.id, copyDate: today });
      if (!data || isDailyTextEmpty(data.will_do_today)) {
        toast({ title: 'Nada para copiar', description: 'Não encontramos um daily anterior com plano preenchido.', variant: 'destructive' });
        return;
      }
      setForm((current) => ({ ...current, did_yesterday: toDailyRichText(data.will_do_today) }));
      const dateLabel = new Date(`${data.date}T12:00:00`).toLocaleDateString('pt-BR');
      toast({ title: 'Plano trazido', description: `Copiado do daily de ${dateLabel} (sobrescreve o que estava em "ontem").` });
    } catch (error) {
      console.error('Error copying from yesterday:', error);
      toast({ title: 'Erro', description: 'Não foi possível trazer o plano anterior.', variant: 'destructive' });
    } finally {
      setCopyingYesterday(false);
    }
  };

  const handleQuickTaskUpdate = async (
    task: DailySprintTask,
    status: DailyTaskStatus,
    actualHours?: number,
  ) => {
    try {
      await updateDailyTaskStatus.mutateAsync({ task, status, actualHours });
      toast({
        title: status === 'completed' ? 'Tarefa concluída' : 'Status atualizado',
        description: status === 'completed'
          ? 'Horas realizadas registradas. A sprint já está atualizada.'
          : `“${task.title}” foi atualizada.`,
      });
      return true;
    } catch (error) {
      console.error('Error updating task from daily:', error);
      toast({
        title: 'Não foi possível atualizar',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleEdit = (standup: DailyStandup) => {
    setEditingStandup(standup);
    setEditForm(createDailyEditDraft(standup));
  };

  const handleEditSubmit = async () => {
    if (!editingStandup) return;
    setEditSubmitting(true);
    try {
      await domain.updateDailyStandup.mutateAsync({
        standupId: editingStandup.id,
        payload: {
          did_yesterday: editForm.did_yesterday,
          will_do_today: editForm.will_do_today,
          blockers: editForm.blockers || null,
        },
      });
      toast({ title: 'Daily atualizado', description: 'O registro foi atualizado com sucesso.' });
      setEditingStandup(null);
      await fetchStandups();
    } catch (error) {
      console.error('Error updating standup:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o daily.', variant: 'destructive' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (standupId: string) => {
    try {
      await domain.deleteDailyStandup.mutateAsync(standupId);
      toast({ title: 'Daily excluído', description: 'O registro foi removido.' });
      await fetchStandups();
    } catch (error) {
      console.error('Error deleting standup:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o daily.', variant: 'destructive' });
    }
  };

  const handleFiltersChange = (nextFilters: DailyFilters) => {
    setFilterStartDate(nextFilters.startDate);
    setFilterEndDate(nextFilters.endDate);
    setFilterPerson(nextFilters.person);
    setFilterSprint(nextFilters.sprint);
  };

  const handleSearch = async () => {
    const sameFilters = page === 1
      && appliedCluster === filterCluster
      && appliedFilters.startDate === filters.startDate
      && appliedFilters.endDate === filters.endDate
      && appliedFilters.person === filters.person
      && appliedFilters.sprint === filters.sprint;

    setLoading(true);
    setPage(1);
    setAppliedFilters(filters);
    setAppliedCluster(filterCluster);
    if (sameFilters) await fetchStandups();
  };

  const handleClearFilters = () => {
    const clearedFilters = { startDate: '', endDate: '', person: 'all', sprint: 'all' };
    handleFiltersChange(clearedFilters);
    setFilterCluster('');
    setAppliedFilters(clearedFilters);
    setAppliedCluster('');
    setPage(1);
    setLoading(true);
    toast({ title: 'Filtros limpos', description: 'Todos os filtros foram removidos.' });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || (nextPage > page && !domain.standupsResult?.hasNextPage)) return;
    setLoading(true);
    setPage(nextPage);
  };

  const handleExportExcel = async () => {
    try {
      const allFilteredStandups = await domain.fetchStandupsForExport();
      const exportStandups = allFilteredStandups.filter((standup) =>
        matchCluster(appliedCluster, clusterOfStandup(standup)));
      if (exportStandups.length === 0) {
        toast({ title: 'Sem dados', description: 'Não há dailys para exportar.', variant: 'destructive' });
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(buildDailyExportRows(exportStandups, lookups));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dailys');
      const dateLabel = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(workbook, `dailys_${dateLabel}.xlsx`);
      toast({ title: 'Excel exportado', description: `${exportStandups.length} daily(s) exportado(s) com sucesso.` });
    } catch (error) {
      console.error('Error exporting standups:', error);
      toast({ title: 'Erro', description: 'Não foi possível exportar os dailys.', variant: 'destructive' });
    }
  };

  return {
    userId: user?.id,
    standups: visibleStandups,
    teamMembers,
    sprints,
    projects,
    sprintTasks,
    activeSprint,
    activeSprintProgress,
    activeSprintProgressLoading: activeSprintProgressQuery.isLoading,
    quickUpdateTasks,
    quickUpdateLoading,
    quickUpdateOpen,
    setQuickUpdateOpen,
    quickUpdateSubmitting: updateDailyTaskStatus.isPending,
    clusters,
    filterCluster,
    setFilterCluster,
    filteredProcesses: filterProcesses(processes, form.project_id),
    selectedUserId,
    setSelectedUserId,
    loading: loading || Boolean(domain.standupsFetching),
    page,
    hasNextPage: Boolean(domain.standupsResult?.hasNextPage),
    submitting,
    copyingYesterday,
    form,
    setForm,
    editingStandup,
    editForm,
    setEditForm,
    editSubmitting,
    filters,
    lookups,
    registered: Boolean(myStandup && selectedUserId === user?.id),
    handleSubmit,
    handleCopyFromYesterday,
    handleQuickTaskUpdate,
    handleEdit,
    closeEdit: () => setEditingStandup(null),
    handleEditSubmit,
    handleDelete,
    handleFiltersChange,
    handleSearch,
    handleClearFilters,
    handlePageChange,
    handleExportExcel,
    fetchStandups,
  };
}
