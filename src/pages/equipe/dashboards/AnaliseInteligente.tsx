import { useEffect, useMemo, useState } from 'react';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { AnaliseInteligenteAnalysis } from '@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis';
import { AnaliseInteligenteCharts } from '@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteCharts';
import { AnaliseInteligenteFilters } from '@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteFilters';
import { AnaliseInteligenteKpis } from '@/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteKpis';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useDomainAnaliseInteligenteData } from '@/hooks/useDomainAnaliseInteligenteData';
import { useDomainAnaliseInteligenteAnalysis } from '@/hooks/useDomainAnaliseInteligenteAnalysis';
import {
  ANALISE_INTELIGENTE_ALL,
  buildAnaliseInteligenteKpis,
  buildDailysPorSemana,
  buildEntregasPorSemana,
  buildHorasPorSprint,
  buildStatusData,
  filterAnaliseInteligenteData,
  type AnaliseInteligenteAnalysis as AnaliseInteligenteAnalysisData,
} from '@/lib/analiseInteligente';
import {
  exportAnaliseInteligentePdf,
  loadAnaliseInteligenteLogo,
} from '@/lib/analiseInteligenteExport';
import { FileDown, RefreshCw, Sparkles } from 'lucide-react';

const ALL = ANALISE_INTELIGENTE_ALL;

const AnaliseInteligente = () => {
  const { data, isFetching, error: dataError } = useDomainAnaliseInteligenteData();
  const analysisMutation = useDomainAnaliseInteligenteAnalysis();
  const analyzing = analysisMutation.isPending;
  const { sprints, projects, processes, deliverables, dailys, improvements } = data;
  const [analise, setAnalise] = useState<AnaliseInteligenteAnalysisData | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sprintFilter, setSprintFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);
  const [processFilter, setProcessFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  useEffect(() => {
    loadAnaliseInteligenteLogo(setLogoBase64).catch(() => {
      // silent fail — PDF still works
    });
  }, []);

  useEffect(() => {
    if (!dataError) return;
    console.error('Erro carregando dados:', dataError);
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar os dados.',
      variant: 'destructive',
    });
  }, [dataError]);

  const filters = useMemo(
    () => ({
      startDate,
      endDate,
      sprintFilter,
      projectFilter,
      processFilter,
      categoryFilter,
    }),
    [startDate, endDate, sprintFilter, projectFilter, processFilter, categoryFilter],
  );
  const filtered = useMemo(() => filterAnaliseInteligenteData(data, filters), [data, filters]);
  const kpis = useMemo(
    () => buildAnaliseInteligenteKpis(filtered, improvements),
    [filtered, improvements],
  );
  const entregasPorSemana = useMemo(
    () => buildEntregasPorSemana(filtered.deliverablesF),
    [filtered.deliverablesF],
  );
  const statusData = useMemo(() => buildStatusData(kpis), [kpis]);
  const horasPorSprint = useMemo(() => buildHorasPorSprint(filtered), [filtered]);
  const dailysPorSemana = useMemo(() => buildDailysPorSemana(filtered.dailysF), [filtered.dailysF]);
  const categoryOptions = Array.from(
    new Set(
      processes.map((process) => process.area).filter((area): area is string => Boolean(area)),
    ),
  );

  const scoreColor =
    kpis.score >= 75 ? 'text-emerald-600' : kpis.score >= 50 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = kpis.score >= 75 ? '#10b981' : kpis.score >= 50 ? '#f59e0b' : '#ef4444';
  const extraCostLabel = `R$ ${(kpis.extraCost / 1000).toFixed(1)}k`;
  const riskBadge = analise
    ? {
        baixo: { className: 'bg-emerald-100 text-emerald-700', label: 'Risco Baixo' },
        medio: { className: 'bg-amber-100 text-amber-700', label: 'Risco Médio' },
        alto: { className: 'bg-red-100 text-red-700', label: 'Risco Alto' },
      }[analise.nivel_risco]
    : { className: '', label: '' };

  const handleAnalisar = async () => {
    setAnalise(null);
    try {
      const result = await analysisMutation.mutateAsync(filters);
      setAnalise(result);
      toast({ title: 'Análise gerada', description: 'Insights estratégicos atualizados.' });
    } catch (error: unknown) {
      console.error('Erro na análise:', error);
      toast({
        title: 'Erro ao gerar análise',
        description: error instanceof Error ? error.message : 'Falha inesperada.',
        variant: 'destructive',
      });
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSprintFilter(ALL);
    setProjectFilter(ALL);
    setProcessFilter(ALL);
    setCategoryFilter(ALL);
  };

  const exportarPDF = () => {
    const exported = exportAnaliseInteligentePdf({
      analise,
      kpis,
      logoBase64,
      startDate,
      endDate,
      scoreBg,
    });
    if (!exported) {
      toast({
        title: 'Bloqueado',
        description: 'Permita pop-ups para exportar o PDF.',
        variant: 'destructive',
      });
    }
  };

  return (
    <EquipeLayout
      title="Análise Inteligente"
      subtitle="Dashboard estratégico de Sprints & Dailys (powered by Claude AI)"
      headerActions={
        <div className="flex gap-2">
          <Button
            onClick={handleAnalisar}
            disabled={analyzing}
            className="bg-primary hover:bg-primary/90"
          >
            {analyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {analyzing ? 'Analisando…' : 'Gerar Análise IA'}
          </Button>
          <Button
            variant="outline"
            onClick={exportarPDF}
            className="border-teal-600 text-teal-600 hover:bg-teal-50"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <AnaliseInteligenteFilters
          allValue={ALL}
          startDate={startDate}
          endDate={endDate}
          sprintFilter={sprintFilter}
          projectFilter={projectFilter}
          processFilter={processFilter}
          categoryFilter={categoryFilter}
          sprints={sprints}
          projects={projects}
          processes={processes}
          categoryOptions={categoryOptions}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSprintFilterChange={setSprintFilter}
          onProjectFilterChange={setProjectFilter}
          onProcessFilterChange={setProcessFilter}
          onCategoryFilterChange={setCategoryFilter}
          onClearFilters={handleClearFilters}
        />

        {isFetching ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-teal-600" />
          </div>
        ) : (
          <>
            <AnaliseInteligenteKpis
              kpis={kpis}
              scoreColor={scoreColor}
              extraCostLabel={extraCostLabel}
            />
            {analise && (
              <AnaliseInteligenteAnalysis
                analise={analise}
                analyzing={analyzing}
                riskBadgeClassName={riskBadge.className}
                riskBadgeLabel={riskBadge.label}
                onAnalyze={handleAnalisar}
              />
            )}
            <AnaliseInteligenteCharts
              entregasPorSemana={entregasPorSemana}
              statusData={statusData}
              horasPorSprint={horasPorSprint}
              dailysPorSemana={dailysPorSemana}
            />
            {!analise && (
              <AnaliseInteligenteAnalysis
                analise={analise}
                analyzing={analyzing}
                riskBadgeClassName={riskBadge.className}
                riskBadgeLabel={riskBadge.label}
                onAnalyze={handleAnalisar}
              />
            )}
          </>
        )}
      </div>
    </EquipeLayout>
  );
};

export default AnaliseInteligente;
