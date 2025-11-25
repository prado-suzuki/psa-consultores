import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-500',
  em_andamento: 'bg-yellow-500',
  resolvido: 'bg-green-500',
  fechado: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const priorityColors: Record<string, string> = {
  baixa: 'bg-gray-400',
  normal: 'bg-blue-400',
  alta: 'bg-orange-400',
  urgente: 'bg-red-500',
};

export default function AdminChamados() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (statusFilter === 'todos') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter((t) => t.status === statusFilter));
    }
  }, [statusFilter, tickets]);

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch profiles separately
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
      
      const enrichedTickets = ticketsData?.map(ticket => ({
        ...ticket,
        profiles: profilesMap.get(ticket.user_id)
      })) || [];

      setTickets(enrichedTickets);
      setFilteredTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status do chamado foi atualizado com sucesso.',
      });

      fetchTickets();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Chamados</h1>
              <p className="text-muted-foreground mt-2">
                Visualize e responda todos os chamados dos clientes
              </p>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Abertos</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="resolvido">Resolvidos</SelectItem>
                <SelectItem value="fechado">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {statusFilter === 'todos'
                  ? 'Nenhum chamado encontrado.'
                  : `Nenhum chamado com status "${statusLabels[statusFilter]}".`}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {ticket.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Cliente: {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-3">
                          <Badge className={priorityColors[ticket.priority]}>
                            {ticket.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aberto">Aberto</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="resolvido">Resolvido</SelectItem>
                            <SelectItem value="fechado">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/cliente/chamados/${ticket.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
