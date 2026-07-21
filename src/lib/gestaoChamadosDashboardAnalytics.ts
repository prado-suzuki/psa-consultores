import { isWithinInterval, subDays } from 'date-fns';
import type { TicketFirstResponse, TicketListItem } from '@/hooks/useTickets';

export const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

export const periodoLabels: Record<string, string> = {
  todas: 'Todas as datas',
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
  '90dias': 'Últimos 90 dias',
};

export interface DashboardFilters {
  periodo: string;
  departamento: string;
  area: string;
  cluster: string;
}

export interface RankingRow {
  key: string;
  label: string;
  total: number;
  respondidos: number;
  resolvidos: number;
  tempoMedioRespostaHoras: number | null;
}

export interface DashboardSegment {
  label: string;
  value: number;
  hatched?: boolean;
}

export interface DashboardStats {
  total: number;
  respondidos: number;
  semResposta: number;
  resolvidos: number;
  abertos: number;
  emAndamento: number;
  tempoMedioResposta: number;
  tempoMedioResolucao: number;
  taxaResposta: number;
}

interface TaxTopic {
  label: string;
  patterns: RegExp[];
}

const TAX_TOPICS: TaxTopic[] = [
  { label: 'ICMS', patterns: [/\bicms\b/i] },
  {
    label: 'ICMS-ST',
    patterns: [/\bicms[-\s]?st\b/i, /substitui[çc][aã]o\s+tribut[aá]ria/i, /\bsubst\.\s*trib\b/i],
  },
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
  {
    label: 'Crédito Fiscal',
    patterns: [/cr[eé]dito\s+fiscal/i, /cr[eé]dito\s+tribut/i, /aproveitamento\s+de\s+cr[eé]dito/i],
  },
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

export function fmtHorasOuDias(horas: number): string {
  if (!Number.isFinite(horas) || horas <= 0) return '—';
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) return `${horas.toFixed(1)}h`;
  return `${(horas / 24).toFixed(1)}d`;
}

export function filterDashboardTickets(
  tickets: TicketListItem[],
  filters: DashboardFilters,
  now: Date,
): TicketListItem[] {
  return tickets.filter((ticket) => {
    const createdAt = new Date(ticket.created_at);
    if (
      filters.periodo === 'hoje' &&
      !(
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate()
      )
    )
      return false;
    const days =
      filters.periodo === '7dias'
        ? 7
        : filters.periodo === '30dias'
          ? 30
          : filters.periodo === '90dias'
            ? 90
            : null;
    if (days !== null && !isWithinInterval(createdAt, { start: subDays(now, days), end: now }))
      return false;
    if (filters.departamento !== 'todos' && ticket.department !== filters.departamento)
      return false;
    if (filters.area !== 'todos' && ticket.estrutura_area_id !== filters.area) return false;
    if (filters.cluster !== 'todos' && ticket.cluster_id !== filters.cluster) return false;
    return true;
  });
}

function elapsedHours(
  tickets: TicketListItem[],
  endFor: (ticket: TicketListItem) => string | undefined | null,
) {
  const result = new Map<string, number>();
  tickets.forEach((ticket) => {
    const end = endFor(ticket);
    if (!end) return;
    const diff = new Date(end).getTime() - new Date(ticket.created_at).getTime();
    if (diff >= 0) result.set(ticket.id, diff / (1000 * 60 * 60));
  });
  return result;
}

function average(values: Iterable<number>): number {
  const items = Array.from(values);
  return items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;
}

function isResolved(ticket: TicketListItem) {
  return ticket.status === 'resolvido' || ticket.status === 'fechado';
}

function buildRanking(
  tickets: TicketListItem[],
  firstResponses: Map<string, TicketFirstResponse> | undefined,
  responseHours: Map<string, number>,
  keyOf: (ticket: TicketListItem) => string | null | undefined,
  labelOf: (ticket: TicketListItem, key: string) => string,
): RankingRow[] {
  const groups = new Map<string, TicketListItem[]>();
  tickets.forEach((ticket) => {
    const key = keyOf(ticket);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), ticket]);
  });
  return Array.from(groups, ([key, items]) => {
    const hours = items.flatMap((ticket) => {
      const value = responseHours.get(ticket.id);
      return value === undefined ? [] : [value];
    });
    return {
      key,
      label: labelOf(items[0], key),
      total: items.length,
      respondidos: items.filter((ticket) => firstResponses?.has(ticket.id)).length,
      resolvidos: items.filter(isResolved).length,
      tempoMedioRespostaHoras: hours.length ? average(hours) : null,
    };
  }).sort((a, b) => b.total - a.total);
}

export function calculateDashboardAnalytics(
  tickets: TicketListItem[],
  firstResponses: Map<string, TicketFirstResponse> | undefined,
  agentNames: Map<string, string>,
  areaNames: Map<string, string>,
) {
  const responseHours = elapsedHours(
    tickets,
    (ticket) => firstResponses?.get(ticket.id)?.created_at,
  );
  const resolutionHours = elapsedHours(tickets, (ticket) => ticket.closed_at);
  const respondidos = tickets.filter((ticket) => firstResponses?.has(ticket.id)).length;
  const stats: DashboardStats = {
    total: tickets.length,
    respondidos,
    semResposta: tickets.length - respondidos,
    resolvidos: tickets.filter(isResolved).length,
    abertos: tickets.filter((ticket) => ticket.status === 'aberto').length,
    emAndamento: tickets.filter((ticket) => ticket.status === 'em_andamento').length,
    tempoMedioResposta: average(responseHours.values()),
    tempoMedioResolucao: average(resolutionHours.values()),
    taxaResposta: tickets.length ? Math.round((respondidos / tickets.length) * 100) : 0,
  };
  const statusCounts = { aberto: 0, em_andamento: 0, resolvido: 0, fechado: 0 };
  tickets.forEach((ticket) => {
    if (ticket.status in statusCounts) statusCounts[ticket.status as keyof typeof statusCounts]++;
  });
  const statusSegments: DashboardSegment[] = [
    { label: 'Aberto', value: statusCounts.aberto },
    { label: 'Em Andamento', value: statusCounts.em_andamento, hatched: true },
    { label: 'Resolvido', value: statusCounts.resolvido },
    { label: 'Fechado', value: statusCounts.fechado, hatched: true },
  ].filter((segment) => segment.value > 0);
  const departmentCounts = new Map<string, number>();
  tickets.forEach((ticket) => {
    const key = ticket.department || 'outros';
    departmentCounts.set(key, (departmentCounts.get(key) ?? 0) + 1);
  });
  const departmentSegments = Array.from(departmentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], index) => ({
      label: departmentLabels[key] ?? key,
      value,
      hatched: index % 2 === 1,
    }));

  const rankingResponsaveis: RankingRow[] = firstResponses
    ? Array.from(
        tickets.reduce((groups, ticket) => {
          const responderId = firstResponses.get(ticket.id)?.user_id ?? ticket.assigned_to ?? null;
          if (!responderId) return groups;
          groups.set(responderId, [...(groups.get(responderId) ?? []), ticket]);
          return groups;
        }, new Map<string, TicketListItem[]>()),
        ([userId, items]) => {
          const hours = items.flatMap((ticket) =>
            responseHours.has(ticket.id) ? [responseHours.get(ticket.id)!] : [],
          );
          return {
            key: userId,
            label: agentNames.get(userId) ?? 'Usuário interno',
            total: items.length,
            respondidos: items.filter((ticket) => firstResponses.has(ticket.id)).length,
            resolvidos: items.filter(isResolved).length,
            tempoMedioRespostaHoras: hours.length ? average(hours) : null,
          };
        },
      ).sort((a, b) => b.respondidos - a.respondidos || b.total - a.total)
    : [];

  const rank = (
    keyOf: (ticket: TicketListItem) => string | null | undefined,
    labelOf: (ticket: TicketListItem, key: string) => string,
  ) => buildRanking(tickets, firstResponses, responseHours, keyOf, labelOf);
  const topicCounts = new Map<string, number>();
  tickets.forEach((ticket) => {
    const text = `${ticket.title ?? ''} ${ticket.description ?? ''}`;
    if (!text.trim()) return;
    TAX_TOPICS.forEach(({ label, patterns }) => {
      if (patterns.some((pattern) => pattern.test(text)))
        topicCounts.set(label, (topicCounts.get(label) ?? 0) + 1);
    });
  });

  return {
    stats,
    statusSegments,
    departmentSegments,
    rankingResponsaveis,
    rankingClientes: rank(
      (ticket) => ticket.cliente_nome,
      (_ticket, key) => key,
    ),
    rankingRepresentantes: rank(
      (ticket) => ticket.user_id,
      (ticket) =>
        `${ticket.profiles?.first_name ?? ''} ${ticket.profiles?.last_name ?? ''}`.trim() || '—',
    ),
    rankingDepartamentos: rank(
      (ticket) => ticket.department,
      (_ticket, key) => departmentLabels[key] ?? key,
    ),
    rankingAreas: rank(
      (ticket) => ticket.estrutura_area_id,
      (_ticket, key) => areaNames.get(key) ?? '—',
    ),
    taxTopics: Array.from(topicCounts, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value,
    ),
  };
}
