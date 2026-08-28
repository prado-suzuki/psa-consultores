import { isWithinInterval, subDays } from 'date-fns';
import type { TicketFirstResponse, TicketListItem } from '@/hooks/useTickets';

import { departmentLabels } from '@/lib/chamadosDepartamentos';

// Reexportado porque as telas de chamado importam o rotulo daqui desde antes de
// a lista virar fonte unica; quebrar esses imports nao traria nada.
export { departmentLabels };

export const periodoLabels: Record<string, string> = {
  todas: 'Todas as datas',
  canal: 'Desde o início do canal',
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
  '90dias': 'Últimos 90 dias',
};

/**
 * Data em que o canal de chamados passou a ser atendido de verdade.
 *
 * O que existe antes disso é o histórico importado do sistema legado: os
 * chamados vieram com assunto, cliente e data de abertura, mas sem as
 * mensagens — e portanto sem data de primeira resposta. Medir prazo sobre eles
 * não dá "atrasado", dá "sem resposta" para tudo, o que afunda qualquer
 * indicador de SLA. O período "Desde o início do canal" existe para separar
 * atendimento de carga sem depender de nenhuma marca no banco.
 */
export const INICIO_CANAL_CHAMADOS = new Date('2026-04-01T00:00:00-03:00');

export interface DashboardFilters {
  periodo: string;
  cliente: string;
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
  noPrazo: number;
  foraPrazo: number;
  taxaNoPrazo: number;
}

export type SituacaoPrazo = 'dentro' | 'fora' | 'sem_resposta';

/**
 * Data-limite de um chamado para efeito de PRIMEIRA RESPOSTA.
 *
 * Espelha as regras de `calcularPrazoResposta` (`@/lib/equipeChamados`) — prazo
 * do chamado até o fim do dia, ou abertura + 5 dias quando ele não tem — com
 * uma diferença deliberada: lá o cálculo é ao vivo e pergunta "está atrasado
 * agora?", por isso usa `updated_at` enquanto o chamado aguarda resposta. Aqui
 * a pergunta é histórica: contra que data a primeira resposta deveria ter
 * chegado. Essa data não pode andar depois do fato, então a referência é sempre
 * a abertura.
 */
export function prazoPrimeiraResposta(ticket: TicketListItem): Date {
  if (ticket.deadline) return new Date(`${ticket.deadline}T23:59:59`);
  const prazo = new Date(ticket.created_at);
  prazo.setDate(prazo.getDate() + 5);
  return prazo;
}

/** Se a primeira resposta da equipe chegou antes do prazo do chamado. */
export function situacaoPrazo(
  ticket: TicketListItem,
  firstResponses: Map<string, TicketFirstResponse> | undefined,
): SituacaoPrazo {
  const resposta = firstResponses?.get(ticket.id);
  if (!resposta) return 'sem_resposta';
  return new Date(resposta.created_at) <= prazoPrimeiraResposta(ticket) ? 'dentro' : 'fora';
}

/** Recortes de prazo que o dashboard abre em tabela ao clicar no KPI. */
export type RecortePrazo = Extract<SituacaoPrazo, 'fora' | 'sem_resposta'>;

export interface ChamadoPrazoRow {
  id: string;
  titulo: string;
  cliente: string;
  /**
   * Quem respondeu, quando houve resposta. Sem resposta, cai para quem está
   * designado — que na aba de sem resposta é justamente de quem se cobra.
   */
  responsavel: string;
  abertoEm: string;
  prazo: Date;
  respondidoEm: string | null;
  /**
   * Dias entre o prazo e a primeira resposta. Para quem ainda não respondeu, a
   * conta corre até agora — e fica negativa enquanto o prazo não venceu, que é
   * como se distingue "atrasado" de "ainda dá tempo" na fila em aberto.
   */
  atrasoDias: number;
}

/** Os chamados por trás do número do KPI, do mais atrasado para o menos. */
export function listarChamadosPorPrazo(
  tickets: TicketListItem[],
  firstResponses: Map<string, TicketFirstResponse> | undefined,
  agentNames: Map<string, string>,
  recorte: RecortePrazo,
  now: Date,
): ChamadoPrazoRow[] {
  return tickets
    .filter((ticket) => situacaoPrazo(ticket, firstResponses) === recorte)
    .map((ticket) => {
      const prazo = prazoPrimeiraResposta(ticket);
      const resposta = firstResponses?.get(ticket.id);
      const respondidoEm = resposta?.created_at ?? null;
      const referencia = respondidoEm ? new Date(respondidoEm) : now;
      // Mesmo encadeamento do ranking de responsáveis: quem respondeu manda, e
      // o designado é o retrato de quem responde por ele enquanto ninguém respondeu.
      const responsavelId = resposta?.user_id ?? ticket.assigned_to;
      return {
        id: ticket.id,
        titulo: ticket.title,
        cliente: ticket.cliente_nome ?? '—',
        responsavel: responsavelId ? (agentNames.get(responsavelId) ?? 'Usuário interno') : '—',
        abertoEm: ticket.created_at,
        prazo,
        respondidoEm,
        atrasoDias: (referencia.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24),
      };
    })
    .sort((a, b) => b.atrasoDias - a.atrasoDias);
}

/**
 * Quem mais respondeu fora do prazo, montado a partir das MESMAS linhas que a
 * tabela de atraso mostra — o card e a tabela não podem divergir, e sairiam
 * divergentes se cada um refizesse a conta do seu jeito.
 *
 * `tempoMedioRespostaHoras` aqui carrega o atraso médio, não o tempo de
 * resposta; o card que consome este ranking rotula o relógio de acordo.
 */
export function rankingAtrasoPorPessoa(linhasForaDoPrazo: ChamadoPrazoRow[]): RankingRow[] {
  const grupos = new Map<string, number[]>();
  linhasForaDoPrazo.forEach((linha) => {
    if (linha.responsavel === '—') return;
    grupos.set(linha.responsavel, [...(grupos.get(linha.responsavel) ?? []), linha.atrasoDias]);
  });
  return Array.from(grupos, ([nome, atrasos]) => ({
    key: nome,
    label: nome,
    total: atrasos.length,
    respondidos: atrasos.length,
    resolvidos: 0,
    tempoMedioRespostaHoras: average(atrasos) * 24,
  })).sort((a, b) => b.total - a.total || b.tempoMedioRespostaHoras! - a.tempoMedioRespostaHoras!);
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
    if (filters.periodo === 'canal' && createdAt < INICIO_CANAL_CHAMADOS) return false;
    if (filters.cliente !== 'todos' && ticket.cliente_nome !== filters.cliente) return false;
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
  equipePorPessoa: Map<string, string>,
) {
  const responseHours = elapsedHours(
    tickets,
    (ticket) => firstResponses?.get(ticket.id)?.created_at,
  );
  const resolutionHours = elapsedHours(tickets, (ticket) => ticket.closed_at);
  const respondidos = tickets.filter((ticket) => firstResponses?.has(ticket.id)).length;
  const noPrazo = tickets.filter(
    (ticket) => situacaoPrazo(ticket, firstResponses) === 'dentro',
  ).length;
  const foraPrazo = tickets.filter(
    (ticket) => situacaoPrazo(ticket, firstResponses) === 'fora',
  ).length;
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
    noPrazo,
    foraPrazo,
    // Sobre os RESPONDIDOS, não sobre o total: um chamado ainda sem resposta não
    // cumpriu nem descumpriu prazo, e somá-lo ao denominador faria a taxa cair
    // só porque a fila cresceu.
    taxaNoPrazo: respondidos ? Math.round((noPrazo / respondidos) * 100) : 0,
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
    // O chamado não guarda equipe, então ela vem de quem atendeu — quem
    // respondeu primeiro, ou o designado enquanto ninguém respondeu.
    rankingEquipes: rank(
      (ticket) => {
        const responsavelId = firstResponses?.get(ticket.id)?.user_id ?? ticket.assigned_to;
        return responsavelId ? equipePorPessoa.get(responsavelId) : null;
      },
      (_ticket, key) => key,
    ),
    taxTopics: Array.from(topicCounts, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value,
    ),
  };
}
