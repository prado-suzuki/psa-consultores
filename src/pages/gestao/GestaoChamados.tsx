import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { CreateTicketDialog } from '@/components/gestao/CreateTicketDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowUp, ArrowDown, ArrowUpDown, Paperclip, MessageSquare, AlertTriangle, Clock, CheckCircle, Plus, Download, Trash2 } from 'lucide-react';
import { format, isWithinInterval, subDays, startOfMonth, formatDistanceToNow, addDays, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { isTodayBrazil, isTomorrowBrazil, isPastBrazil, parseDate } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  assigned_to: string | null;
  activity_status: string | null;
  deadline: string | null;
  profiles?: Profile;
  agent?: Profile;
  attachment_count?: number;
}

const deadlineOptions: Record<string, string> = {
  'none': 'Sem prazo',
  '1': '1 dia',
  '3': '3 dias',
  '5': '5 dias',
  '7': '7 dias',
  '10': '10 dias',
  '15': '15 dias',
};

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'status' | 'title' | 'department' | 'created_by' | 'updated_at' | 'activity_status' | null;

const statusColors: Record<string, string> = {
  aberto: 'bg-blue-500 hover:bg-blue-600',
  em_andamento: 'bg-yellow-500 hover:bg-yellow-600',
  resolvido: 'bg-green-500 hover:bg-green-600',
  fechado: 'bg-gray-500 hover:bg-gray-600',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const activityLabels: Record<string, string> = {
  aguardando_resposta: 'Aguardando resposta',
  respondido: 'Respondido',
  em_analise: 'Em análise',
};

const activityColors: Record<string, string> = {
  aguardando_resposta: 'bg-orange-100 text-orange-800',
  respondido: 'bg-green-100 text-green-800',
  em_analise: 'bg-blue-100 text-blue-800',
};

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

export default function GestaoChamados() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    periodo: 'todas',
    status: 'todos',
    departamento: 'todos',
    searchId: '',
  });

  useEffect(() => {
    fetchTickets();
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['team_member', 'admin']);

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .in('id', userIds);

        setAgents(profilesData || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, title, description, status, priority, department, user_id, created_at, updated_at, assigned_to, activity_status')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const agentIds = ticketsData?.filter(t => t.assigned_to).map(t => t.assigned_to as string) || [];
      const uniqueAgentIds = [...new Set(agentIds)];
      const { data: agentsData } = uniqueAgentIds.length > 0 
        ? await supabase
            .from('profiles_safe')
            .select('id, first_name, last_name')
            .in('id', uniqueAgentIds)
        : { data: [] };

      const profilesMap = new Map<string, Profile>();
      profilesData?.forEach(p => profilesMap.set(p.id, p));
      
      const agentsMap = new Map<string, Profile>();
      agentsData?.forEach(a => agentsMap.set(a.id, a));

      const ticketIds = ticketsData?.map(t => t.id) || [];
      const { data: attachmentCounts } = await supabase
        .from('ticket_attachments')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      const attachmentCountMap = new Map<string, number>();
      attachmentCounts?.forEach(a => {
        attachmentCountMap.set(a.ticket_id, (attachmentCountMap.get(a.ticket_id) || 0) + 1);
      });
      
      const enrichedTickets: Ticket[] = ticketsData?.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status || 'aberto',
        priority: ticket.priority || 'normal',
        department: ticket.department || '',
        user_id: ticket.user_id,
        created_at: ticket.created_at || '',
        updated_at: ticket.updated_at || '',
        assigned_to: ticket.assigned_to || null,
        activity_status: ticket.activity_status || 'aguardando_resposta',
        deadline: (ticket as any).deadline || null,
        profiles: profilesMap.get(ticket.user_id),
        agent: ticket.assigned_to ? agentsMap.get(ticket.assigned_to) : undefined,
        attachment_count: attachmentCountMap.get(ticket.id) || 0
      })) || [];

      setTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-1 h-4 w-4" />;
    }
    return <ArrowDown className="ml-1 h-4 w-4" />;
  };

  const filteredAndSortedTickets = useMemo(() => {
    let filtered = [...tickets];

    if (filters.periodo !== 'todas') {
      const now = new Date();
      filtered = filtered.filter(t => {
        const ticketDate = new Date(t.created_at);
        switch (filters.periodo) {
          case 'hoje':
            return isTodayBrazil(ticketDate);
          case '7dias':
            return isWithinInterval(ticketDate, { start: subDays(now, 7), end: now });
          case '30dias':
            return isWithinInterval(ticketDate, { start: subDays(now, 30), end: now });
          default:
            return true;
        }
      });
    }

    if (filters.status !== 'todos') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.departamento !== 'todos') {
      filtered = filtered.filter(t => t.department === filters.departamento);
    }

    if (filters.searchId) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(filters.searchId.toLowerCase()) ||
        t.title.toLowerCase().includes(filters.searchId.toLowerCase())
      );
    }

    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortColumn) {
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'department':
            aVal = a.department || '';
            bVal = b.department || '';
            break;
          case 'created_by':
            aVal = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.toLowerCase();
            bVal = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.toLowerCase();
            break;
          case 'updated_at':
            aVal = new Date(a.updated_at).getTime();
            bVal = new Date(b.updated_at).getTime();
            break;
          case 'activity_status':
            aVal = a.activity_status || '';
            bVal = b.activity_status || '';
            break;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [tickets, filters, sortColumn, sortDirection]);

  const assignAgent = async (ticketId: string, agentId: string | null) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: agentId })
        .eq('id', ticketId);

      if (error) throw error;

      const agent = agents.find(a => a.id === agentId);
      toast({
        title: 'Agente atribuído',
        description: agentId 
          ? `Chamado atribuído a ${agent?.first_name} ${agent?.last_name}` 
          : 'Atribuição removida',
      });

      // Notificar cliente e responsável sobre atribuição (fire-and-forget)
      if (agentId) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_assigned',
            ticket_id: ticketId,
            actor_name: `${agent?.first_name} ${agent?.last_name}`,
          }
        }).catch(console.error);
      }

      // Invalidate notification cache for all users
      queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
      
      fetchTickets();
    } catch (error) {
      toast({
        title: 'Erro ao atribuir agente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const setDeadline = async (ticketId: string, createdAt: string, days: string) => {
    try {
      const deadline = days === 'none' ? null : format(addDays(new Date(createdAt), parseInt(days)), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('tickets')
        .update({ deadline } as any)
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, deadline } : t));
      toast({ title: 'Prazo atualizado' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar prazo', variant: 'destructive' });
    }
  };

  const getDeadlineSelectValue = (ticket: Ticket): string => {
    if (!ticket.deadline) return 'none';
    const days = differenceInCalendarDays(parseDate(ticket.deadline), new Date(ticket.created_at));
    const validOptions = ['1', '3', '5', '7', '10', '15'];
    return validOptions.includes(String(days)) ? String(days) : 'none';
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedTickets.length === filteredAndSortedTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredAndSortedTickets.map(t => t.id));
    }
  };

  const toggleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredAndSortedTickets.map(ticket => ({
      'ID': ticket.id.slice(0, 8),
      'Título': ticket.title,
      'Status': statusLabels[ticket.status] || ticket.status,
      'Departamento': departmentLabels[ticket.department] || ticket.department,
      'Cliente': `${ticket.profiles?.first_name || ''} ${ticket.profiles?.last_name || ''}`.trim(),
      'Responsável': ticket.agent ? `${ticket.agent.first_name} ${ticket.agent.last_name}` : 'Não atribuído',
      'Prazo': ticket.deadline ? format(parseDate(ticket.deadline), 'dd/MM/yyyy') : '',
      'Criado em': format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm'),
      'Atualizado em': format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chamados');
    XLSX.writeFile(workbook, `chamados_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: 'Exportação concluída',
      description: `${exportData.length} chamado(s) exportado(s).`,
    });
  };

  // Delete selected tickets
  const handleDeleteTickets = async () => {
    if (selectedTickets.length === 0) return;
    
    setDeleting(true);
    try {
      // Delete attachments from storage first
      for (const ticketId of selectedTickets) {
        const { data: attachments } = await supabase
          .from('ticket_attachments')
          .select('file_path')
          .eq('ticket_id', ticketId);

        if (attachments && attachments.length > 0) {
          const filePaths = attachments.map(a => a.file_path);
          await supabase.storage.from('ticket-attachments').remove(filePaths);
        }
      }

      // Delete attachment records
      await supabase
        .from('ticket_attachments')
        .delete()
        .in('ticket_id', selectedTickets);

      // Delete messages
      await supabase
        .from('ticket_messages')
        .delete()
        .in('ticket_id', selectedTickets);

      // Delete tickets
      const { error } = await supabase
        .from('tickets')
        .delete()
        .in('id', selectedTickets);

      if (error) throw error;

      toast({
        title: 'Chamados excluídos',
        description: `${selectedTickets.length} chamado(s) excluído(s) com sucesso.`,
      });

      setSelectedTickets([]);
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
      fetchTickets();
    } catch (error) {
      console.error('Error deleting tickets:', error);
      toast({
        title: 'Erro ao excluir chamados',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em_andamento').length,
    resolvidos: tickets.filter(t => t.status === 'resolvido' || t.status === 'fechado').length,
  };

  return (
    <GestaoLayout 
      title="Gestão de Chamados" 
      subtitle="Visualize e gerencie os chamados dos clientes"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total</CardDescription>
              <MessageSquare className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Abertos</CardDescription>
              <AlertTriangle className="h-4 w-4 text-blue-400" />
            </div>
            <CardTitle className="text-3xl text-blue-600">{stats.abertos}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Em Andamento</CardDescription>
              <Clock className="h-4 w-4 text-yellow-400" />
            </div>
            <CardTitle className="text-3xl text-yellow-600">{stats.emAndamento}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Resolvidos</CardDescription>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <CardTitle className="text-3xl text-green-600">{stats.resolvidos}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filters.departamento} onValueChange={(v) => setFilters({...filters, departamento: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(departmentLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="ID ou título..."
                value={filters.searchId}
                onChange={(e) => setFilters({...filters, searchId: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        {selectedTickets.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedTickets.length})
          </Button>
        )}
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chamados</CardTitle>
          <CardDescription>
            {filteredAndSortedTickets.length} chamado(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTickets.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('title')}>
                    <div className="flex items-center">
                      Título {getSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('department')}>
                    <div className="flex items-center">
                      Departamento {getSortIcon('department')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('created_by')}>
                    <div className="flex items-center">
                      Cliente {getSortIcon('created_by')}
                    </div>
                  </TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('updated_at')}>
                    <div className="flex items-center">
                      Atualização {getSortIcon('updated_at')}
                    </div>
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTickets.includes(ticket.id)}
                        onCheckedChange={() => toggleSelectTicket(ticket.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[ticket.status]}>
                        {statusLabels[ticket.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        {ticket.title}
                        {ticket.attachment_count && ticket.attachment_count > 0 && (
                          <Paperclip className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {departmentLabels[ticket.department] || ticket.department}
                    </TableCell>
                    <TableCell>
                      {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ticket.assigned_to || 'none'}
                        onValueChange={(v) => assignAgent(ticket.id, v === 'none' ? null : v)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Atribuir" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não atribuído</SelectItem>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.first_name} {agent.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Select
                          value={getDeadlineSelectValue(ticket)}
                          onValueChange={(v) => setDeadline(ticket.id, ticket.created_at, v)}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue placeholder="Prazo" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(deadlineOptions).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {ticket.deadline && (() => {
                          const deadlineDate = parseDate(ticket.deadline);
                          const isPast = isPastBrazil(deadlineDate);
                          const isToday = isTodayBrazil(deadlineDate);
                          const isTomorrow = isTomorrowBrazil(deadlineDate);
                          const colorClass = isPast
                            ? 'text-red-600 font-semibold'
                            : (isToday || isTomorrow)
                              ? 'text-amber-600 font-medium'
                              : 'text-green-600';
                          return (
                            <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
                              {isPast && <AlertTriangle className="h-3 w-3" />}
                              {format(deadlineDate, "dd/MM/yyyy (EEE)", { locale: ptBR })}
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/gestao/chamados/${ticket.id}`)}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600"
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTickets}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Você está prestes a excluir {selectedTickets.length} chamado(s). Esta ação não pode ser desfeita.
              Todas as mensagens e anexos associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 text-slate-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTickets}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Excluindo...
                </span>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GestaoLayout>
  );
}
