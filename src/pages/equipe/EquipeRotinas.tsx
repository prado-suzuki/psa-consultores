import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

const EquipeRotinas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [myRoutines, setMyRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRoutineDialogOpen, setIsRoutineDialogOpen] = useState(false);
  const [submittingRoutine, setSubmittingRoutine] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newRoutine, setNewRoutine] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    assigned_to: '',
    estimated_hours: ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [membersRes, routinesRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name').order('first_name'),
        user
          ? supabase
              .from('routines')
              .select('*')
              .eq('assigned_to', user.id)
              .neq('status', 'completed')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] })
      ]);

      setTeamMembers(membersRes.data || []);
      setMyRoutines(routinesRes.data || []);
    } catch (error) {
      console.error('Error fetching routines data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRoutine || !newRoutine.title.trim()) {
      toast({ title: "Erro", description: "Preencha o título da rotina.", variant: "destructive" });
      return;
    }

    setSubmittingRoutine(true);
    try {
      const { error } = await supabase.from('routines').insert({
        title: newRoutine.title.trim(),
        description: newRoutine.description.trim() || null,
        is_recurring: true,
        frequency: newRoutine.frequency,
        assigned_to: newRoutine.assigned_to || user?.id || null,
        estimated_hours: newRoutine.estimated_hours ? Number(newRoutine.estimated_hours) : null,
        status: 'pending',
        created_by: user?.id
      });

      if (error) throw error;

      toast({ title: "Rotina criada!", description: "A nova rotina foi adicionada com sucesso." });
      setIsRoutineDialogOpen(false);
      setNewRoutine({ title: '', description: '', frequency: 'daily', assigned_to: '', estimated_hours: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating routine:', error);
      toast({ title: "Erro", description: "Não foi possível criar a rotina.", variant: "destructive" });
    } finally {
      setSubmittingRoutine(false);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
    return labels[frequency] || frequency;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending: 'A Fazer', in_progress: 'Em Progresso', completed: 'Concluído' };
    return labels[status] || status;
  };

  return (
    <EquipeLayout title="Rotinas" subtitle="Tarefas recorrentes da equipe">
      <div className="flex justify-end mb-4">
        <Dialog open={isRoutineDialogOpen} onOpenChange={setIsRoutineDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Incluir Rotina
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Rotina</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRoutine} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="routine-title">Título *</Label>
                <Input
                  id="routine-title"
                  placeholder="Nome da rotina"
                  value={newRoutine.title}
                  onChange={(e) => setNewRoutine({ ...newRoutine, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="routine-description">Descrição</Label>
                <Textarea
                  id="routine-description"
                  placeholder="Detalhes da rotina"
                  value={newRoutine.description}
                  onChange={(e) => setNewRoutine({ ...newRoutine, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={newRoutine.frequency}
                    onValueChange={(value) => setNewRoutine({ ...newRoutine, frequency: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routine-hours">Horas Estimadas</Label>
                  <Input
                    id="routine-hours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Ex: 2"
                    value={newRoutine.estimated_hours}
                    onChange={(e) => setNewRoutine({ ...newRoutine, estimated_hours: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={newRoutine.assigned_to}
                  onValueChange={(value) => setNewRoutine({ ...newRoutine, assigned_to: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsRoutineDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submittingRoutine}>
                  {submittingRoutine ? 'Criando...' : 'Criar Rotina'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-semibold">
            Minhas Tarefas de Rotina
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : myRoutines.length > 0 ? (
            <div className="space-y-2">
              {myRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-teal-100 text-teal-700 border-0">
                      {getFrequencyLabel(routine.frequency)}
                    </Badge>
                    <span className="text-foreground">{routine.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {routine.estimated_hours && (
                      <span className="text-xs text-muted-foreground">{routine.estimated_hours}h</span>
                    )}
                    <Badge variant="outline">
                      {getStatusLabel(routine.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhuma rotina atribuída a você</p>
          )}
        </CardContent>
      </Card>
    </EquipeLayout>
  );
};

export default EquipeRotinas;
