import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  ArrowLeft,
  Save
} from 'lucide-react';

interface Sprint {
  id: string;
  name: string;
}

const EquipeNovaTarefa = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    sprint_id: '',
    cluster: '',
    priority: 'medium',
    estimated_hours: '',
    due_date: ''
  });

  useEffect(() => {
    fetchSprints();
  }, []);

  const fetchSprints = async () => {
    const { data } = await supabase
      .from('sprints')
      .select('id, name')
      .order('start_date', { ascending: false });
    setSprints(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.from('tasks').insert({
        title: form.title,
        description: form.description || null,
        sprint_id: form.sprint_id || null,
        cluster: form.cluster as any,
        priority: form.priority as any,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        due_date: form.due_date || null,
        created_by: user.id,
        assigned_to: user.id,
        status: 'backlog'
      });

      if (error) throw error;

      toast({
        title: "Tarefa criada!",
        description: "A tarefa foi adicionada ao backlog.",
      });

      navigate('/equipe/tarefas');
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <EquipeLayout 
      title="Nova Tarefa" 
      subtitle="Adicione uma nova tarefa ao sistema"
      headerActions={
        <Button 
          variant="ghost" 
          className="text-gray-600 hover:text-gray-900"
          onClick={() => navigate('/equipe/tarefas')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="max-w-2xl">
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Detalhes da Tarefa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Implementar novo dashboard"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                  placeholder="Descreva a tarefa em detalhes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Sprint</Label>
                  <Select 
                    value={form.sprint_id} 
                    onValueChange={(value) => setForm({ ...form, sprint_id: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Cluster *</Label>
                  <Select 
                    value={form.cluster} 
                    onValueChange={(value) => setForm({ ...form, cluster: value })}
                    required
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="database">Banco de Dados</SelectItem>
                      <SelectItem value="frontend">Frontend</SelectItem>
                      <SelectItem value="management">Gestão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Prioridade</Label>
                  <Select 
                    value={form.priority} 
                    onValueChange={(value) => setForm({ ...form, priority: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_hours" className="text-gray-700">Horas Estimadas</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.estimated_hours}
                    onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Ex: 4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-gray-700">Data Limite</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                  onClick={() => navigate('/equipe/tarefas')}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={loading || !form.title || !form.cluster}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Salvando...' : 'Criar Tarefa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </EquipeLayout>
  );
};

export default EquipeNovaTarefa;
