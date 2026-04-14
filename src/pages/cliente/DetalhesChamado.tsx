import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketDetail, useTicketMessages, useTicketAttachments } from '@/hooks/useTickets';
import { useSendTicketMessage, useUploadTicketAttachments } from '@/hooks/useTicketMutations';
import { downloadTicketFile, isImageFile } from '@/lib/ticketUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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

  const { data: ticket, isLoading: loading } = useTicketDetail(id, { ownerOnly: user?.id });
  const { data: messages = [] } = useTicketMessages(id, true);
  const { data: attachments = [] } = useTicketAttachments(id);

  const sendMessage = useSendTicketMessage();
  const uploadAttachments = useUploadTicketAttachments();

  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if ticket not found after loading
  if (!loading && !ticket) {
    navigate('/cliente/chamados');
    return null;
  }

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
        actorName: 'Cliente',
      });
      toast({
        title: 'Arquivos enviados',
        description: `${selectedFiles.length} arquivo(s) anexado(s) com sucesso.`,
      });
      setSelectedFiles([]);
    } catch (error) {
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
        isAdmin: false,
        actorName: 'Cliente',
      });
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) return null;

  const uploading = uploadAttachments.isPending;
  const sending = sendMessage.isPending;

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
