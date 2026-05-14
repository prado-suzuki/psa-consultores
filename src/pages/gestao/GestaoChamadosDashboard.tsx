import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTicketsList,
  useTicketAgents,
  useTicketsFirstResponse,
  type TicketListItem,
} from '@/hooks/useTickets';
import { useAllActiveAreas, useAllActiveClusters } from '@/hooks/useEstruturaAreas';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  HatchedBar,
  HeroBanner,
  KpiHero,
  type HatchedBarSegment,
} from '@/components/dashboard/momentum';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Cloud,
  ListChecks,
  MessageSquare,
  PieChart,
  Timer,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { isWithinInterval, subDays } from 'date-fns';
import { isTodayBrazil } from '@/lib/dateUtils';

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

const periodoLabels: Record<string, string> = {
  todas: 'Todas as datas',
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
  '90dias': 'Últimos 90 dias',
};

// Vocabulário fiscal curado — cada tópico é detectado por regex que cobre variações
// de grafia (com/sem hífen, com/sem acento). Add-only: novas siglas aqui aparecem
// automaticamente na nuvem assim que houver menção em algum chamado.
interface TaxTopic {
  label: string;
  patterns: RegExp[];
}

const TAX_TOPICS: TaxTopic[] = [
  { label: 'ICMS', patterns: [/\bicms\b/i] },
  { label: 'ICMS-ST', patterns: [/\bicms[-\s]?st\b/i, /substitui[çc][aã]o\s+tribut[aá]ria/i, /\bsubst\.\s*trib\b/i] },
  { label: 'DIFAL', patterns: [/\bdifal\b/i, /diferencial\s+de\s+al[ií]quota/i] },
  { label: 'IPI', patterns: [/\bipi\b/i] },
  { label: 'PIS', patterns: [/\bpis\b/i] },
  { label: 'COFINS', patterns: [/\bcofins\b/i] },
  { label: 'IRPJ', patterns: [/\birpj\b/i] },
  { label: 'CSLL', patterns: [/\bcsll\b/i] },
  { label: 'IRRF', patterns: [/\birrf\b/i] },
  { label: 'ISS', patterns: [/\biss\b/i, /\bissqn\b/i] },
  { label: 'INSS', patterns: [/\binss\b/i] },
  { label: 'FGTS', patterns: [/\bfgts\b/i] },
  { label: 'Simples Nacional', patterns: [/simples\s+nacional/i, /\bsimples\b/i] },
  { label: 'Lucro Real', patterns: [/lucro\s+real/i] },
  { label: 'Lucro Presumido', patterns: [/lucro\s+presumido/i] },
  { label: 'Reforma Tributária', patterns: [/reforma\s+tribut[aá]ria/i, /\bibs\b/i, /\bcbs\b/i] },
  { label: 'SPED', patterns: [/\bsped\b/i] },
  { label: 'EFD', patterns: [/\befd\b/i, /efd[\s-]?contribui/i, /efd[\s-]?icms/i] },
  { label: 'ECD', patterns: [/\becd\b/i] },
  { label: 'ECF', patterns: [/\becf\b/i] },
  { label: 'DCTF', patterns: [/\bdctf\b/i] },
  { label: 'PERDCOMP', patterns: [/perdcomp/i, /per\/dcomp/i] },
  { label: 'NF-e', patterns: [/\bnf[-\s]?e\b/i, /nota\s+fiscal\s+eletr[oô]nica/i] },
  { label: 'NFS-e', patterns: [/\bnfs[-\s]?e\b/i] },
  { label: 'CT-e', patterns: [/\bct[-\s]?e\b/i] },
  { label: 'NCM', patterns: [/\bncm\b/i] },
  { label: 'CFOP', patterns: [/\bcfop\b/i] },
  { label: 'CST', patterns: [/\bcst\b/i] },
  { label: 'Crédito Fiscal', patterns: [/cr[eé]dito\s+fiscal/i, /cr[eé]dito\s+tribut/i, /aproveitamento\s+de\s+cr[eé]dito/i] },
  { label: 'Compensação', patterns: [/compensa[çc][aã]o/i] },
  { label: 'Restituição', patterns: [/restitui[çc][aã]o/i] },
  { label: 'Apuração', patterns: [/apura[çc][aã]o/i] },
  { label: 'Auditoria', patterns: [/auditoria/i] },
  { label: 'Balancete', patterns: [/balancet/i] },
  { label: 'Folha', patterns: [/folha\s+de\s+pagamento/i, /\bdctfweb\b/i, /\besocial\b/i] },
  { label: 'Produtor Rural', patterns: [/produtor\s+rural/i] },
  { label: 'Exportação', patterns: [/exporta[çc][aã]o/i] },
  { label: 'Importação', patterns: [/importa[çc][aã]o/i] },
  { label: 'Retenção', patterns: [/reten[çc][aã]o/i] },
  { label: 'Parcelamento', patterns: [/parcelamento/i] },
];

function fmtHorasOuDias(horas: number): string {
  if (!isFinite(horas) || horas <= 0) return '—';
  if (horas < 1) {
    const min = Math.round(horas * 60);
    return `${min} min`;
  }
  if (horas < 48) return `${horas.toFixed(1)}h`;
  return `${(horas / 24).toFixed(1)}d`;
}

interface RankingRow {
  key: string;
  label: string;
  total: number;
  respondidos: number;
  resolvidos: number;
  tempoMedioRespostaHoras: number | null;
}

export default function GestaoChamadosDashboard() {
  const navigate = useNavigate();

  const { data: tickets = [], isLoading: loadingTickets } = useTicketsList();
  const { data: agents = [] } = useTicketAgents();
  const { data: firstResponseMap } = useTicketsFirstResponse();
  const { data: areasData = [] } = useAllActiveAreas();
  const { data: clustersData = [] } = useAllActiveClusters();

  const areaMap = useMemo(() => {
    const m = new Map<string, string>();
    areasData.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [areasData]);

  const clusterMap = useMemo(() => {
    const m = new Map<string, string>();
    clustersData.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clustersData]);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    agents.forEach((a) =>
      m.set(a.id, `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || '—'),
    );
    return m;
  }, [agents]);

  const [filters, setFilters] = useState({
    periodo: '30dias',
    departamento: 'todos',
    area: 'todos',
    cluster: 'todos',
  });

  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter((t) => {
      if (filters.periodo !== 'todas') {
        const d = new Date(t.created_at);
        switch (filters.periodo) {
          case 'hoje':
            if (!isTodayBrazil(d)) return false;
            break;
          case '7dias':
            if (!isWithinInterval(d, { start: subDays(now, 7), end: now })) return false;
            break;
          case '30dias':
            if (!isWithinInterval(d, { start: subDays(now, 30), end: now })) return false;
            break;
          case '90dias':
            if (!isWithinInterval(d, { start: subDays(now, 90), end: now })) return false;
            break;
        }
      }
      if (filters.departamento !== 'todos' && t.department !== filters.departamento) return false;
      if (filters.area !== 'todos' && t.estrutura_area_id !== filters.area) return false;
      if (filters.cluster !== 'todos' && t.cluster_id !== filters.cluster) return false;
      return true;
    });
  }, [tickets, filters]);

  const responseHoursByTicket = useMemo(() => {
    const map = new Map<string, number>();
    if (!firstResponseMap) return map;
    filteredTickets.forEach((t) => {
      const fr = firstResponseMap.get(t.id);
      if (!fr) return;
      const diffMs = new Date(fr.created_at).getTime() - new Date(t.created_at).getTime();
      if (diffMs >= 0) map.set(t.id, diffMs / (1000 * 60 * 60));
    });
    return map;
  }, [filteredTickets, firstResponseMap]);

  const resolutionHoursByTicket = useMemo(() => {
    const map = new Map<string, number>();
    filteredTickets.forEach((t) => {
      if (!t.closed_at) return;
      const diffMs = new Date(t.closed_at).getTime() - new Date(t.created_at).getTime();
      if (diffMs >= 0) map.set(t.id, diffMs / (1000 * 60 * 60));
    });
    return map;
  }, [filteredTickets]);

  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const respondidos = filteredTickets.filter((t) => firstResponseMap?.has(t.id)).length;
    const semResposta = total - respondidos;
    const resolvidos = filteredTickets.filter(
      (t) => t.status === 'resolvido' || t.status === 'fechado',
    ).length;
    const abertos = filteredTickets.filter((t) => t.status === 'aberto').length;
    const emAndamento = filteredTickets.filter((t) => t.status === 'em_andamento').length;

    const respostaHoras = Array.from(responseHoursByTicket.values());
    const tempoMedioResposta =
      respostaHoras.length > 0
        ? respostaHoras.reduce((s, h) => s + h, 0) / respostaHoras.length
        : 0;

    const resolucaoHoras = Array.from(resolutionHoursByTicket.values());
    const tempoMedioResolucao =
      resolucaoHoras.length > 0
        ? resolucaoHoras.reduce((s, h) => s + h, 0) / resolucaoHoras.length
        : 0;

    const taxaResposta = total > 0 ? Math.round((respondidos / total) * 100) : 0;

    return {
      total,
      respondidos,
      semResposta,
      resolvidos,
      abertos,
      emAndamento,
      tempoMedioResposta,
      tempoMedioResolucao,
      taxaResposta,
    };
  }, [filteredTickets, firstResponseMap, responseHoursByTicket, resolutionHoursByTicket]);

  const statusSegments: HatchedBarSegment[] = useMemo(() => {
    const counts = {
      aberto: 0,
      em_andamento: 0,
      resolvido: 0,
      fechado: 0,
    };
    filteredTickets.forEach((t) => {
      if (t.status in counts) counts[t.status as keyof typeof counts]++;
    });
    return [
      { label: 'Aberto', value: counts.aberto },
      { label: 'Em Andamento', value: counts.em_andamento, hatched: true },
      { label: 'Resolvido', value: counts.resolvido },
      { label: 'Fechado', value: counts.fechado, hatched: true },
    ].filter((s) => s.value > 0);
  }, [filteredTickets]);

  const departmentSegments: HatchedBarSegment[] = useMemo(() => {
    const counts = new Map<string, number>();
    filteredTickets.forEach((t) => {
      const key = t.department || 'outros';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], idx) => ({
        label: departmentLabels[key] ?? key,
        value,
        hatched: idx % 2 === 1,
      }));
  }, [filteredTickets]);

  const buildRanking = (
    keyOf: (t: TicketListItem) => string | null | undefined,
    labelOf: (t: TicketListItem, key: string) => string,
  ): RankingRow[] => {
    const groups = new Map<string, TicketListItem[]>();
    filteredTickets.forEach((t) => {
      const k = keyOf(t);
      if (!k) return;
      const list = groups.get(k) ?? [];
      list.push(t);
      groups.set(k, list);
    });

    return Array.from(groups.entries())
      .map(([key, list]) => {
        const respondidos = list.filter((t) => firstResponseMap?.has(t.id)).length;
        const resolvidos = list.filter(
          (t) => t.status === 'resolvido' || t.status === 'fechado',
        ).length;
        const horas = list
          .map((t) => responseHoursByTicket.get(t.id))
          .filter((h): h is number => h !== undefined);
        const tempoMedio = horas.length > 0 ? horas.reduce((s, h) => s + h, 0) / horas.length : null;
        return {
          key,
          label: labelOf(list[0], key),
          total: list.length,
          respondidos,
          resolvidos,
          tempoMedioRespostaHoras: tempoMedio,
        };
      })
      .sort((a, b) => b.total - a.total);
  };

  const rankingResponsaveis = useMemo(() => {
    if (!firstResponseMap) return [] as RankingRow[];
    const groups = new Map<string, { tickets: TicketListItem[]; horas: number[] }>();
    filteredTickets.forEach((t) => {
      const fr = firstResponseMap.get(t.id);
      const responderId = fr?.user_id ?? t.assigned_to ?? null;
      if (!responderId) return;
      const bucket = groups.get(responderId) ?? { tickets: [], horas: [] };
      bucket.tickets.push(t);
      const h = responseHoursByTicket.get(t.id);
      if (h !== undefined) bucket.horas.push(h);
      groups.set(responderId, bucket);
    });

    return Array.from(groups.entries())
      .map(([userId, { tickets: list, horas }]) => ({
        key: userId,
        label: agentMap.get(userId) ?? 'Usuário interno',
        total: list.length,
        respondidos: list.filter((t) => firstResponseMap.has(t.id)).length,
        resolvidos: list.filter((t) => t.status === 'resolvido' || t.status === 'fechado').length,
        tempoMedioRespostaHoras:
          horas.length > 0 ? horas.reduce((s, h) => s + h, 0) / horas.length : null,
      }))
      .sort((a, b) => b.respondidos - a.respondidos || b.total - a.total);
  }, [filteredTickets, firstResponseMap, responseHoursByTicket, agentMap]);

  const rankingClientes = useMemo(
    () =>
      buildRanking(
        (t) => t.cliente_nome ?? null,
        (_t, key) => key,
      ),
    [filteredTickets, firstResponseMap, responseHoursByTicket],
  );

  const rankingRepresentantes = useMemo(
    () =>
      buildRanking(
        (t) => t.user_id ?? null,
        (t) => `${t.profiles?.first_name ?? ''} ${t.profiles?.last_name ?? ''}`.trim() || '—',
      ),
    [filteredTickets, firstResponseMap, responseHoursByTicket],
  );

  const rankingDepartamentos = useMemo(
    () =>
      buildRanking(
        (t) => t.department ?? null,
        (_t, key) => departmentLabels[key] ?? key,
      ),
    [filteredTickets, firstResponseMap, responseHoursByTicket],
  );

  const rankingAreas = useMemo(
    () =>
      buildRanking(
        (t) => t.estrutura_area_id ?? null,
        (_t, key) => areaMap.get(key) ?? '—',
      ),
    [filteredTickets, firstResponseMap, responseHoursByTicket, areaMap],
  );

  const taxTopicsCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredTickets.forEach((t) => {
      const text = `${t.title ?? ''} ${t.description ?? ''}`;
      if (!text.trim()) return;
      TAX_TOPICS.forEach(({ label, patterns }) => {
        if (patterns.some((p) => p.test(text))) {
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      });
    });
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  const isLoading = loadingTickets || firstResponseMap === undefined;

  return (
    <GestaoLayout
      title="Dashboard de Chamados"
      subtitle="Panorama operacional, prazos e responsáveis"
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/gestao/chamados')}
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Lista de chamados
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filtros */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Período
              </Label>
              <Select
                value={filters.periodo}
                onValueChange={(v) => setFilters({ ...filters, periodo: v })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(periodoLabels).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Departamento
              </Label>
              <Select
                value={filters.departamento}
                onValueChange={(v) => setFilters({ ...filters, departamento: v })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(departmentLabels).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Área
              </Label>
              <Select
                value={filters.area}
                onValueChange={(v) => setFilters({ ...filters, area: v })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {areasData.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Cluster
              </Label>
              <Select
                value={filters.cluster}
                onValueChange={(v) => setFilters({ ...filters, cluster: v })}
              >
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clustersData.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KpiHero
            label="Total"
            value={stats.total}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            variation={{ label: periodoLabels[filters.periodo] ?? '' }}
            loading={isLoading}
          />
          <KpiHero
            label="Respondidos"
            value={stats.respondidos}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            variation={{
              value: stats.taxaResposta,
              label: `taxa de resposta`,
            }}
            loading={isLoading}
          />
          <KpiHero
            label="Sem Resposta"
            value={stats.semResposta}
            icon={<Clock className="h-3.5 w-3.5" />}
            variation={{ label: 'aguardando 1ª resposta' }}
            loading={isLoading}
          />
          <KpiHero
            label="Resolvidos"
            value={stats.resolvidos}
            icon={<UserCheck className="h-3.5 w-3.5" />}
            variation={{ label: 'fechados ou resolvidos' }}
            loading={isLoading}
          />
          <KpiHero
            label="Tempo Médio Resposta"
            value={fmtHorasOuDias(stats.tempoMedioResposta)}
            icon={<Timer className="h-3.5 w-3.5" />}
            variation={{ label: 'até a primeira resposta' }}
            loading={isLoading}
          />
          <KpiHero
            label="Tempo Médio Resolução"
            value={fmtHorasOuDias(stats.tempoMedioResolucao)}
            icon={<Timer className="h-3.5 w-3.5" />}
            variant="solid"
            variation={{ label: 'até o fechamento' }}
            loading={isLoading}
          />
        </div>

        {/* Hero + Distribuições */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <HeroBanner
            className="lg:col-span-1"
            eyebrow="Visão Gerencial"
            title="Acompanhe a saúde dos chamados"
            description="Use os filtros acima para isolar período, departamento, área e cluster — todos os KPIs e rankings reagem em tempo real."
            ctaLabel="Abrir lista completa"
            onCta={() => navigate('/gestao/chamados')}
            icon={<PieChart className="h-6 w-6 text-white" />}
          />

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Distribuição por Status</h3>
              <Badge variant="secondary" className="ml-auto text-[11px]">
                {stats.total}
              </Badge>
            </div>
            {statusSegments.length > 0 ? (
              <HatchedBar segments={statusSegments} height={48} />
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">
                Sem chamados no recorte atual.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Distribuição por Departamento</h3>
              <Badge variant="secondary" className="ml-auto text-[11px]">
                {departmentSegments.length}
              </Badge>
            </div>
            {departmentSegments.length > 0 ? (
              <HatchedBar segments={departmentSegments} height={48} />
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">
                Sem chamados no recorte atual.
              </p>
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RankingCard
            title="Responsáveis pela 1ª Resposta"
            icon={<Trophy className="h-4 w-4 text-teal-600" />}
            description="Quem mais respondeu chamados no recorte"
            rows={rankingResponsaveis}
            emptyHint="Nenhum chamado respondido ainda."
            metricLabel="respondidos"
            showResponseTime
            highlightField="respondidos"
          />

          <RankingCard
            title="Clientes com Mais Chamados"
            icon={<Building2 className="h-4 w-4 text-teal-600" />}
            description="Empresas que mais geraram demandas"
            rows={rankingClientes}
            emptyHint="Nenhum cliente identificado."
            metricLabel="chamados"
          />

          <RankingCard
            title="Representantes (quem abriu)"
            icon={<Users className="h-4 w-4 text-teal-600" />}
            description="Usuários do portal que mais abriram chamados"
            rows={rankingRepresentantes}
            emptyHint="Sem dados de representantes."
            metricLabel="chamados"
          />

          <RankingCard
            title="Departamentos"
            icon={<ListChecks className="h-4 w-4 text-teal-600" />}
            description="Carga e tempo de resposta por departamento"
            rows={rankingDepartamentos}
            emptyHint="Sem dados de departamento."
            metricLabel="chamados"
            showResponseTime
          />

          {rankingAreas.length > 0 && (
            <RankingCard
              title="Áreas Internas"
              icon={<PieChart className="h-4 w-4 text-teal-600" />}
              description="Distribuição por área da estrutura"
              rows={rankingAreas}
              emptyHint="Sem áreas atribuídas."
              metricLabel="chamados"
              showResponseTime
              className="lg:col-span-2"
            />
          )}
        </div>

        {/* Nuvem de Tópicos Fiscais */}
        <TaxTopicsCloud topics={taxTopicsCounts} totalTickets={filteredTickets.length} />
      </div>
    </GestaoLayout>
  );
}

interface TaxTopicsCloudProps {
  topics: { label: string; value: number }[];
  totalTickets: number;
}

function TaxTopicsCloud({ topics, totalTickets }: TaxTopicsCloudProps) {
  const max = topics[0]?.value ?? 0;
  const min = topics[topics.length - 1]?.value ?? 0;
  const range = Math.max(1, max - min);

  const sizeFor = (value: number) => {
    const t = (value - min) / range;
    return 12 + Math.round(t * 28); // 12px .. 40px
  };

  const weightFor = (value: number) => {
    const t = (value - min) / range;
    if (t > 0.75) return 700;
    if (t > 0.4) return 600;
    return 500;
  };

  const colorFor = (value: number) => {
    const t = (value - min) / range;
    if (t > 0.75) return 'text-teal-700';
    if (t > 0.5) return 'text-teal-600';
    if (t > 0.25) return 'text-teal-500';
    return 'text-slate-500';
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-teal-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Nuvem de Tópicos Fiscais</h3>
            <p className="text-[11px] text-slate-500">
              Termos tributários mais mencionados nos chamados (título + descrição)
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {topics.length} {topics.length === 1 ? 'tópico' : 'tópicos'}
        </Badge>
      </div>

      {topics.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">
          {totalTickets === 0
            ? 'Sem chamados no recorte atual.'
            : 'Nenhum termo fiscal identificado nos chamados deste recorte.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl bg-gradient-to-br from-slate-50 via-white to-teal-50/40 px-4 py-6 min-h-[160px]">
            {topics.map((t) => (
              <span
                key={t.label}
                className={`inline-flex items-baseline gap-1 leading-none tracking-tight transition-transform hover:scale-110 ${colorFor(
                  t.value,
                )}`}
                style={{
                  fontSize: `${sizeFor(t.value)}px`,
                  fontWeight: weightFor(t.value),
                  fontFamily: "'Instrument Sans', system-ui, sans-serif",
                }}
                title={`${t.label} — ${t.value} ${t.value === 1 ? 'chamado' : 'chamados'}`}
              >
                {t.label}
                <sup className="text-[10px] font-medium text-slate-400 tabular-nums">{t.value}</sup>
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-400">
            <span>menos citado</span>
            <span className="h-2 w-2 rounded-sm bg-slate-300" />
            <span className="h-2 w-2 rounded-sm bg-teal-300" />
            <span className="h-2 w-2 rounded-sm bg-teal-500" />
            <span className="h-2 w-2 rounded-sm bg-teal-700" />
            <span>mais citado</span>
          </div>
        </>
      )}
    </div>
  );
}

interface RankingCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  rows: RankingRow[];
  emptyHint: string;
  metricLabel: string;
  showResponseTime?: boolean;
  highlightField?: 'total' | 'respondidos';
  className?: string;
}

function RankingCard({
  title,
  description,
  icon,
  rows,
  emptyHint,
  metricLabel,
  showResponseTime = false,
  highlightField = 'total',
  className,
}: RankingCardProps) {
  const topRows = rows.slice(0, 8);
  const max = Math.max(1, ...topRows.map((r) => (highlightField === 'respondidos' ? r.respondidos : r.total)));

  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ${className ?? ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500">{description}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {rows.length}
        </Badge>
      </div>

      {topRows.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">{emptyHint}</p>
      ) : (
        <ul className="space-y-2.5">
          {topRows.map((row, idx) => {
            const value = highlightField === 'respondidos' ? row.respondidos : row.total;
            const pct = Math.round((value / max) * 100);
            return (
              <li key={row.key}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {idx + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-slate-800">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {showResponseTime && (
                      <span className="text-slate-500 tabular-nums" title="Tempo médio até 1ª resposta">
                        <Timer className="mr-0.5 inline h-3 w-3 align-[-2px]" />
                        {row.tempoMedioRespostaHoras !== null
                          ? fmtHorasOuDias(row.tempoMedioRespostaHoras)
                          : '—'}
                      </span>
                    )}
                    <span className="font-semibold tabular-nums text-slate-900">
                      {value}
                      <span className="ml-1 text-[10px] font-normal text-slate-500">
                        {metricLabel}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {highlightField === 'total' && row.respondidos !== row.total && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    {row.respondidos} respondido(s)
                    {row.resolvidos > 0 && ` · ${row.resolvidos} resolvido(s)`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rows.length > topRows.length && (
        <div className="mt-3 flex justify-end">
          <span className="text-[11px] text-slate-400">
            +{rows.length - topRows.length} fora do top {topRows.length}
            <ArrowRight className="ml-1 inline h-3 w-3" />
          </span>
        </div>
      )}
    </div>
  );
}
