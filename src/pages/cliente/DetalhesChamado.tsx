import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, Download, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Message {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_id: string;
  author?: {
    first_name: string;
    last_name: string;
  };
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

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'application/zip',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function DetalhesChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchMessages();
      fetchAttachments();
    }
  }, [id, user]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter(file => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          title: 'Tipo de arquivo não permitido',
          description: `${file.name}: Apenas PDF, Word, Excel, imagens (JPG/PNG) e ZIP são aceitos.`,
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name}: O tamanho máximo é 10MB.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || !id || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('ticket_attachments')
          .insert({
            ticket_id: id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;
      }

      toast({
        title: 'Arquivos enviados',
        description: `${selectedFiles.length} arquivo(s) anexado(s) com sucesso.`,
      });

      // Notificar sobre novo anexo (fire-and-forget)
      supabase.functions.invoke('notify-ticket', {
        body: {
          event_type: 'ticket_replied',
          ticket_id: id,
          actor_name: 'Cliente',
          message_preview: `${selectedFiles.length} arquivo(s) anexado(s)`,
        }
      }).catch(console.error);

      setSelectedFiles([]);
      fetchAttachments();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Erro ao enviar arquivos',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      navigate('/cliente/chamados');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const adminUserIds = [...new Set(
        messagesData
          ?.filter(m => m.is_admin)
          .map(m => m.user_id) || []
      )];

      let profilesMap: Record<string, { first_name: string; last_name: string }> = {};

      if (adminUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles_safe')
          .select('id, first_name, last_name')
          .in('id', adminUserIds);

        profilesData?.forEach(p => {
          profilesMap[p.id] = {
            first_name: p.first_name || '',
            last_name: p.last_name || ''
          };
        });
      }

      const enrichedMessages = messagesData?.map(msg => ({
        ...msg,
        author: msg.is_admin ? profilesMap[msg.user_id] : undefined
      })) || [];

      setMessages(enrichedMessages);
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
        is_admin: false,
      });

      if (error) throw error;

      await supabase
        .from('tickets')
        .update({
          activity_status: 'aguardando_resposta',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      supabase.functions.invoke('notify-ticket', {
        body: {
          event_type: 'ticket_replied',
          ticket_id: id,
          actor_name: 'Cliente',
          message_preview: newMessage.trim().substring(0, 200),
        }
      }).catch(console.error);

      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/cliente/chamados')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6 overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold text-foreground break-all">{ticket.title}</h1>
                <Badge className={statusColors[ticket.status]}>
                  {statusLabels[ticket.status]}
                </Badge>
              </div>
              <p className="text-muted-foreground break-all whitespace-pre-wrap">{ticket.description}</p>
              <div className="text-sm text-muted-foreground">
                Criado em {format(new Date(ticket.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-2">Anexos ({attachments.length})</h3>
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
                        <span className="flex-1 truncate">{attachment.file_name}</span>
                        <span className="text-muted-foreground">
                          ({(attachment.file_size / 1024).toFixed(1)} KB)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção de upload de novos anexos */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-semibold mb-2">Adicionar Anexos</h3>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                />

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Arquivos
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, Word, Excel, imagens (JPG/PNG) e ZIP. Máximo 10MB por arquivo.
                  </p>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                        >
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        onClick={uploadFiles}
                        disabled={uploading}
                        className="mt-2"
                      >
                        {uploading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enviando...
                          </span>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Enviar {selectedFiles.length} arquivo(s)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Mensagens</h2>
            <div className="space-y-4 mb-6">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.is_admin
                        ? 'bg-primary/10 ml-8'
                        : 'bg-muted mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {message.is_admin
                          ? (message.author
                              ? `${message.author.first_name} ${message.author.last_name}`.trim() || 'Equipe PSA'
                              : 'Equipe PSA')
                          : 'Você'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
              />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                {sending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                    Enviando...
                  </span>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
