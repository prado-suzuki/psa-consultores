import { Badge } from '@/components/ui/badge';
import { calcularPrazoResposta } from '@/lib/equipeChamados';
import { chamadoPrazoBadge } from '@/lib/chamadoStatusColors';
import type { TicketListItem } from '@/hooks/useTickets';

export function PrazoBadge({ ticket }: { ticket: TicketListItem }) {
  const prazo = calcularPrazoResposta(ticket.created_at, ticket.updated_at, ticket.status, ticket.activity_status, ticket.deadline);
  const { className, texto } = chamadoPrazoBadge(prazo);
  return <Badge className={className}>{texto}</Badge>;
}
