import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Users
} from 'lucide-react';

interface DailyStandup {
  id: string;
  user_id: string;
  date: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  blockers: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const EquipeDaily = () => {
  const { user } = useAuth();
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [myStandup, setMyStandup] = useState<DailyStandup | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    did_yesterday: '',
    will_do_today: '',
    blockers: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) {
      setSelectedUserId(user.id);
      fetchTeamMembers();
      fetchStandups();
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['team_member', 'admin']);

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesData) {
          setTeamMembers(profilesData);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchStandups = async () => {
    if (!user) return;
    
    try {
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
    if (!user || !selectedUserId) return;
    
    setSubmitting(true);
    
    try {
      if (myStandup && selectedUserId === user.id) {
        const { error } = await supabase
          .from('daily_standups')
          .update({
            did_yesterday: form.did_yesterday,
            will_do_today: form.will_do_today,
            blockers: form.blockers || null
          })
          .eq('id', myStandup.id);

        if (error) throw error;
        toast({ title: "Daily atualizado", description: "Seu registro foi atualizado." });
      } else {
        const { error } = await supabase
          .from('daily_standups')
          .insert({
            user_id: selectedUserId,
            date: today,
            did_yesterday: form.did_yesterday,
            will_do_today: form.will_do_today,
            blockers: form.blockers || null
          });

        if (error) throw error;
        toast({ title: "Daily registrado", description: "O registro foi salvo com sucesso." });
      }

      fetchStandups();
    } catch (error) {
      console.error('Error submitting standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar o daily.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberName = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    if (member) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Sem nome';
    }
    return userId === user?.id ? 'Você' : 'Membro da equipe';
  };

  const todayFormatted = new Date().toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <EquipeLayout 
      title="Daily Standup" 
      subtitle={todayFormatted}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* My Daily Form */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Daily (15 min)
              {myStandup && selectedUserId === user?.id && (
                <Badge className="bg-green-100 text-green-700 ml-2">Registrado</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  Membro da equipe
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Selecione o membro" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                        {member.id === user?.id && ' (você)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  O que fiz ontem?
                </Label>
                <Textarea
                  value={form.did_yesterday}
                  onChange={(e) => setForm({ ...form, did_yesterday: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 min-h-[80px]"
                  placeholder="Descreva suas entregas de ontem..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  O que vou fazer hoje?
                </Label>
                <Textarea
                  value={form.will_do_today}
                  onChange={(e) => setForm({ ...form, will_do_today: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 min-h-[80px]"
                  placeholder="Suas tarefas para hoje..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  Bloqueios? (opcional)
                </Label>
                <Textarea
                  value={form.blockers}
                  onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 min-h-[60px]"
                  placeholder="Algum impedimento ou bloqueio?"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={submitting || !selectedUserId}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Salvando...' : myStandup && selectedUserId === user?.id ? 'Atualizar Daily' : 'Registrar Daily'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Standups */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
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
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <span className="text-gray-900 font-medium">
                        {getMemberName(standup.user_id)}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(standup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {standup.did_yesterday && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Ontem:</p>
                        <p className="text-sm text-gray-700">{standup.did_yesterday}</p>
                      </div>
                    )}

                    {standup.will_do_today && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Hoje:</p>
                        <p className="text-sm text-gray-700">{standup.will_do_today}</p>
                      </div>
                    )}

                    {standup.blockers && (
                      <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-700 mb-1">Bloqueio:</p>
                        <p className="text-sm text-yellow-800">{standup.blockers}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum daily registrado hoje</p>
                <p className="text-sm text-gray-400">Seja o primeiro a compartilhar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EquipeLayout>
  );
};

export default EquipeDaily;