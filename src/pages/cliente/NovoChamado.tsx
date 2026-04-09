import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Send, FileText, X } from 'lucide-react';
import { z } from 'zod';
import { RequiredMark } from '@/components/ui/required-mark';

const ticketSchema = z.object({
  title: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(100, 'Título deve ter no máximo 100 caracteres'),
  department: z.enum(['contabilidade', 'icms_ipi', 'irpj_csll', 'pis_cofins', 'produtor_rural', 'outros'], {
    errorMap: () => ({ message: 'Selecione um departamento' })
  }),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
  priority: z.enum(['baixa', 'normal', 'alta', 'urgente']),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function NovoChamado() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    department: '',
    description: '',
    priority: 'normal',
  });
  const [errors, setErrors] = useState<any>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: 'Arquivo muito grande',
            description: `${file.name} excede o limite de 10MB`,
            variant: 'destructive',
          });
          return false;
        }
        return true;
      });
      setSelectedFiles([...selectedFiles, ...validFiles]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async (ticketId: string) => {
    for (const file of selectedFiles) {
      const filePath = `${ticketId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);
      
      if (!uploadError) {
        await supabase
          .from('ticket_attachments')
          .insert({
            ticket_id: ticketId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user?.id,
          });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      ticketSchema.parse(form);
      setLoading(true);

      // Try to find cliente_id from representante table
      let clienteId: string | null = null;
      if (user?.id) {
        const { data: repData } = await supabase
          .from('representante' as any)
          .select('id_cliente')
          .eq('user_id', user.id)
          .maybeSingle();
        if (repData) {
          clienteId = (repData as any).id_cliente;
        }
      }

      const insertPayload: any = {
        user_id: user?.id,
        title: form.title,
        department: form.department,
        description: form.description,
        priority: form.priority,
        status: 'aberto',
      };
      if (clienteId) {
        insertPayload.cliente_id = clienteId;
      }

      const { data: ticketData, error } = await supabase.from('tickets').insert(insertPayload).select().single();

      if (error) throw error;

      // Disparar notificação (fire-and-forget)
      if (ticketData) {
        supabase.functions.invoke('notify-ticket', {
          body: {
            event_type: 'ticket_created',
            ticket_id: ticketData.id,
            actor_name: user?.user_metadata?.first_name || 'Cliente',
          }
        }).catch(console.error);
      }

      if (selectedFiles.length > 0 && ticketData) {
        await uploadFiles(ticketData.id);
      }

      toast({
        title: 'Chamado criado com sucesso!',
        description: 'Nossa equipe entrará em contato em breve.',
      });

      navigate('/cliente/chamados');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: 'Erro ao criar chamado',
          description: 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Abrir Novo Chamado</h1>
            <p className="text-muted-foreground mt-2">
              Descreva seu problema ou solicitação e nossa equipe entrará em contato.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-background p-8 rounded-lg shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Chamado <RequiredMark /></Label>
              <Input
                id="title"
                placeholder="Descreva brevemente o assunto"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento <RequiredMark /> (Para qual área é sua dúvida?)</Label>
              <Select 
                value={form.department} 
                onValueChange={(value) => setForm({ ...form, department: value })}
              >
                <SelectTrigger className={errors.department ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contabilidade">Contabilidade/Societário</SelectItem>
                  <SelectItem value="icms_ipi">ICMS/IPI</SelectItem>
                  <SelectItem value="irpj_csll">IRPJ/CSLL</SelectItem>
                  <SelectItem value="pis_cofins">PIS/COFINS</SelectItem>
                  <SelectItem value="produtor_rural">Produtor Rural PF</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-destructive">{errors.department}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade <RequiredMark /></Label>
              <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição Detalhada <RequiredMark /></Label>
              <Textarea
                id="description"
                placeholder="Descreva seu problema ou solicitação com o máximo de detalhes possível"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={8}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachments">Anexar Arquivos (opcional)</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: PDF, Word, Excel, Imagens, ZIP (máx 10MB por arquivo)
              </p>
              {selectedFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  Criando chamado...
                </span>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Criar Chamado
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
