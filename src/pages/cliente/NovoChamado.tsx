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
import { ArrowLeft, Send } from 'lucide-react';
import { z } from 'zod';

const ticketSchema = z.object({
  title: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(100, 'Título deve ter no máximo 100 caracteres'),
  department: z.enum(['contabilidade', 'icms_ipi', 'irpj_csll', 'pis_cofins', 'produtor_rural', 'outros'], {
    errorMap: () => ({ message: 'Selecione um departamento' })
  }),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
  priority: z.enum(['baixa', 'normal', 'alta', 'urgente']),
});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      ticketSchema.parse(form);
      setLoading(true);

      const { error } = await supabase.from('tickets').insert({
        user_id: user?.id,
        title: form.title,
        department: form.department,
        description: form.description,
        priority: form.priority,
        status: 'aberto',
      });

      if (error) throw error;

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
              <Label htmlFor="title">Título do Chamado *</Label>
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
              <Label htmlFor="department">Departamento * (Para qual área é sua dúvida?)</Label>
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
              <Label htmlFor="priority">Prioridade *</Label>
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
              <Label htmlFor="description">Descrição Detalhada *</Label>
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
