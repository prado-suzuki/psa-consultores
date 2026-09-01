import type { RefObject } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Paperclip } from 'lucide-react';
import { dataHoraCurta } from '@/lib/dateUtils';
import { AssignAgentCell } from '@/components/chamados/AssignAgentCell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TicketListItem } from '@/hooks/useTickets';
import { activityLabels, departmentLabels, statusLabels } from '@/lib/equipeChamados';
import { chamadoAtividadeConfig, chamadoStatusConfig } from '@/lib/chamadoStatusColors';
import type { SortColumn, SortDirection } from '@/lib/equipeChamados';
import { PrazoBadge } from '@/components/chamados/equipe/PrazoBadge';

interface EquipeChamadosTableProps {
  tickets: TicketListItem[];
  canAssignTickets: boolean;
  areaMap: Map<string, string>;
  clusterMap: Map<string, string>;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onNavigate: (ticketId: string) => void;
  onAssign: (ticketId: string, agentId: string | null, agentName: string | null) => void;
  scrollRef: RefObject<HTMLDivElement>;
}

export function EquipeChamadosTable({ tickets, canAssignTickets, areaMap, clusterMap, sortColumn, sortDirection, onSort, onNavigate, onAssign, scrollRef }: EquipeChamadosTableProps) {
  const sortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };
  const sortableHead = (label: string, column: SortColumn, className = '') => (
    <TableHead className={`cursor-pointer ${className}`} onClick={() => onSort(column)}>
      <div className="flex items-center">{label}{sortIcon(column)}</div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chamados</CardTitle>
        <CardDescription>{tickets.length} chamado(s) encontrado(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table containerRef={scrollRef}>
          <TableHeader>
            <TableRow>
              {sortableHead('Status', 'status')}
              {sortableHead('Título', 'title', 'min-w-[200px]')}
              {sortableHead('ID', 'id')}
              {sortableHead('Departamento', 'department')}
              <TableHead>Área</TableHead>
              <TableHead>Cluster</TableHead>
              {sortableHead('Representante', 'created_by')}
              <TableHead>Cliente</TableHead>
              {sortableHead('Última Atualização', 'updated_at')}
              {sortableHead('Prazo', 'prazo')}
              {canAssignTickets && <TableHead>Responsável</TableHead>}
              {sortableHead('Atividade', 'activity_status')}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell><Badge className={chamadoStatusConfig(ticket.status).solid}>{statusLabels[ticket.status] || ticket.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate(ticket.id)} className="text-left font-medium text-primary hover:underline focus:outline-none">{ticket.title}</button>
                    {!!ticket.attachment_count && ticket.attachment_count > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1 text-xs"><Paperclip className="h-3 w-3" />{ticket.attachment_count}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{ticket.id.slice(0, 8)}...</TableCell>
                <TableCell><span className="text-sm">{departmentLabels[ticket.department] || ticket.department || '-'}</span></TableCell>
                <TableCell><span className="text-sm">{ticket.estrutura_area_id ? areaMap.get(ticket.estrutura_area_id) || '—' : '—'}</span></TableCell>
                <TableCell><span className="text-sm">{ticket.cluster_id ? clusterMap.get(ticket.cluster_id) || '—' : '—'}</span></TableCell>
                <TableCell><span className="text-sm">{ticket.profiles ? `${ticket.profiles.first_name} ${ticket.profiles.last_name}` : '-'}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{ticket.cliente_nome || '—'}</span></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{dataHoraCurta(ticket.updated_at)}</span></TableCell>
                <TableCell><PrazoBadge ticket={ticket} /></TableCell>
                {canAssignTickets && (
                  <TableCell>
                    <AssignAgentCell
                      ticketId={ticket.id}
                      clusterId={ticket.cluster_id}
                      value={ticket.assigned_to || null}
                      valueName={ticket.agent ? `${ticket.agent.first_name ?? ''} ${ticket.agent.last_name ?? ''}` : null}
                      onAssign={onAssign}
                    />
                  </TableCell>
                )}
                <TableCell>
                  {ticket.activity_status && (
                    <Badge variant="outline" className={chamadoAtividadeConfig(ticket.activity_status).badge}>
                      {activityLabels[ticket.activity_status] || ticket.activity_status}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <FloatingScrollbar targetRef={scrollRef} />
      </CardContent>
    </Card>
  );
}
