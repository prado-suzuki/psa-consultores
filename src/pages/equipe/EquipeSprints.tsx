import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  Plus,
  LogOut,
  Target,
  CheckCircle2,
  Clock
} from 'lucide-react';
import logo from '@/assets/logo-psa.png';

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

const EquipeSprints = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSprint, setNewSprint] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchSprints();
  }, []);

  const fetchSprints = async () => {
    try {
      const { data } = await supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: false });
      
      setSprints(data || []);
    } catch (error) {
      console.error('Error fetching sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('sprints').insert({
        name: newSprint.name,
        goal: newSprint.goal || null,
        start_date: newSprint.start_date,
        end_date: newSprint.end_date,
        status: 'active',
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Sprint criada!",
        description: "A nova sprint foi criada com sucesso.",
      });

      setIsDialogOpen(false);
      setNewSprint({ name: '', goal: '', start_date: '', end_date: '' });
      fetchSprints();
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a sprint.",
        variant: "destructive"
      });
    }
  };

  const updateSprintStatus = async (sprintId: string, status: string) => {
    try {
      await supabase
        .from('sprints')
        .update({ status })
        .eq('id', sprintId);
      
      fetchSprints();
      toast({
        title: "Sprint atualizada!",
        description: `Status alterado para ${status === 'active' ? 'ativa' : 'concluída'}.`,
      });
    } catch (error) {
      console.error('Error updating sprint:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard' },
    { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
    { icon: Calendar, label: 'Sprints', path: '/equipe/sprints', active: true },
    { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
    { icon: ListTodo, label: 'Tarefas', path: '/equipe/tarefas' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400">Ativa</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400">Concluída</Badge>;
      case 'planned':
        return <Badge className="bg-gray-500/20 text-gray-400">Planejada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Gestão de Sprints</h1>
              <p className="text-gray-400">Sprints semanais do time</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Sprint
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Criar Nova Sprint</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSprint} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">Nome da Sprint</Label>
                    <Input
                      id="name"
                      value={newSprint.name}
                      onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Sprint 1 - Dezembro"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal" className="text-gray-300">Objetivo (opcional)</Label>
                    <Textarea
                      id="goal"
                      value={newSprint.goal}
                      onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Descreva o objetivo principal desta sprint"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date" className="text-gray-300">Data Início</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={newSprint.start_date}
                        onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date" className="text-gray-300">Data Fim</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={newSprint.end_date}
                        onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    Criar Sprint
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sprints List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : sprints.length > 0 ? (
            <div className="space-y-4">
              {sprints.map((sprint) => (
                <Card key={sprint.id} className="bg-gray-900/50 border-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary" />
                        <CardTitle className="text-white">{sprint.name}</CardTitle>
                        {getStatusBadge(sprint.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {sprint.status === 'active' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                            onClick={() => updateSprintStatus(sprint.id, 'completed')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Concluir
                          </Button>
                        ) : sprint.status === 'completed' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                            onClick={() => updateSprintStatus(sprint.id, 'active')}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Reabrir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sprint.goal && (
                      <p className="text-gray-300 mb-4">{sprint.goal}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(sprint.start_date).toLocaleDateString('pt-BR')} - {new Date(sprint.end_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="py-16 text-center">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhuma sprint criada</h3>
                <p className="text-gray-400 mb-4">Crie sua primeira sprint para começar a organizar o trabalho</p>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Sprint
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default EquipeSprints;
