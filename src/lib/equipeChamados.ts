import { isWithinInterval, startOfMonth, subDays } from 'date-fns';
import { isTodayBrazil } from '@/lib/dateUtils';
import { isChamadoEncerrado } from '@/lib/chamadosStatus';
import type { TicketListItem } from '@/hooks/useTickets';

export type SortDirection = 'asc' | 'desc' | null;
export type SortColumn =
  | 'status'
  | 'title'
  | 'id'
  | 'department'
  | 'created_by'
  | 'updated_at'
  | 'prazo'
  | 'activity_status'
  | null;

export interface EquipeChamadosFilters {
  periodo: string;
  status: string;
  prioridade: string;
  departamento: string;
  area: string;
  cluster: string;
  searchId: string;
}

export interface PrazoInfo {
  dias?: number;
  horas?: number;
  prazoExpirado?: boolean;
  prazoHoje?: boolean;
  tipo: 'expirado' | 'urgente' | 'atencao' | 'normal' | 'concluido' | 'aguardando_cliente';
}

export const statusColors: Record<string, string> = {
  aberto: 'bg-blue-500 hover:bg-blue-600',
  em_andamento: 'bg-yellow-500 hover:bg-yellow-600',
  resolvido: 'bg-green-500 hover:bg-green-600',
  fechado: 'bg-gray-500 hover:bg-gray-600',
};

export const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

export const activityLabels: Record<string, string> = {
  aguardando_resposta: 'Aguardando resposta',
  respondido: 'Respondido',
  em_analise: 'Em análise',
};

export const activityColors: Record<string, string> = {
  aguardando_resposta: 'bg-orange-100 text-orange-800',
  respondido: 'bg-green-100 text-green-800',
  em_analise: 'bg-blue-100 text-blue-800',
};

export const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

export function createEquipeChamadosFilters(defaultCluster: string): EquipeChamadosFilters {
  return {
    periodo: 'todas',
    status: 'todos',
    prioridade: 'todas',
    departamento: 'todos',
    area: 'todos',
    cluster: defaultCluster,
    searchId: '',
  };
}

export function calcularPrazoResposta(
  dataCriacao: string,
  dataAtualizacao: string,
  status: string,
  activityStatus: string | null,
  deadline: string | null = null,
  hoje = new Date(),
): PrazoInfo {
  // Só `fechado` é conclusão. `resolvido` é a janela de aceite de 3 dias, então
  // cai na regra de baixo e aparece como "aguardando cliente" — que é o estado
  // real do chamado nesse período. Ver src/lib/chamadosStatus.ts.
  if (isChamadoEncerrado(status)) return { tipo: 'concluido' };
  if (activityStatus === 'respondido') return { tipo: 'aguardando_cliente' };

  let prazoFinal: Date;
  if (deadline) {
    prazoFinal = new Date(`${deadline}T23:59:59`);
  } else {
    const referencia = activityStatus === 'aguardando_resposta' ? dataAtualizacao : dataCriacao;
    prazoFinal = new Date(referencia);
    prazoFinal.setDate(prazoFinal.getDate() + 5);
  }

  const diffTime = prazoFinal.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    dias: diffDays,
    horas: Math.ceil(diffTime / (1000 * 60 * 60)),
    prazoExpirado: diffTime < 0,
    prazoHoje: diffDays === 0 && diffTime > 0,
    tipo: diffTime < 0 ? 'expirado' : diffDays <= 1 ? 'urgente' : diffDays <= 2 ? 'atencao' : 'normal',
  };
}

function prazoSortValue(prazo: PrazoInfo) {
  if (prazo.tipo === 'concluido') return 999;
  if (prazo.tipo === 'aguardando_cliente') return 998;
  if (prazo.tipo === 'expirado') return -(prazo.dias || 0);
  return prazo.dias || 0;
}

function ticketSortValue(ticket: TicketListItem, column: Exclude<SortColumn, 'prazo' | null>) {
  switch (column) {
    case 'status': return ticket.status;
    case 'title': return ticket.title.toLowerCase();
    case 'id': return ticket.id;
    case 'department': return ticket.department || '';
    case 'created_by': return `${ticket.profiles?.first_name || ''} ${ticket.profiles?.last_name || ''}`.toLowerCase();
    case 'updated_at': return new Date(ticket.updated_at).getTime();
    case 'activity_status': return ticket.activity_status || '';
  }
}

export function filterAndSortTickets(
  tickets: TicketListItem[],
  filters: EquipeChamadosFilters,
  mostrarUrgentes: boolean,
  sortColumn: SortColumn,
  sortDirection: SortDirection,
  now = new Date(),
) {
  let filtered = [...tickets];
  if (filters.periodo !== 'todas') {
    filtered = filtered.filter((ticket) => {
      const date = new Date(ticket.created_at);
      if (filters.periodo === 'hoje') return isTodayBrazil(date);
      if (filters.periodo === '7dias') return isWithinInterval(date, { start: subDays(now, 7), end: now });
      if (filters.periodo === '30dias') return isWithinInterval(date, { start: subDays(now, 30), end: now });
      if (filters.periodo === 'mes') return isWithinInterval(date, { start: startOfMonth(now), end: now });
      return true;
    });
  }
  if (filters.status !== 'todos') filtered = filtered.filter((ticket) => ticket.status === filters.status);
  if (filters.prioridade !== 'todas') filtered = filtered.filter((ticket) => ticket.priority === filters.prioridade);
  if (filters.departamento !== 'todos') filtered = filtered.filter((ticket) => ticket.department === filters.departamento);
  if (filters.area !== 'todos') filtered = filtered.filter((ticket) => ticket.estrutura_area_id === filters.area);
  if (filters.cluster !== 'todos') filtered = filtered.filter((ticket) => ticket.cluster_id === filters.cluster);
  if (filters.searchId) {
    const searchId = filters.searchId.toLowerCase();
    filtered = filtered.filter((ticket) => ticket.id.toLowerCase().includes(searchId));
  }
  if (mostrarUrgentes) {
    filtered = filtered.filter((ticket) => {
      if (ticket.status === 'resolvido' || ticket.status === 'fechado') return false;
      const prazo = calcularPrazoResposta(ticket.created_at, ticket.updated_at, ticket.status, ticket.activity_status, ticket.deadline, now);
      return prazo.tipo === 'expirado' || (prazo.dias !== undefined && prazo.dias <= 2);
    });
  }
  if (!sortColumn || !sortDirection) return filtered;
  return filtered.sort((a, b) => {
    const aValue = sortColumn === 'prazo'
      ? prazoSortValue(calcularPrazoResposta(a.created_at, a.updated_at, a.status, a.activity_status, a.deadline, now))
      : ticketSortValue(a, sortColumn);
    const bValue = sortColumn === 'prazo'
      ? prazoSortValue(calcularPrazoResposta(b.created_at, b.updated_at, b.status, b.activity_status, b.deadline, now))
      : ticketSortValue(b, sortColumn);
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

export function getTicketStats(tickets: TicketListItem[]) {
  return {
    total: tickets.length,
    abertos: tickets.filter((ticket) => ticket.status === 'aberto').length,
    emAndamento: tickets.filter((ticket) => ticket.status === 'em_andamento').length,
    resolvidos: tickets.filter((ticket) => ticket.status === 'resolvido' || ticket.status === 'fechado').length,
  };
}
