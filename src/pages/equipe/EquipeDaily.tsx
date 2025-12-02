import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  MessageSquare, 
  ListTodo, 
  LogOut,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User
} from 'lucide-react';
import logo from '@/assets/logo-psa.png';

interface DailyStandup {
  id: string;
  user_id: string;
  date: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  blockers: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

const EquipeDaily = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [myStandup, setMyStandup] = useState<DailyStandup | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    did_yesterday: '',
    will_do_today: '',
    blockers: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchStandups();
  }, [user]);

  const fetchStandups = async () => {
    if (!user) return;
    
    try {
      // Check if user already submitted today
      const { data: myData } = await supabase
        .from('daily_standups')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (myData) {
        setMyStandup(myData);
        setForm({
          did_yesterday: myData.did_yesterday || '',
          will_do_today: myData.will_do_today || '',
          blockers: myData.blockers || ''
        });
      }

      // Fetch today's standups from all team members
      const { data: allStandups } = await supabase
        .from('daily_standups')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: false });

      setStandups(allStandups || []);
    } catch (error) {
      console.error('Error fetching standups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    
    try {
      if (myStandup) {
        // Update existing
        const { error } = await supabase
          .from('daily_standups')
          .update({
            did_yesterday: form.did_yesterday,
            will_do_today: form.will_do_today,
            blockers: form.blockers || null
          })
          .eq('id', myStandup.id);

        if (error) throw error;
        toast({ title: "Daily atualizado!", description: "Seu registro foi atualizado." });
      } else {
        // Create new
        const { error } = await supabase
          .from('daily_standups')
          .insert({
            user_id: user.id,
            date: today,
            did_yesterday: form.did_yesterday,
            will_do_today: form.will_do_today,
            blockers: form.blockers || null
          });

        if (error) throw error;
        toast({ title: "Daily registrado!", description: "Seu registro foi salvo com sucesso." });
      }

      fetchStandups();
    } catch (error) {
      console.error('Error submitting standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar seu daily.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
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
    { icon: MessageSquare, label: 'Daily', path: '/equipe/daily', active: true },
    { icon: ListTodo, label: 'Tarefas', path: '/equipe/tarefas' },
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Daily Standup</h1>
            <p className="text-gray-400">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* My Daily Form */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Meu Daily (15 min)
                  {myStandup && (
                    <Badge className="bg-green-500/20 text-green-400 ml-2">Registrado</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      O que fiz ontem?
                    </Label>
                    <Textarea
                      value={form.did_yesterday}
                      onChange={(e) => setForm({ ...form, did_yesterday: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                      placeholder="Descreva suas entregas de ontem..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      O que vou fazer hoje?
                    </Label>
                    <Textarea
                      value={form.will_do_today}
                      onChange={(e) => setForm({ ...form, will_do_today: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                      placeholder="Suas tarefas para hoje..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      Bloqueios? (opcional)
                    </Label>
                    <Textarea
                      value={form.blockers}
                      onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                      placeholder="Algum impedimento ou bloqueio?"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={submitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Salvando...' : myStandup ? 'Atualizar Daily' : 'Registrar Daily'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Team Standups */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Daily da Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : standups.length > 0 ? (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {standups.map((standup) => (
                      <div 
                        key={standup.id}
                        className={`p-4 rounded-lg border ${
                          standup.user_id === user?.id 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-gray-800/50 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                          <span className="text-white font-medium">
                            {standup.user_id === user?.id ? 'Você' : 'Membro da equipe'}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {new Date(standup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {standup.did_yesterday && (
                          <div className="mb-2">
                            <p className="text-xs text-green-400 mb-1">Ontem:</p>
                            <p className="text-sm text-gray-300">{standup.did_yesterday}</p>
                          </div>
                        )}

                        {standup.will_do_today && (
                          <div className="mb-2">
                            <p className="text-xs text-blue-400 mb-1">Hoje:</p>
                            <p className="text-sm text-gray-300">{standup.will_do_today}</p>
                          </div>
                        )}

                        {standup.blockers && (
                          <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                            <p className="text-xs text-yellow-400 mb-1">Bloqueio:</p>
                            <p className="text-sm text-yellow-300">{standup.blockers}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum daily registrado hoje</p>
                    <p className="text-sm text-gray-500">Seja o primeiro a compartilhar!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EquipeDaily;
