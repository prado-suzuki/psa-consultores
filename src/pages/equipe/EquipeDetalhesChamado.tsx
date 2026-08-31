import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketDetail, useTicketMessages, useTicketAttachments } from '@/hooks/useTickets';
import { useSendTicketMessage, useUpdateTicketStatus, useUploadTicketAttachments } from '@/hooks/useTicketMutations';
import { downloadTicketFile, isImageFile } from '@/lib/ticketUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketRichTextEditor } from '@/components/chamados/TicketRichTextEditor';
import { TicketRichTextView } from '@/components/chamados/TicketRichTextView';
import { isTicketRichTextEmpty } from '@/components/chamados/ticketRichTextFormat';
import { ticketMessageErrorFeedback, ticketMessageFeedback } from '@/lib/ticketMessageOutcome';
import { TOOLTIP_FECHADO_INDISPONIVEL } from '@/lib/chamadosStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, Download, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { chamadoStatusConfig } from '@/lib/chamadoStatusColors';

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
  const location = useLocation();
  /**
   * De volta para de ONDE a pessoa veio, incluindo o espelho.
   *
   * A lista passa `state.from` com a query (`/equipe/chamados?area=tax`), então
   * quem entrou pelo espelho da Tax volta para o espelho da Tax — e não para a
   * lista de todos, que era a perda de contexto registrada como pendência
   * enquanto a tela não tinha essa informação.
   *
   * Sem `state` (link direto, favorito, recarregar) cai na lista sem escopo, que
   * é a resposta certa: aí não há espelho de onde voltar.
   */
  const voltarPara = (location.state as { from?: string } | null)?.from ?? '/equipe/chamados';
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
  // A RLS já decide quem enxerga o chamado (assigned, líder de cluster,
  // membro do cliente etc.). Se o hook não retornou o ticket após o load,
  // é porque o usuário não tem acesso ou o id é inválido.
  useEffect(() => {
    if (!loading && id && !ticket) {
      toast({
        title: 'Chamado indisponível',
        description: 'Você não tem acesso a este chamado ou ele não existe.',
        variant: 'destructive',
      });
      navigate(voltarPara);
    }
  }, [loading, ticket, id, navigate, voltarPara]);

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
    if (isTicketRichTextEmpty(newMessage) || !user || !id) return;

    try {
      const outcome = await sendMessage.mutateAsync({
        ticketId: id,
        userId: user.id,
        message: newMessage,
        isAdmin: true,
        actorName: 'Responsável',
      });
      // Gravou: limpa o editor mesmo com pendência de status/notificação, para
      // que ninguém reenvie a mesma resposta.
      setNewMessage('');
      toast(ticketMessageFeedback(outcome, 'equipe'));
    } catch (error) {
      // Só cai aqui se NADA foi gravado; por isso o texto é preservado.
      toast(ticketMessageErrorFeedback(error, 'equipe'));
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
    navigate(voltarPara);
    return null;
  }

  const uploading = uploadAttachments.isPending;
  const sending = sendMessage.isPending;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(voltarPara)}>
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
                      {/* "Fechado" é decisão do sistema, não do analista: fica
                          visível e somente leitura. O item permanece no Select
                          para que o rótulo apareça quando esse já for o status
                          atual. O override de pointer-events é necessário porque
                          o estilo padrão do shadcn aplica pointer-events-none em
                          item desabilitado, o que mataria hover, cursor e tooltip. */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SelectItem
                            value="fechado"
                            disabled
                            className="data-[disabled]:pointer-events-auto data-[disabled]:cursor-not-allowed"
                          >
                            Fechado
                          </SelectItem>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          {TOOLTIP_FECHADO_INDISPONIVEL}
                        </TooltipContent>
                      </Tooltip>
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
                  <Badge variant="outline" className="border-primary/15 text-teal-700">
                    Área: {ticket.areaName}
                  </Badge>
                )}
              </div>
              
              <TicketRichTextView value={ticket.description} className="text-muted-foreground" />
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
                    <TicketRichTextView value={message.message} className="text-sm" />
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <TicketRichTextEditor
                value={newMessage}
                onChange={setNewMessage}
                placeholder="Digite sua resposta..."
                minHeight="min-h-28"
                ariaLabel="Nova resposta"
              />
              <Button onClick={handleSendMessage} disabled={sending || isTicketRichTextEmpty(newMessage)}>
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
