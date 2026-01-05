import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, User, Filter, X } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department?: string;
  activity_status?: string;
  created_at: string;
  assigned_to?: string | null;
  assigned_agent?: {
    first_name: string;
    last_name: string;
  } | null;
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

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

const activityStatusLabels: Record<string, string> = {
  aguardando_resposta: 'Aguardando Resposta',
  respondido: 'Respondido',
  em_analise: 'Em Análise',
};

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural',
  outros: 'Outros',
};

export default function MeusChamados() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterActivityStatus, setFilterActivityStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          assigned_agent:profiles!assigned_to(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Period filter
      if (filterPeriod !== 'all') {
        const ticketDate = new Date(ticket.created_at);
        const now = new Date();
        
        let startDate: Date;
        let endDate: Date = endOfDay(now);

        switch (filterPeriod) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case 'last7days':
            startDate = startOfDay(subDays(now, 7));
            break;
          case 'last30days':
            startDate = startOfDay(subDays(now, 30));
            break;
          case 'thisMonth':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          case 'lastMonth':
            startDate = startOfMonth(subMonths(now, 1));
            endDate = endOfMonth(subMonths(now, 1));
            break;
          default:
            startDate = new Date(0);
        }

        if (!isWithinInterval(ticketDate, { start: startDate, end: endDate })) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'all' && ticket.status !== filterStatus) {
        return false;
      }

      // Activity status filter
      if (filterActivityStatus !== 'all' && ticket.activity_status !== filterActivityStatus) {
        return false;
      }

      // Department filter
      if (filterDepartment !== 'all' && ticket.department !== filterDepartment) {
        return false;
      }

      return true;
    });
  }, [tickets, filterPeriod, filterStatus, filterActivityStatus, filterDepartment]);

  const hasActiveFilters = filterPeriod !== 'all' || filterStatus !== 'all' || filterActivityStatus !== 'all' || filterDepartment !== 'all';

  const clearFilters = () => {
    setFilterPeriod('all');
    setFilterStatus('all');
    setFilterActivityStatus('all');
    setFilterDepartment('all');
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/cliente')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Meus Chamados</h1>
              <p className="text-muted-foreground mt-2">
                Acompanhe o status de todos os seus chamados
              </p>
            </div>
            <Button onClick={() => navigate('/cliente/novo-chamado')}>
              Novo Chamado
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filtros</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Período</label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="last7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="last30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="thisMonth">Este mês</SelectItem>
                    <SelectItem value="lastMonth">Mês passado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                <Select value={filterActivityStatus} onValueChange={setFilterActivityStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(activityStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Departamento</label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(departmentLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!loading && (
              <div className="mt-3 text-xs text-muted-foreground">
                {filteredTickets.length} de {tickets.length} chamados
              </div>
            )}
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {tickets.length === 0 ? 'Nenhum chamado encontrado' : 'Nenhum chamado corresponde aos filtros'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {tickets.length === 0 
                  ? 'Você ainda não criou nenhum chamado.' 
                  : 'Tente ajustar os filtros para ver mais resultados.'}
              </p>
              {tickets.length === 0 ? (
                <Button onClick={() => navigate('/cliente/novo-chamado')}>
                  Abrir Primeiro Chamado
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/cliente/chamados/${ticket.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {ticket.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={statusColors[ticket.status]}>
                          {statusLabels[ticket.status]}
                        </Badge>
                        <Badge variant="outline" className={priorityColors[ticket.priority]}>
                          {priorityLabels[ticket.priority]}
                        </Badge>
                        {ticket.department && (
                          <Badge variant="outline" className="bg-teal-100 text-teal-700">
                            {departmentLabels[ticket.department] || ticket.department}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        {ticket.assigned_agent ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-4 w-4 text-teal-600" />
                            <span className="font-medium">Analista responsável:</span>
                            <span className="text-teal-700 font-semibold">
                              {ticket.assigned_agent.first_name} {ticket.assigned_agent.last_name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground italic">
                            <User className="h-4 w-4" />
                            <span>Aguardando atribuição de analista</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
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
