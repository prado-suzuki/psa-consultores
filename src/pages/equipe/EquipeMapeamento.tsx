import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, RefreshCw, Plus } from 'lucide-react';
import { useProcessMapping, STAGE_TO_STATUS } from '@/hooks/useProcessMapping';
import { MetricsCards } from '@/components/equipe/mapeamento/MetricsCards';
import { AreaAccordion } from '@/components/equipe/mapeamento/AreaAccordion';
import { ProcessSpreadsheet } from '@/components/equipe/mapeamento/ProcessSpreadsheet';
import { ScenarioList } from '@/components/equipe/mapeamento/ScenarioList';
import { ScenarioCreateModal } from '@/components/equipe/mapeamento/ScenarioCreateModal';

type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed';
type MappingFilter = 'all' | 'mapped' | 'not_mapped';

export default function EquipeMapeamento() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { processes, metrics, byArea, loading, error, refresh } = useProcessMapping();

  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [mappingFilter, setMappingFilter] = useState<MappingFilter>('all');
  const [activeTab, setActiveTab] = useState<string>('por-area');
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [scenarioInitialProcessId, setScenarioInitialProcessId] = useState<string | undefined>(undefined);

  const openScenarioModal = (processId?: string) => {
    setScenarioInitialProcessId(processId);
    setScenarioModalOpen(true);
  };

  // Reage a query params: ?tab=cenarios&processId=X&action=new-scenario
  useEffect(() => {
    const tab = searchParams.get('tab');
    const processId = searchParams.get('processId') ?? undefined;
    const action = searchParams.get('action');

    if (tab) setActiveTab(tab);
    if (processId) setScenarioInitialProcessId(processId);
    if (action === 'new-scenario') {
      setScenarioModalOpen(true);
      // Limpa a query param de action pra não reabrir o modal ao fechar
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const areaOptions = useMemo(() => {
    return byArea
      .filter(a => a.group_id !== '__no_group__')
      .map(a => ({ id: a.group_id, name: a.area_name }));
  }, [byArea]);

  const filteredProcesses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return processes.filter(p => {
      if (areaFilter !== 'all' && p.display_group_id !== areaFilter) return false;
      const status = STAGE_TO_STATUS[p.stage] ?? 'in_progress';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (mappingFilter === 'mapped' && !p.has_mapping) return false;
      if (mappingFilter === 'not_mapped' && p.has_mapping) return false;
      if (term) {
        const haystack = `${p.code ?? ''} ${p.name} ${p.display_group_name}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [processes, search, areaFilter, statusFilter, mappingFilter]);

  const filteredAreas = useMemo(() => {
    if (areaFilter === 'all' && statusFilter === 'all' && mappingFilter === 'all' && !search) {
      return byArea;
    }
    const allowedIds = new Set(filteredProcesses.map(p => p.id));
    return byArea
      .map(a => ({ ...a, processes: a.processes.filter(p => allowedIds.has(p.id)) }))
      .filter(a => a.processes.length > 0)
      .map(a => {
        const total = a.processes.length;
        let not_started = 0;
        let in_progress = 0;
        let completed = 0;
        for (const p of a.processes) {
          const status = STAGE_TO_STATUS[p.stage] ?? 'in_progress';
          if (status === 'not_started') not_started++;
          else if (status === 'in_progress') in_progress++;
          else completed++;
        }
        return {
          ...a,
          total,
          not_started,
          in_progress,
          completed,
          completion_percent: total === 0 ? 0 : Math.round((completed / total) * 100),
        };
      });
  }, [byArea, filteredProcesses, areaFilter, statusFilter, mappingFilter, search]);

  return (
    <EquipeLayout
      title="Mapeamento de Processos"
      subtitle="Visualize, compare e priorize os processos da equipe num único lugar"
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => navigate('/equipe/processos')}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Processo
          </Button>
        </>
      }
    >
      {loading && processes.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-destructive">Erro ao carregar processos: {error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <MetricsCards metrics={metrics} />

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código ou área..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    {areaOptions.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="not_started">Não Iniciado</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={mappingFilter} onValueChange={(v: MappingFilter) => setMappingFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mapeamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="mapped">Apenas mapeados</SelectItem>
                    <SelectItem value="not_mapped">Apenas não mapeados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="por-area">Por Área</TabsTrigger>
              <TabsTrigger value="planilha">Planilha</TabsTrigger>
              <TabsTrigger value="cenarios">Cenários</TabsTrigger>
            </TabsList>

            <TabsContent value="por-area" className="space-y-3">
              <AreaAccordion areas={filteredAreas} />
            </TabsContent>

            <TabsContent value="planilha">
              <ProcessSpreadsheet processes={filteredProcesses} />
            </TabsContent>

            <TabsContent value="cenarios">
              <ScenarioList processes={processes} onCreateClick={openScenarioModal} />
            </TabsContent>
          </Tabs>

          <ScenarioCreateModal
            open={scenarioModalOpen}
            onClose={() => setScenarioModalOpen(false)}
            processes={processes}
            initialProcessId={scenarioInitialProcessId}
            onCreated={refresh}
          />
        </div>
      )}
    </EquipeLayout>
  );
}
