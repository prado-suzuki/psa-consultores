import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { format, isToday, isWithinInterval, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
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

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

export default function AdminChamados() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    periodo: 'todas',
    status: 'todos',
    estado: 'todos',
    prioridade: 'todas',
    departamento: 'todos',
    searchId: '',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Filtro por período
    if (filters.periodo !== 'todas') {
      const now = new Date();
      filtered = filtered.filter(t => {
        const ticketDate = new Date(t.created_at);
        switch (filters.periodo) {
          case 'hoje':
            return isToday(ticketDate);
          case '7dias':
            return isWithinInterval(ticketDate, { start: subDays(now, 7), end: now });
          case '30dias':
            return isWithinInterval(ticketDate, { start: subDays(now, 30), end: now });
          case 'mes':
            return isWithinInterval(ticketDate, { start: startOfMonth(now), end: now });
          default:
            return true;
        }
      });
    }

    // Filtro por status
    if (filters.status !== 'todos') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Filtro por estado (novo, em_andamento, em_espera)
    if (filters.estado !== 'todos') {
      filtered = filtered.filter(t => t.status === filters.estado);
    }

    // Filtro por prioridade
    if (filters.prioridade !== 'todas') {
      filtered = filtered.filter(t => t.priority === filters.prioridade);
    }

    // Filtro por departamento
    if (filters.departamento !== 'todos') {
      filtered = filtered.filter(t => t.department === filters.departamento);
    }

    // Filtro por ID
    if (filters.searchId) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(filters.searchId.toLowerCase())
      );
    }

    return filtered;
  }, [tickets, filters]);

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

  const resetFilters = () => {
    setFilters({
      periodo: 'todas',
      status: 'todos',
      estado: 'todos',
      prioridade: 'todas',
      departamento: 'todos',
      searchId: '',
    });
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Chamados</h1>
            <p className="text-muted-foreground mt-2">
              Visualize e responda todos os chamados dos clientes
            </p>
          </div>

          {/* Card de Filtros */}
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={filters.periodo} onValueChange={(v) => setFilters({...filters, periodo: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as datas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as datas</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                    <SelectItem value="mes">Este mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.estado} onValueChange={(v) => setFilters({...filters, estado: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os estados</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_andamento">Em Progresso</SelectItem>
                    <SelectItem value="em_espera">Em Espera</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={filters.prioridade} onValueChange={(v) => setFilters({...filters, prioridade: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={filters.departamento} onValueChange={(v) => setFilters({...filters, departamento: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos Departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Departamentos</SelectItem>
                    <SelectItem value="contabilidade">Contabilidade/Societário</SelectItem>
                    <SelectItem value="icms_ipi">ICMS/IPI</SelectItem>
                    <SelectItem value="irpj_csll">IRPJ/CSLL</SelectItem>
                    <SelectItem value="pis_cofins">PIS/COFINS</SelectItem>
                    <SelectItem value="produtor_rural">Produtor Rural PF</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ID do Chamado</Label>
                <Input 
                  placeholder="Buscar por ID"
                  value={filters.searchId}
                  onChange={(e) => setFilters({...filters, searchId: e.target.value})}
                />
              </div>

              <Button 
                variant="outline"
                onClick={resetFilters}
              >
                Limpar Filtros
              </Button>

              <div className="text-sm text-muted-foreground">
                {filteredTickets.length} de {tickets.length} chamados
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum chamado encontrado com os filtros selecionados.
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
                        <p className="text-sm text-muted-foreground mb-1">
                          Cliente: {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                        </p>
                        {ticket.department && (
                          <p className="text-sm text-muted-foreground mb-3">
                            Departamento: {departmentLabels[ticket.department] || ticket.department}
                          </p>
                        )}
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
