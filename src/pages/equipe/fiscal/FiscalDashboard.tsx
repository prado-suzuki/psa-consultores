import { useMemo, useState } from 'react';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderKanban, Clock, CheckCircle, AlertTriangle, ListChecks, AlertCircle, Loader2,
  Sparkles, Users, Filter, X, CalendarRange,
} from 'lucide-react';
import { format, differenceInDays, startOfDay, subDays, eachDayOfInterval, addDays } from 'date-fns';
import { statusList } from '@/lib/taskStatusColors';
import { useEstruturaAreas } from '@/hooks/useEstruturaAreas';
import {
  useFiscalDashProjects,
  useFiscalDashTasks,
  useFiscalDashContribuintes,
  useFiscalDashClientNames,
} from '@/hooks/useFiscalDashboardData';
import { useFiscalClientsList } from '@/hooks/useFiscalClients';
import { useTeamProfilesSafe } from '@/hooks/useTaxReferenceData';
import {
  KpiHero, HatchedBar, WorkloadHeatmap, HeroBanner,
  type HatchedBarSegment, type HeatmapRow,
} from '@/components/dashboard/momentum';

const today = startOfDay(new Date());
const ALL = '__ALL__';

type UrgencyFilter = typeof ALL | 'overdue' | 'next_7' | 'next_30' | 'no_due';

const FiscalDashboard = () => {
  const { data: projects = [], isLoading: loadingProjects } = useFiscalDashProjects();
  const { data: tasks = [], isLoading: loadingTasks } = useFiscalDashTasks();
  const { data: clients = [] } = useFiscalClientsList();
  const { data: contribuintes = [] } = useFiscalDashContribuintes();
  const { data: clientNames = [] } = useFiscalDashClientNames();
  const { data: areas = [] } = useEstruturaAreas('tax');
  const { data: members = [] } = useTeamProfilesSafe();

  const isLoading = loadingProjects || loadingTasks;

  // ═══════════════════════ FILTROS ═══════════════════════
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterClient, setFilterClient] = useState<string>(ALL);
  const [filterProject, setFilterProject] = useState<string>(ALL);
  const [filterTaskStatus, setFilterTaskStatus] = useState<string>(ALL);
  const [filterProjectStatus, setFilterProjectStatus] = useState<string>(ALL);
  const [filterMember, setFilterMember] = useState<string>(ALL);
  const [filterArea, setFilterArea] = useState<string>(ALL);
  const [filterUrgency, setFilterUrgency] = useState<UrgencyFilter>(ALL);

  const activeFiltersCount = [
    filterStartDate, filterEndDate,
    filterClient, filterProject, filterTaskStatus, filterProjectStatus,
    filterMember, filterArea, filterUrgency,
  ].filter(v => v && v !== ALL).length;

  const handleClearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterClient(ALL);
    setFilterProject(ALL);
    setFilterTaskStatus(ALL);
    setFilterProjectStatus(ALL);
    setFilterMember(ALL);
    setFilterArea(ALL);
    setFilterUrgency(ALL);
  };

  // Lookup maps
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);
  // clientMap: nomes de todos os clientes (inclusive inativos/outros ambientes)
  // para resolver corretamente os nomes em tarefas e projetos legados.
  const clientMap = useMemo(() => {
    const base: Record<string, string> = {};
    clientNames.forEach(c => { base[c.id] = c.nome; });
    clients.forEach(c => { base[c.id] = c.nome; });
    return base;
  }, [clientNames, clients]);
  const areaMap = useMemo(() => Object.fromEntries(areas.map(a => [a.id, a.name])), [areas]);
  const memberMap = useMemo(() => Object.fromEntries(members.map(m => [m.id, `${m.first_name} ${m.last_name}`.trim()])), [members]);
  const contribuinteToClient = useMemo(
    () => Object.fromEntries(contribuintes.map(c => [c.id, c.cliente_id])),
    [contribuintes]
  );

  // Resolve o cliente de uma tarefa seguindo: client_id direto → contribuinte → projeto (external/contribuinte)
  const resolveTaskClientId = (t: { client_id: string | null; contribuinte_id: string | null; project_id: string | null }) => {
    if (t.client_id) return t.client_id;
    if (t.contribuinte_id && contribuinteToClient[t.contribuinte_id]) return contribuinteToClient[t.contribuinte_id];
    const proj = t.project_id ? projectMap[t.project_id] : null;
    if (proj?.external_client_id) return proj.external_client_id;
    if (proj?.contribuinte_id && contribuinteToClient[proj.contribuinte_id]) return contribuinteToClient[proj.contribuinte_id];
    return null;
  };

  // ═══════════════════════ DADOS FILTRADOS ═══════════════════════

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterProjectStatus !== ALL && p.status !== filterProjectStatus) return false;
      if (filterProject !== ALL && p.id !== filterProject) return false;
      if (filterArea !== ALL && p.estrutura_area_id !== filterArea) return false;
      return true;
    });
  }, [projects, filterProjectStatus, filterProject, filterArea]);

  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map(p => p.id)),
    [filteredProjects]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Projeto & derivados (área, status de projeto)
      if (filterProject !== ALL && t.project_id !== filterProject) return false;
      if (filterProjectStatus !== ALL || filterArea !== ALL) {
        if (!t.project_id || !filteredProjectIds.has(t.project_id)) return false;
      }

      // Cliente (resolve via client_id direto, contribuinte ou projeto)
      if (filterClient !== ALL) {
        const cid = resolveTaskClientId(t);
        if (cid !== filterClient) return false;
      }

      // Status tarefa
      if (filterTaskStatus !== ALL && t.status !== filterTaskStatus) return false;

      // Responsável
      if (filterMember !== ALL && t.assigned_to !== filterMember) return false;

      // Período (por due_date)
      if (filterStartDate && t.due_date && t.due_date < filterStartDate) return false;
      if (filterEndDate && t.due_date && t.due_date > filterEndDate) return false;

      // Urgência
      if (filterUrgency === 'overdue') {
        if (!t.due_date || t.status === 'done' || new Date(t.due_date + 'T00:00:00') >= today) return false;
      } else if (filterUrgency === 'next_7') {
        if (!t.due_date) return false;
        const due = new Date(t.due_date + 'T00:00:00');
        if (due < today || due > addDays(today, 7)) return false;
      } else if (filterUrgency === 'next_30') {
        if (!t.due_date) return false;
        const due = new Date(t.due_date + 'T00:00:00');
        if (due < today || due > addDays(today, 30)) return false;
      } else if (filterUrgency === 'no_due') {
        if (t.due_date) return false;
      }

      return true;
    });
  }, [
    tasks, filteredProjectIds, contribuinteToClient, projectMap,
    filterProject, filterProjectStatus, filterArea, filterClient,
    filterTaskStatus, filterMember, filterStartDate, filterEndDate, filterUrgency,
  ]);

  // ═══════════════════════ KPIs DERIVADOS ═══════════════════════

  // Projetos
  const totalProjects = filteredProjects.length;
  const activeProjects = filteredProjects.filter(p => p.status === 'active').length;
  const completedProjects = filteredProjects.filter(p => p.status === 'completed').length;
  const onHoldProjects = filteredProjects.filter(p => p.status === 'on_hold').length;

  // Tarefas
  const totalTasks = filteredTasks.length;
  const overdueTasks = filteredTasks.filter(
    t => t.due_date && t.status !== 'done' && new Date(t.due_date + 'T00:00:00') < today
  );
  const doneTasks = filteredTasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalEstHours = filteredTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);

  // Hatched bar: status breakdown
  const statusSegments: HatchedBarSegment[] = useMemo(() =>
    statusList
      .map((s, i) => ({
        label: s.label,
        value: filteredTasks.filter(t => t.status === s.key).length,
        hatched: i % 2 === 1,
      }))
      .filter(s => s.value > 0),
  [filteredTasks]);

  // Heatmap: workload por membro nos próximos 14 dias
  const heatmap = useMemo(() => {
    const days = eachDayOfInterval({ start: today, end: addDays(today, 13) });
    const dayKeys = days.map(d => format(d, 'yyyy-MM-dd'));
    const columnLabels = days.map(d => format(d, 'dd'));

    const grid: Record<string, Record<string, number>> = {};
    filteredTasks.forEach(t => {
      if (!t.assigned_to || !t.due_date || t.status === 'done') return;
      const dKey = t.due_date;
      if (!dayKeys.includes(dKey)) return;
      if (!grid[t.assigned_to]) grid[t.assigned_to] = {};
      grid[t.assigned_to][dKey] = (grid[t.assigned_to][dKey] || 0) + (t.estimated_hours || 1);
    });

    const memberTotals = Object.entries(grid)
      .map(([uid, daysMap]) => ({ uid, total: Object.values(daysMap).reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const rows: HeatmapRow[] = memberTotals.map(({ uid }) => {
      const fullName = memberMap[uid] || uid.slice(0, 4);
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0]?.toUpperCase() || '')
        .join('');
      return {
        label: initials || fullName.slice(0, 3).toUpperCase(),
        cells: dayKeys.map(d => grid[uid][d] || 0),
      };
    });

    return { rows, columnLabels };
  }, [filteredTasks, memberMap]);

  // Tabela: Tarefas Atrasadas
  const overdueRows = useMemo(() =>
    overdueTasks
      .map(t => {
        const cid = resolveTaskClientId(t);
        return {
          title: t.title,
          project: projectMap[t.project_id || '']?.name || '-',
          client: (cid && clientMap[cid]) || '-',
          responsible: t.assigned_to_name || (t.assigned_to ? memberMap[t.assigned_to] : null) || '-',
          dueDate: t.due_date!,
          daysOverdue: differenceInDays(today, new Date(t.due_date + 'T00:00:00')),
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
  [overdueTasks, projectMap, memberMap, clientMap, contribuinteToClient]);

  // Tabela: Carga por Membro
  const memberRows = useMemo(() => {
    const memberStats: Record<string, { active: number; hours: number; overdue: number }> = {};
    filteredTasks.forEach(t => {
      const uid = t.assigned_to;
      if (!uid) return;
      if (!memberStats[uid]) memberStats[uid] = { active: 0, hours: 0, overdue: 0 };
      if (t.status !== 'done') {
        memberStats[uid].active++;
        memberStats[uid].hours += t.estimated_hours || 0;
        if (t.due_date && new Date(t.due_date + 'T00:00:00') < today) {
          memberStats[uid].overdue++;
        }
      }
    });
    return Object.entries(memberStats)
      .map(([uid, s]) => ({ name: memberMap[uid] || uid.slice(0, 8), ...s }))
      .sort((a, b) => b.active - a.active);
  }, [filteredTasks, memberMap]);

  // Top clientes por horas estimadas
  // Resolve o cliente via: task.client_id → task.contribuinte_id → projeto (external_client_id / contribuinte_id)
  const topClients = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredTasks.forEach(t => {
      if (!t.estimated_hours) return;
      const cid = resolveTaskClientId(t);
      if (!cid) return;
      acc[cid] = (acc[cid] || 0) + t.estimated_hours;
    });
    return Object.entries(acc)
      .map(([cid, hours]) => ({ name: clientMap[cid] || 'Sem cliente', hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }, [filteredTasks, clientMap, contribuinteToClient, projectMap]);

  // Distribuição por área
  const areaSegments: HatchedBarSegment[] = useMemo(() => {
    const tasksByArea: Record<string, number> = {};
    filteredTasks.forEach(t => {
      const proj = projectMap[t.project_id || ''];
      const areaName = proj?.estrutura_area_id ? (areaMap[proj.estrutura_area_id] || 'Sem área') : 'Sem área';
      tasksByArea[areaName] = (tasksByArea[areaName] || 0) + 1;
    });
    return Object.entries(tasksByArea)
      .map(([name, count], i) => ({ label: name, value: count, hatched: i % 2 === 1 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTasks, projectMap, areaMap]);

  // Clientes/projetos que aparecem nos filtros (ordenados)
  const sortedClients = useMemo(() => [...clients].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [clients]);
  const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name)), [projects]);
  const sortedMembers = useMemo(() =>
    [...members].sort((a, b) => (`${a.first_name || ''}`).localeCompare(`${b.first_name || ''}`)),
  [members]);
  const sortedAreas = useMemo(() => [...areas].sort((a, b) => a.name.localeCompare(b.name)), [areas]);

  return (
    <FiscalLayout title="Dashboard" subtitle="Visão geral da área fiscal — atualizado em tempo real">
      <div className="space-y-6">
        {/* ═══════════════════════ BARRA DE FILTROS ═══════════════════════ */}
        <Card className="border-slate-200/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-teal-600" />
              Filtros Estratégicos
              {activeFiltersCount > 0 && (
                <Badge className="bg-teal-100 text-teal-700 border-0 text-[10px] ml-1">
                  {activeFiltersCount} {activeFiltersCount === 1 ? 'ativo' : 'ativos'}
                </Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs text-slate-600 hover:text-teal-700 h-8">
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar tudo
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Linha 1: Período + Urgência + Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500 flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" />
                  Vencimento de
                </Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Vencimento até</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Urgência</Label>
                <Select value={filterUrgency} onValueChange={(v) => setFilterUrgency(v as UrgencyFilter)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    <SelectItem value="overdue">🔴 Atrasadas</SelectItem>
                    <SelectItem value="next_7">📅 Próximos 7 dias</SelectItem>
                    <SelectItem value="next_30">📆 Próximos 30 dias</SelectItem>
                    <SelectItem value="no_due">— Sem prazo definido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Status da Tarefa</Label>
                <Select value={filterTaskStatus} onValueChange={setFilterTaskStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {statusList.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Status do Projeto</Label>
                <Select value={filterProjectStatus} onValueChange={setFilterProjectStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="on_hold">Pausado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Cliente + Projeto + Responsável + Área */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Cliente</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os clientes</SelectItem>
                    {sortedClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Projeto</Label>
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os projetos</SelectItem>
                    {sortedProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Responsável</Label>
                <Select value={filterMember} onValueChange={setFilterMember}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
                    {sortedMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.id.slice(0, 6)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Área Fiscal</Label>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas as áreas</SelectItem>
                    {sortedAreas.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 uppercase tracking-wide">Atalhos:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { handleClearFilters(); setFilterUrgency('overdue'); }}
                className="h-7 text-[11px] border-red-200 text-red-700 hover:bg-red-50"
              >
                🔴 Apenas atrasadas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { handleClearFilters(); setFilterUrgency('next_7'); }}
                className="h-7 text-[11px] border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                📅 Próximos 7 dias
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { handleClearFilters(); setFilterTaskStatus('in_progress'); }}
                className="h-7 text-[11px] border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                ⚡ Em progresso
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { handleClearFilters(); setFilterProjectStatus('active'); setFilterTaskStatus('todo'); }}
                className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                📋 Backlog ativo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════ LINHA 1 — KPIs HERO ═══════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiHero
            label="Projetos Ativos"
            value={activeProjects}
            icon={<FolderKanban className="h-3.5 w-3.5" />}
            variation={totalProjects > 0 ? { value: Math.round((activeProjects / totalProjects) * 100), label: 'do portfólio' } : undefined}
            loading={isLoading}
          />
          <KpiHero
            label="Taxa de Conclusão"
            value={`${completionRate}%`}
            icon={<CheckCircle className="h-3.5 w-3.5" />}
            variation={completionRate > 0 ? { value: completionRate, label: 'tarefas concluídas' } : undefined}
            loading={isLoading}
          />
          <KpiHero
            label="Tarefas Atrasadas"
            value={overdueTasks.length}
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            variation={overdueTasks.length > 0 ? { value: -overdueTasks.length, label: 'requerem ação' } : undefined}
            loading={isLoading}
          />
          <KpiHero
            label="Horas Planejadas"
            value={`${totalEstHours.toFixed(0)}h`}
            icon={<Clock className="h-3.5 w-3.5" />}
            variation={totalTasks > 0 ? { value: Math.round(totalEstHours / totalTasks), label: 'h média/tarefa' } : undefined}
            variant="solid"
            loading={isLoading}
          />
        </div>

        {/* LINHA 2 — Hero Banner + KPIs secundários */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HeroBanner
            className="lg:col-span-2"
            eyebrow="PSA Tax"
            title={overdueTasks.length === 0
              ? 'Operação fiscal sem atrasos — momentum alto'
              : `${overdueTasks.length} tarefas precisam de atenção`}
            description={activeFiltersCount > 0
              ? `Visão com ${activeFiltersCount} filtro(s) aplicado(s). ${totalTasks} tarefas no recorte atual.`
              : overdueTasks.length === 0
              ? 'Todas as tarefas estão dentro do prazo. Mantenha o ritmo da execução e a aderência à agenda planejada.'
              : 'Identifique as tarefas com maior atraso e re-priorize. A tabela abaixo mostra o ranking por dias de atraso.'}
            icon={<Sparkles className="h-6 w-6 text-white" />}
          />

          <div className="grid grid-cols-2 gap-4">
            <KpiHero
              label="Total Projetos"
              value={totalProjects}
              icon={<FolderKanban className="h-3.5 w-3.5" />}
              loading={isLoading}
            />
            <KpiHero
              label="Concluídos"
              value={completedProjects}
              icon={<CheckCircle className="h-3.5 w-3.5" />}
              loading={isLoading}
            />
            <KpiHero
              label="Pausados"
              value={onHoldProjects}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              loading={isLoading}
            />
            <KpiHero
              label="Total Tarefas"
              value={totalTasks}
              icon={<ListChecks className="h-3.5 w-3.5" />}
              loading={isLoading}
            />
          </div>
        </div>

        {/* LINHA 3 — Hatched Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-teal-600" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <LoadingSpinner />
              ) : statusSegments.length === 0 ? (
                <EmptyMsg msg="Nenhuma tarefa no recorte atual" />
              ) : (
                <HatchedBar segments={statusSegments} />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-teal-600" />
                Distribuição por Área Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <LoadingSpinner />
              ) : areaSegments.length === 0 ? (
                <EmptyMsg msg="Sem dados de área" />
              ) : (
                <HatchedBar segments={areaSegments} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* LINHA 4 — Heatmap + Top Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-slate-200/60 shadow-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600" />
                Workload por Membro · próximos 14 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <LoadingSpinner />
              ) : heatmap.rows.length === 0 ? (
                <EmptyMsg msg="Sem atribuições no recorte atual" />
              ) : (
                <WorkloadHeatmap rows={heatmap.rows} columnLabels={heatmap.columnLabels} />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                Top Clientes · Horas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {isLoading ? (
                <LoadingSpinner />
              ) : topClients.length === 0 ? (
                <EmptyMsg msg="Sem horas estimadas" />
              ) : (
                <ul className="space-y-3">
                  {topClients.map((c, i) => {
                    const max = topClients[0].hours || 1;
                    const pct = (c.hours / max) * 100;
                    return (
                      <li key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{c.name}</span>
                          <span className="text-xs text-slate-500 tabular-nums">{c.hours.toFixed(0)}h</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LINHA 5 — Tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Tarefas Atrasadas
              </CardTitle>
              {overdueRows.length > 0 && (
                <Badge className="bg-red-50 text-red-700 border-0 text-[10px]">{overdueRows.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSpinner />
              ) : overdueRows.length === 0 ? (
                <EmptyMsg msg="Nenhuma tarefa atrasada no recorte atual" />
              ) : (
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase tracking-wide text-slate-500">Tarefa</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wide text-slate-500">Cliente</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wide text-slate-500">Resp.</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide text-slate-500">Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueRows.slice(0, 15).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium max-w-[180px] truncate">{r.title}</TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-[120px] truncate">{r.client}</TableCell>
                          <TableCell className="text-xs text-slate-600">{r.responsible}</TableCell>
                          <TableCell className="text-sm font-bold text-red-600 text-right tabular-nums">{r.daysOverdue}d</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600" />
                Carga por Membro
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingSpinner />
              ) : memberRows.length === 0 ? (
                <EmptyMsg msg="Sem dados de atribuição" />
              ) : (
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase tracking-wide text-slate-500">Membro</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide text-slate-500">Ativas</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide text-slate-500">Horas</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide text-slate-500">Atrasadas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{r.name}</TableCell>
                          <TableCell className="text-sm text-slate-600 text-right tabular-nums">{r.active}</TableCell>
                          <TableCell className="text-sm text-slate-600 text-right tabular-nums">{r.hours > 0 ? `${r.hours}h` : '-'}</TableCell>
                          <TableCell className={`text-sm font-bold text-right tabular-nums ${r.overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>{r.overdue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FiscalLayout>
  );
};

function LoadingSpinner() {
  return (
    <div className="h-32 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-sm text-slate-500">{msg}</p>
    </div>
  );
}

export default FiscalDashboard;
