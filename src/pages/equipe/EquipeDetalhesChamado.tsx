import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketDetail, useTicketMessages, useTicketAttachments } from '@/hooks/useTickets';
import { useSendTicketMessage, useUpdateTicketStatus, useUploadTicketAttachments } from '@/hooks/useTicketMutations';
import { downloadTicketFile, isImageFile } from '@/lib/ticketUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, Download, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function EquipeDetalhesChamado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: ticket, isLoading: loading } = useTicketDetail(id);
  const { data: messages = [] } = useTicketMessages(id);
  const { data: attachments = [] } = useTicketAttachments(id);

  const sendMessage = useSendTicketMessage();
  const updateStatus = useUpdateTicketStatus();
  const uploadAttachments = useUploadTicketAttachments();

  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate that the ticket is assigned to the current user
  useEffect(() => {
    if (ticket && user && ticket.assigned_to !== user.id) {
      toast({
        title: 'Acesso negado',
        description: 'Este chamado não está atribuído a você.',
        variant: 'destructive',
      });
      navigate('/equipe/chamados');
    }
  }, [ticket, user, navigate]);

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

  const handleUploadFiles = async () => {
    if (!user || !id || selectedFiles.length === 0) return;

    try {
      await uploadAttachments.mutateAsync({
        ticketId: id,
        files: selectedFiles,
        userId: user.id,
        actorName: 'Responsável',
      });
      toast({
        title: 'Arquivos enviados',
        description: `${selectedFiles.length} arquivo(s) anexado(s) com sucesso.`,
      });
      setSelectedFiles([]);
    } catch {
      toast({
        title: 'Erro ao enviar arquivos',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
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
        actorName: 'Responsável',
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
        actorName: 'Responsável',
      });
      toast({
        title: 'Status atualizado',
        description: `Status alterado para ${statusLabels[newStatus]}.`,
      });
    } catch {
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) {
    navigate('/equipe/chamados');
    return null;
  }

  const uploading = uploadAttachments.isPending;
  const sending = sendMessage.isPending;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/equipe/chamados')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos Meus Chamados
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{ticket.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {ticket.id.slice(0, 8)}... • 
                    Cliente: {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  Prioridade: {priorityLabels[ticket.priority] || ticket.priority}
                </Badge>
                <Badge variant="outline">
                  Departamento: {departmentLabels[ticket.department] || ticket.department}
                </Badge>
                {ticket.areaName && (
                  <Badge variant="outline" className="border-teal-200 text-teal-700">
                    Área: {ticket.areaName}
                  </Badge>
                )}
              </div>
              
              <p className="text-muted-foreground">{ticket.description}</p>
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
                          onClick={() => handleDownloadFile(attachment.file_path, attachment.file_name)}
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
                        onClick={handleUploadFiles}
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
                        ? 'bg-primary/10 ml-8'
                        : 'bg-muted mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {message.is_admin ? 'Equipe PSA' : 'Cliente'}
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
                placeholder="Digite sua resposta..."
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
                    Enviar Resposta
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
