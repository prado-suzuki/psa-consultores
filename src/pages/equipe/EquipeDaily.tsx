import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { 
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Users,
  Filter,
  Pencil,
  Trash2
} from 'lucide-react';

interface DailyStandup {
  id: string;
  user_id: string;
  date: string;
  did_yesterday: string | null;
  will_do_today: string | null;
  blockers: string | null;
  created_at: string;
  sprint_id: string | null;
}

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Sprint {
  id: string;
  name: string;
}

const EquipeDaily = () => {
  const { user } = useAuth();
  const [standups, setStandups] = useState<DailyStandup[]>([]);
  const [myStandup, setMyStandup] = useState<DailyStandup | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    did_yesterday: '',
    will_do_today: '',
    blockers: ''
  });

  // Estado para edição
  const [editingStandup, setEditingStandup] = useState<DailyStandup | null>(null);
  const [editForm, setEditForm] = useState({
    did_yesterday: '',
    will_do_today: '',
    blockers: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  // Filtros para histórico
  const [filterDate, setFilterDate] = useState<string>(today);
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [filterSprint, setFilterSprint] = useState<string>('all');

  useEffect(() => {
    if (user) {
      setSelectedUserId(user.id);
      fetchTeamMembers();
      fetchSprints();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStandups();
    }
  }, [user, filterDate, filterPerson, filterSprint]);

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

  const fetchSprints = async () => {
    try {
      const { data } = await supabase
        .from('sprints')
        .select('id, name')
        .order('start_date', { ascending: false });
      setSprints(data || []);
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const fetchStandups = async () => {
    if (!user) return;
    
    try {
      // Buscar o standup do usuário atual para hoje
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

      // Buscar standups com filtros
      let query = supabase
        .from('daily_standups')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      // Só aplicar filtro de data se nenhuma sprint específica estiver selecionada
      if (filterSprint === 'all') {
        query = query.eq('date', filterDate);
      } else {
        query = query.eq('sprint_id', filterSprint);
      }

      if (filterPerson !== 'all') {
        query = query.eq('user_id', filterPerson);
      }

      const { data: allStandups } = await query;
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

  const handleEdit = (standup: DailyStandup) => {
    setEditingStandup(standup);
    setEditForm({
      did_yesterday: standup.did_yesterday || '',
      will_do_today: standup.will_do_today || '',
      blockers: standup.blockers || ''
    });
  };

  const handleEditSubmit = async () => {
    if (!editingStandup) return;
    
    setEditSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('daily_standups')
        .update({
          did_yesterday: editForm.did_yesterday,
          will_do_today: editForm.will_do_today,
          blockers: editForm.blockers || null
        })
        .eq('id', editingStandup.id);

      if (error) throw error;
      
      toast({ title: "Daily atualizado", description: "O registro foi atualizado com sucesso." });
      setEditingStandup(null);
      fetchStandups();
    } catch (error) {
      console.error('Error updating standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível atualizar o daily.", 
        variant: "destructive" 
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (standupId: string) => {
    try {
      const { error } = await supabase
        .from('daily_standups')
        .delete()
        .eq('id', standupId);

      if (error) throw error;
      
      toast({ title: "Daily excluído", description: "O registro foi removido." });
      fetchStandups();
    } catch (error) {
      console.error('Error deleting standup:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível excluir o daily.", 
        variant: "destructive" 
      });
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
      <div className="space-y-6">
        {/* Formulário de Daily */}
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

        {/* Histórico de Dailys com Filtros */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                Histórico de Dailys
              </CardTitle>
              
              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Filtros:</span>
                </div>
                
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 w-40"
                />
                
                <Select value={filterPerson} onValueChange={setFilterPerson}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44">
                    <SelectValue placeholder="Pessoa" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all">Todas as pessoas</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterSprint} onValueChange={setFilterSprint}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44">
                    <SelectValue placeholder="Sprint" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all">Todas as sprints</SelectItem>
                    {sprints.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : standups.length > 0 ? (
              <div className="space-y-4">
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
                      <span className="text-xs text-gray-500">
                        {new Date(standup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {/* Botões de edição/exclusão apenas para o próprio usuário */}
                      {standup.user_id === user?.id && (
                        <div className="flex gap-1 ml-auto">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(standup)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Daily?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O registro do daily será permanentemente removido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(standup.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>

                    {standup.did_yesterday && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Ontem:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{standup.did_yesterday}</p>
                      </div>
                    )}

                    {standup.will_do_today && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Hoje:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{standup.will_do_today}</p>
                      </div>
                    )}

                    {standup.blockers && (
                      <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-700 mb-1">Bloqueio:</p>
                        <p className="text-sm text-yellow-800 whitespace-pre-wrap">{standup.blockers}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum daily encontrado para os filtros selecionados</p>
                <p className="text-sm text-gray-400">Tente alterar a data ou os filtros</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editingStandup !== null} onOpenChange={(open) => !open && setEditingStandup(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Daily</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">O que fiz ontem?</Label>
              <Textarea
                value={editForm.did_yesterday}
                onChange={(e) => setEditForm({ ...editForm, did_yesterday: e.target.value })}
                className="min-h-[80px]"
                placeholder="Descreva suas entregas de ontem..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">O que vou fazer hoje?</Label>
              <Textarea
                value={editForm.will_do_today}
                onChange={(e) => setEditForm({ ...editForm, will_do_today: e.target.value })}
                className="min-h-[80px]"
                placeholder="Suas tarefas para hoje..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Bloqueios? (opcional)</Label>
              <Textarea
                value={editForm.blockers}
                onChange={(e) => setEditForm({ ...editForm, blockers: e.target.value })}
                className="min-h-[60px]"
                placeholder="Algum impedimento ou bloqueio?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStandup(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeDaily;
