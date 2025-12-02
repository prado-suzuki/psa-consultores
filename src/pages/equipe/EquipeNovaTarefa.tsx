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
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  LogOut,
  ArrowLeft,
  Save
} from 'lucide-react';
import logo from '@/assets/logo-psa.png';

interface Sprint {
  id: string;
  name: string;
}

const EquipeNovaTarefa = () => {
  const { user, signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard' },
    { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
    { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
    { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
    { icon: ListTodo, label: 'Tarefas', path: '/equipe/tarefas', active: true },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900/50 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="PSA" className="h-10" />
          <div>
            <h1 className="text-white font-semibold">Equipe PSA</h1>
            <p className="text-xs text-gray-400">Gestão de Demandas</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={item.active ? "secondary" : "ghost"}
              className={`w-full justify-start ${item.active ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'}`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-400 hover:text-red-400"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sair
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-gray-400 hover:text-white"
              onClick={() => navigate('/equipe/tarefas')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Nova Tarefa</h1>
              <p className="text-gray-400">Adicione uma nova tarefa ao sistema</p>
            </div>
          </div>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Detalhes da Tarefa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-gray-300">Título *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Ex: Implementar novo dashboard"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Descrição</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                    placeholder="Descreva a tarefa em detalhes..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Sprint</Label>
                    <Select 
                      value={form.sprint_id} 
                      onValueChange={(value) => setForm({ ...form, sprint_id: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {sprints.map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Cluster *</Label>
                    <Select 
                      value={form.cluster} 
                      onValueChange={(value) => setForm({ ...form, cluster: value })}
                      required
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="database">Banco de Dados</SelectItem>
                        <SelectItem value="frontend">Frontend</SelectItem>
                        <SelectItem value="management">Gestão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Prioridade</Label>
                    <Select 
                      value={form.priority} 
                      onValueChange={(value) => setForm({ ...form, priority: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_hours" className="text-gray-300">Horas Estimadas</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      step="0.5"
                      min="0"
                      value={form.estimated_hours}
                      onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Ex: 4"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-gray-300">Data Limite</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
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
      </main>
    </div>
  );
};

export default EquipeNovaTarefa;
