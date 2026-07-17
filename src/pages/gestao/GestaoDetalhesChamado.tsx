import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketDetail, useTicketMessages, useTicketAttachments, useTicketAgents } from '@/hooks/useTickets';
import { useAssignTicket, useSendTicketMessage, useUpdateTicketStatus, useUpdateTicketRouting, useUpdateTicketDeadline } from '@/hooks/useTicketMutations';
import { useTicketEmpresas, useTicketClustersForCliente, useTicketAreasForCliente } from '@/hooks/useCreateTicket';
import { downloadTicketFile, isImageFile } from '@/lib/ticketUtils';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketRichTextEditor } from '@/components/chamados/TicketRichTextEditor';
import { TicketRichTextView } from '@/components/chamados/TicketRichTextView';
import { isTicketRichTextEmpty } from '@/components/chamados/ticketRichTextFormat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, Download, Image as ImageIcon } from 'lucide-react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isPastBrazil, isTodayBrazil, isTomorrowBrazil, parseDate } from '@/lib/dateUtils';

const statusColors: Record<string, string> = {
  aberto: 'bg-info',
  em_andamento: 'bg-warning',
  resolvido: 'bg-success',
  fechado: 'bg-muted-foreground',
};

const statusLabels: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

const departmentLabels: Record<string, string> = {
  contabilidade: 'Contabilidade/Societário',
  icms_ipi: 'ICMS/IPI',
  irpj_csll: 'IRPJ/CSLL',
  pis_cofins: 'PIS/COFINS',
  produtor_rural: 'Produtor Rural PF',
  outros: 'Outros',
};

const deadlineOptions: Record<string, string> = {
  'none': 'Sem prazo',
  '1': '1 dia',
  '3': '3 dias',
  '5': '5 dias',
  '7': '7 dias',
  '10': '10 dias',
  '15': '15 dias',
};

export default function GestaoDetalhesChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: ticket, isLoading: loading } = useTicketDetail(id);
  const { data: messages = [] } = useTicketMessages(id);
  const { data: attachments = [] } = useTicketAttachments(id);
  const { data: agents = [] } = useTicketAgents();

  const assignTicket = useAssignTicket();
  const sendMessage = useSendTicketMessage();
  const updateStatus = useUpdateTicketStatus();
  const updateRouting = useUpdateTicketRouting();
  const updateDeadline = useUpdateTicketDeadline();

  const { data: empresas = [] } = useTicketEmpresas();
  const { data: clientClusters = [] } = useTicketClustersForCliente(ticket?.cliente_id || undefined);
  const { data: clientAreas = [] } = useTicketAreasForCliente(
    ticket?.cliente_id || undefined,
    ticket?.cluster_id || undefined,
  );

  const [newMessage, setNewMessage] = useState('');

  const handleRoutingChange = async (
    field: 'cliente_id' | 'cluster_id' | 'estrutura_area_id',
    value: string,
  ) => {
    if (!id) return;
    const next = value === 'none' ? null : value;
    try {
      await updateRouting.mutateAsync({ ticketId: id, [field]: next });
      toast({ title: 'Roteamento atualizado' });
    } catch {
      toast({ title: 'Erro ao atualizar roteamento', variant: 'destructive' });
    }
  };

  const handleAssign = async (agentId: string) => {
    if (!id) return;
    const newAssignedTo = agentId === 'none' ? null : agentId;
    const agent = agents.find(a => a.id === agentId);
    const agentName = agent ? `${agent.first_name} ${agent.last_name}` : null;

    try {
      await assignTicket.mutateAsync({ ticketId: id, agentId: newAssignedTo, agentName });
      toast({
        title: 'Responsável atualizado',
        description: agentName ? `Chamado atribuído para ${agentName}.` : 'Responsável removido.',
      });
    } catch {
      toast({ title: 'Erro ao atribuir responsável', variant: 'destructive' });
    }
  };

  const handleDeadlineChange = async (days: string) => {
    if (!id || !ticket) return;
    const deadline = days === 'none'
      ? null
      : format(addDays(parseDate(ticket.created_at.slice(0, 10)), parseInt(days)), 'yyyy-MM-dd');
    try {
      await updateDeadline.mutateAsync({ ticketId: id, deadline });
      toast({
        title: 'Prazo atualizado',
        description: deadline
          ? `Prazo definido para ${format(parseDate(deadline), 'dd/MM/yyyy')}.`
          : 'Prazo removido.',
      });
    } catch {
      toast({ title: 'Erro ao atualizar prazo', variant: 'destructive' });
    }
  };

  const getDeadlineSelectValue = (t: { deadline: string | null; created_at: string }): string => {
    if (!t.deadline) return 'none';
    const days = differenceInCalendarDays(parseDate(t.deadline), new Date(t.created_at));
    const key = String(days);
    return deadlineOptions[key] ? key : 'none';
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      await downloadTicketFile(filePath, fileName);
    } catch {
      toast({ title: 'Erro ao baixar arquivo', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !id) return;

    try {
      await sendMessage.mutateAsync({
        ticketId: id,
        userId: user.id,
        message: newMessage,
        isAdmin: true,
        actorName: 'Equipe PSA',
      });
      toast({
        title: 'Mensagem enviada',
        description: 'Sua resposta foi enviada com sucesso.',
      });
      setNewMessage('');
    } catch {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({
        ticketId: id,
        newStatus,
        actorName: 'Equipe PSA',
      });
      toast({
        title: 'Status atualizado',
        description: `Status alterado para ${statusLabels[newStatus]}.`,
      });
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <GestaoLayout title="Carregando..." subtitle="Aguarde">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </GestaoLayout>
    );
  }

  if (!ticket) {
    navigate('/gestao/chamados');
    return null;
  }

  const sending = sendMessage.isPending;

  return (
    <GestaoLayout 
      title="Detalhes do Chamado" 
      subtitle={`ID: ${ticket.id.slice(0, 8)}...`}
      headerActions={
        <Button
          variant="outline"
          onClick={() => navigate('/gestao/chamados')}
          className="border-border text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 bg-card border-border/60 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{ticket.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Cliente: {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40 bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ticket.assigned_to || 'none'} onValueChange={handleAssign}>
                  <SelectTrigger className="w-48 bg-card border-border">
                    <SelectValue placeholder="Responsável" />
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
                <Select
                  value={getDeadlineSelectValue(ticket)}
                  onValueChange={handleDeadlineChange}
                  disabled={updateDeadline.isPending}
                >
                  <SelectTrigger className="w-40 bg-card border-border">
                    <SelectValue placeholder="Prazo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(deadlineOptions).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge className={statusColors[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                Prioridade: {priorityLabels[ticket.priority] || ticket.priority}
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                Departamento: {departmentLabels[ticket.department] || ticket.department}
              </Badge>
              {ticket.areaName && (
                <Badge variant="outline" className="border-primary/20 text-primary">
                  Área: {ticket.areaName}
                </Badge>
              )}
              {ticket.deadline && (() => {
                const deadlineDate = parseDate(ticket.deadline);
                const isPast = isPastBrazil(deadlineDate);
                const isToday = isTodayBrazil(deadlineDate);
                const isTomorrow = isTomorrowBrazil(deadlineDate);
                const cls = isPast
                  ? 'border-destructive/20 text-destructive bg-destructive/5'
                  : isToday || isTomorrow
                    ? 'border-warning/20 text-warning bg-warning/5'
                    : 'border-border text-muted-foreground';
                return (
                  <Badge variant="outline" className={cls}>
                    Prazo: {format(deadlineDate, "dd/MM/yyyy (EEE)", { locale: ptBR })}
                  </Badge>
                );
              })()}
            </div>

            {/* Roteamento — Cliente / Cluster / Área (cascata) */}
            <div className="rounded-md border border-border bg-muted/60 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Roteamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Cliente</label>
                  <Select
                    value={ticket.cliente_id || 'none'}
                    onValueChange={(v) => handleRoutingChange('cliente_id', v)}
                    disabled={updateRouting.isPending}
                  >
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem cliente —</SelectItem>
                      {empresas.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Cluster</label>
                  <Select
                    value={ticket.cluster_id || 'none'}
                    onValueChange={(v) => handleRoutingChange('cluster_id', v)}
                    disabled={!ticket.cliente_id || updateRouting.isPending}
                  >
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder={ticket.cliente_id ? 'Selecione o cluster' : 'Selecione o cliente primeiro'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem cluster —</SelectItem>
                      {clientClusters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Área</label>
                  <Select
                    value={ticket.estrutura_area_id || 'none'}
                    onValueChange={(v) => handleRoutingChange('estrutura_area_id', v)}
                    disabled={!ticket.cluster_id || updateRouting.isPending}
                  >
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue placeholder={ticket.cluster_id ? 'Selecione a área' : 'Selecione o cluster primeiro'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem área —</SelectItem>
                      {clientAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>


            <p className="text-muted-foreground">{ticket.description}</p>
            <div className="text-sm text-muted-foreground space-y-0.5">
              <div>
                Aberto em {format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              {ticket.closed_at && (
                <div>
                  Fechado em {format(new Date(ticket.closed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">Anexos ({attachments.length})</h3>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                    >
                      {isImageFile(attachment.file_type) ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate text-foreground">{attachment.file_name}</span>
                      <span className="text-muted-foreground">
                        ({(attachment.file_size / 1024).toFixed(1)} KB)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(attachment.file_path, attachment.file_name)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border/60 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">Mensagens</h2>
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma mensagem ainda.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.is_admin
                      ? 'bg-primary/5 ml-8 border border-primary/10'
                      : 'bg-muted mr-8 border border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${message.is_admin ? 'text-primary' : 'text-foreground'}`}>
                      {message.is_admin ? 'Equipe PSA' : 'Cliente'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{message.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <Textarea
              placeholder="Digite sua resposta..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              className="bg-card border-border"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()}
              className="bg-primary hover:bg-primary text-white"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </span>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Resposta
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </GestaoLayout>
  );
}
