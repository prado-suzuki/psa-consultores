import { Badge } from '@/components/ui/badge';
import { calcularPrazoResposta } from '@/lib/equipeChamados';
import type { TicketListItem } from '@/hooks/useTickets';

export function PrazoBadge({ ticket }: { ticket: TicketListItem }) {
  const prazo = calcularPrazoResposta(ticket.created_at, ticket.updated_at, ticket.status, ticket.activity_status, ticket.deadline);
  if (prazo.tipo === 'concluido') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Concluído</Badge>;
  if (prazo.tipo === 'aguardando_cliente') return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Aguardando Cliente</Badge>;
  if (prazo.tipo === 'expirado') return <Badge className="bg-red-500 text-white animate-pulse hover:bg-red-500">⚠️ ATRASADO {Math.abs(prazo.dias || 0)}d</Badge>;
  if (prazo.prazoHoje) return <Badge className="bg-orange-500 text-white hover:bg-orange-500">HOJE ({prazo.horas}h)</Badge>;
  if (prazo.tipo === 'urgente') return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Amanhã ({prazo.horas}h)</Badge>;
  if (prazo.tipo === 'atencao') return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{prazo.dias} dias</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{prazo.dias} dias</Badge>;
}
