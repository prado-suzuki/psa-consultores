import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, Download, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  user_id: string;
  assigned_to: string | null;
  profiles?: Profile;
}

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_id: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
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

export default function GestaoDetalhesChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [agents, setAgents] = useState<Profile[]>([]);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchMessages();
      fetchAttachments();
    }
    fetchAgents();
  }, [id]);

  const fetchAgents = async () => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'team_member']);

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .in('id', userIds);
        setAgents(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleAssign = async (agentId: string) => {
    const newAssignedTo = agentId === 'none' ? null : agentId;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: newAssignedTo })
        .eq('id', id);

      if (error) throw error;

      const agent = agents.find(a => a.id === agentId);
      const agentName = agent ? `${agent.first_name} ${agent.last_name}` : null;

      setTicket(prev => prev ? { ...prev, assigned_to: newAssignedTo } : null);

      if (newAssignedTo) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_assigned',
            ticket_id: id,
            actor_name: 'Gestão PSA',
            assigned_to_name: agentName,
          }
        }).catch(console.error);
      }

      toast({
        title: 'Responsável atualizado',
        description: agentName ? `Chamado atribuído para ${agentName}.` : 'Responsável removido.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atribuir responsável',
        variant: 'destructive',
      });
    }
  };

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', id)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const downloadFile = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Erro ao baixar arquivo',
        variant: 'destructive',
      });
    }
  };

  const isImageFile = (fileType: string) => {
    return fileType?.startsWith('image/');
  };

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: 'Chamado não encontrado',
          variant: 'destructive',
        });
        navigate('/gestao/chamados');
        return;
      }

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', data.user_id)
        .maybeSingle();

      setTicket({ ...data, profiles: profileData || undefined });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      navigate('/gestao/chamados');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: id,
        user_id: user.id,
        message: newMessage.trim(),
        is_admin: true,
      });

      if (error) throw error;

      // Update activity status
      await supabase
        .from('tickets')
        .update({ activity_status: 'respondido' })
        .eq('id', id);

      // Notificar cliente sobre resposta (fire-and-forget)
      supabase.functions.invoke('notify-ticket', {
        body: {
          event_type: 'ticket_replied',
          ticket_id: id,
          actor_name: 'Equipe PSA',
          message_preview: newMessage.trim().substring(0, 200),
        }
      }).catch(console.error);

      toast({
        title: 'Mensagem enviada',
        description: 'Sua resposta foi enviada com sucesso.',
      });

      setNewMessage('');
      fetchMessages();
    } catch (error) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setTicket(prev => prev ? { ...prev, status: newStatus } : null);

      // Notificar quando status muda para resolvido
      if (newStatus === 'resolvido') {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_resolved',
            ticket_id: id,
            actor_name: 'Equipe PSA',
          }
        }).catch(console.error);
      }

      toast({
        title: 'Status atualizado',
        description: `Status alterado para ${statusLabels[newStatus]}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <GestaoLayout title="Carregando..." subtitle="Aguarde">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </GestaoLayout>
    );
  }

  if (!ticket) return null;

  return (
    <GestaoLayout 
      title="Detalhes do Chamado" 
      subtitle={`ID: ${ticket.id.slice(0, 8)}...`}
      headerActions={
        <Button
          variant="outline"
          onClick={() => navigate('/gestao/chamados')}
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 bg-white border-slate-200/60 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{ticket.title}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Cliente: {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-40 bg-white border-slate-200">
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
                  <SelectTrigger className="w-48 bg-white border-slate-200">
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
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge className={statusColors[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                Prioridade: {priorityLabels[ticket.priority] || ticket.priority}
              </Badge>
              <Badge variant="outline" className="border-slate-200 text-slate-600">
                Departamento: {departmentLabels[ticket.department] || ticket.department}
              </Badge>
            </div>
            
            <p className="text-slate-600">{ticket.description}</p>
            <div className="text-sm text-slate-500">
              Criado em {format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Anexos ({attachments.length})</h3>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"
                    >
                      {isImageFile(attachment.file_type) ? (
                        <ImageIcon className="h-4 w-4 text-slate-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="flex-1 truncate text-slate-700">{attachment.file_name}</span>
                      <span className="text-slate-400">
                        ({(attachment.file_size / 1024).toFixed(1)} KB)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(attachment)}
                        className="text-slate-600 hover:text-teal-600"
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

        <Card className="p-6 bg-white border-slate-200/60 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Mensagens</h2>
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                Nenhuma mensagem ainda.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.is_admin
                      ? 'bg-teal-50 ml-8 border border-teal-100'
                      : 'bg-slate-100 mr-8 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${message.is_admin ? 'text-teal-700' : 'text-slate-700'}`}>
                      {message.is_admin ? 'Equipe PSA' : 'Cliente'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(message.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{message.message}</p>
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
              className="bg-white border-slate-200"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || !newMessage.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
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
