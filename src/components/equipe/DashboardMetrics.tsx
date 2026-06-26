import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SprintHoursDashboard } from '@/components/sprint/SprintHoursDashboard';
import { X } from 'lucide-react';

interface Deliverable {
  id: string;
  title: string;
  assigned_to: string | null;
  due_date: string;
  estimated_hours: number | null;
  status: string;
  parent_id: string | null;
  sprint_id: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface SprintOption {
  id: string;
  name: string;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DashboardMetrics() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('__none__');
  const [filterMonth, setFilterMonth] = useState<string>('__none__');
  const [filterMetricsPerson, setFilterMetricsPerson] = useState<string>('__none__');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Apenas sprints ativas
      const { data: sprintsData } = await supabase
        .from('sprints')
        .select('id, name')
        .eq('status', 'active')
        .order('name', { ascending: true });

      const activeSprints = sprintsData || [];
      setSprints(activeSprints);

      if (activeSprints.length > 0) {
        const sprintIds = activeSprints.map((s) => s.id);
        const { data: deliverablesData } = await supabase
          .from('sprint_deliverables')
          .select('*')
          .in('sprint_id', sprintIds)
          .order('due_date', { ascending: true });
        setDeliverables(deliverablesData || []);
      } else {
        setDeliverables([]);
      }

      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name');
      setProfiles(profilesData || []);
    } catch (error) {
      console.error('Error fetching metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Deliverables da(s) sprint(s) selecionada(s)
  const sprintScopedDeliverables = useMemo(() => {
    if (sprintFilter === 'all') return deliverables;
    return deliverables.filter((d) => d.sprint_id === sprintFilter);
  }, [deliverables, sprintFilter]);

  // Mesma lógica de filtros do detalhe da sprint
  const matchesFilter = (d: Deliverable): boolean => {
    if (filterResponsible !== 'all' && d.assigned_to !== filterResponsible) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  };

  // Inclui tarefas-pai cujas subtarefas correspondem ao filtro
  const filteredDeliverables = useMemo(() => {
    const directMatches = new Set(sprintScopedDeliverables.filter(matchesFilter).map((d) => d.id));
    const parentIdsOfMatchingSubtasks = new Set<string>();
    sprintScopedDeliverables.forEach((d) => {
      if (d.parent_id && directMatches.has(d.id)) {
        parentIdsOfMatchingSubtasks.add(d.parent_id);
      }
    });
    return sprintScopedDeliverables.filter(
      (d) => directMatches.has(d.id) || parentIdsOfMatchingSubtasks.has(d.id)
    );
  }, [sprintScopedDeliverables, filterResponsible, filterStatus]);

  const deliverablesWithHours = useMemo(
    () => sprintScopedDeliverables.filter((d) => d.estimated_hours && d.estimated_hours > 0 && d.due_date),
    [sprintScopedDeliverables]
  );

  const availableYears = useMemo(() => {
    const years = [...new Set(deliverablesWithHours.map((d) => new Date(d.due_date).getFullYear().toString()))];
    return years.sort();
  }, [deliverablesWithHours]);

  const availableMonths = useMemo(() => {
    const filtered = filterYear !== '__none__'
      ? deliverablesWithHours.filter((d) => new Date(d.due_date).getFullYear().toString() === filterYear)
      : deliverablesWithHours;
    const months = [...new Set(filtered.map((d) => new Date(d.due_date).getMonth().toString()))];
    return months.sort((a, b) => Number(a) - Number(b));
  }, [deliverablesWithHours, filterYear]);

  const uniqueResponsibles = useMemo(() => {
    const responsibleIds = [...new Set(sprintScopedDeliverables.map((d) => d.assigned_to).filter(Boolean))] as string[];
    return responsibleIds
      .map((id) => {
        const profile = profiles.find((p) => p.id === id);
        return profile ? { id: profile.id, name: `${profile.first_name} ${profile.last_name}`.trim() } : null;
      })
      .filter(Boolean) as { id: string; name: string }[];
  }, [sprintScopedDeliverables, profiles]);

  const availableMetricsPeople = useMemo(() => {
    const ids = [...new Set(deliverablesWithHours.map((d) => d.assigned_to).filter(Boolean))] as string[];
    const profileMap: Record<string, string> = {};
    profiles.forEach((p) => { profileMap[p.id] = `${p.first_name} ${p.last_name}`; });
    return ids.map((id) => ({ id, name: profileMap[id] || 'Sem nome' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [deliverablesWithHours, profiles]);

  const metricsFilteredDeliverables = useMemo(() => {
    return filteredDeliverables.filter((d) => {
      if (!d.due_date) return true;
      const date = new Date(d.due_date);
      if (filterYear !== '__none__' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== '__none__' && date.getMonth().toString() !== filterMonth) return false;
      if (filterMetricsPerson !== '__none__' && d.assigned_to !== filterMetricsPerson) return false;
      return true;
    });
  }, [filteredDeliverables, filterYear, filterMonth, filterMetricsPerson]);

  const hasActiveFilters =
    sprintFilter !== 'all' ||
    filterResponsible !== 'all' ||
    filterStatus !== 'all' ||
    filterYear !== '__none__' ||
    filterMonth !== '__none__' ||
    filterMetricsPerson !== '__none__';

  const clearFilters = () => {
    setSprintFilter('all');
    setFilterResponsible('all');
    setFilterStatus('all');
    setFilterYear('__none__');
    setFilterMonth('__none__');
    setFilterMetricsPerson('__none__');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12 text-sm">
        Nenhuma sprint ativa para exibir métricas.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={sprintFilter} onValueChange={setSprintFilter}>
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterResponsible} onValueChange={setFilterResponsible}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {uniqueResponsibles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setFilterMonth('__none__'); }}>
          <SelectTrigger className="w-[100px] h-8 text-xs bg-white">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Ano</SelectItem>
            {availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[100px] h-8 text-xs bg-white">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Mês</SelectItem>
            {availableMonths.map((m) => <SelectItem key={m} value={m}>{MONTH_NAMES[Number(m)]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterMetricsPerson} onValueChange={setFilterMetricsPerson}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
            <SelectValue placeholder="Pessoa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Pessoa</SelectItem>
            {availableMetricsPeople.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <SprintHoursDashboard deliverables={metricsFilteredDeliverables} profiles={profiles} />
    </div>
  );
}
