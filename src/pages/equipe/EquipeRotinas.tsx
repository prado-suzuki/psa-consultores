import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChevronDown, ListChecks, AlarmClock, AlertTriangle, CalendarDays } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import { useCreateRoutine, useDomainRotinas } from '@/hooks/useDomainRotinas';

const FREQUENCY_ORDER = ['daily', 'weekly', 'monthly'] as const;
const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDueStatus = (dueDate: string | null) => {
  if (!dueDate) return { label: 'Sem prazo', className: 'bg-slate-100 text-slate-600 border-0' };
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = startOfToday();
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Atrasada', className: 'bg-red-100 text-red-700 border-0' };
  if (diffDays <= 2) return { label: 'Em breve', className: 'bg-amber-100 text-amber-700 border-0' };
  if (diffDays <= 7) return { label: 'Nesta semana', className: 'bg-blue-100 text-blue-700 border-0' };
  return { label: 'No prazo', className: 'bg-emerald-100 text-emerald-700 border-0' };
};

const EquipeRotinas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { teamMembers, myRoutines, isLoading: loading, error: routinesDataError } =
    useDomainRotinas(user?.id);
  const createRoutine = useCreateRoutine();
  const [isRoutineDialogOpen, setIsRoutineDialogOpen] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    assigned_to: '',
    estimated_hours: ''
  });

  useEffect(() => {
    if (routinesDataError) {
      console.error('Error fetching routines data:', routinesDataError);
    }
  }, [routinesDataError]);

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createRoutine.isPending || !newRoutine.title.trim()) {
      toast({ title: "Erro", description: "Preencha o título da rotina.", variant: "destructive" });
      return;
    }

    try {
      await createRoutine.mutateAsync({
        title: newRoutine.title.trim(),
        description: newRoutine.description.trim() || null,
        is_recurring: true,
        frequency: newRoutine.frequency,
        assigned_to: newRoutine.assigned_to || user?.id || null,
        estimated_hours: newRoutine.estimated_hours ? Number(newRoutine.estimated_hours) : null,
        status: 'pending',
        created_by: user?.id
      });

      toast({ title: "Rotina criada!", description: "A nova rotina foi adicionada com sucesso." });
      setIsRoutineDialogOpen(false);
      setNewRoutine({ title: '', description: '', frequency: 'daily', assigned_to: '', estimated_hours: '' });
    } catch (error) {
      console.error('Error creating routine:', error);
      toast({ title: "Erro", description: "Não foi possível criar a rotina.", variant: "destructive" });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending: 'A Fazer', in_progress: 'Em Progresso', completed: 'Concluído' };
    return labels[status] || status;
  };

  const totalRotinas = myRoutines.length;
  const today = startOfToday();
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const rotinasAtrasadas = myRoutines.filter((r) => {
    if (!r.due_date) return false;
    return new Date(r.due_date) < today;
  }).length;

  const rotinasNaSemana = myRoutines.filter((r) => {
    if (!r.due_date) return false;
    const d = new Date(r.due_date);
    return d >= today && d <= in7Days;
  }).length;

  const rotinasDiarias = myRoutines.filter((r) => r.frequency === 'daily').length;

  const groupedRoutines = FREQUENCY_ORDER.map((freq) => ({
    frequency: freq,
    label: FREQUENCY_LABELS[freq],
    items: myRoutines.filter((r) => r.frequency === freq),
  })).filter((g) => g.items.length > 0);

  const ungroupedRoutines = myRoutines.filter(
    (r) => !FREQUENCY_ORDER.includes(r.frequency as typeof FREQUENCY_ORDER[number]),
  );

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
                <Label htmlFor="routine-title">Título <RequiredMark /></Label>
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
                <Button type="submit" disabled={createRoutine.isPending}>
                  {createRoutine.isPending ? 'Criando...' : 'Criar Rotina'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                <ListChecks className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalRotinas}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vencem na semana</CardTitle>
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{rotinasNaSemana}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{rotinasAtrasadas}</div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Diárias</CardTitle>
                <AlarmClock className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rotinasDiarias}</div>
              </CardContent>
            </Card>
          </div>

          {myRoutines.length === 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent>
                <p className="text-muted-foreground text-center py-8">Nenhuma rotina atribuída a você</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {groupedRoutines.map((group) => (
                <Collapsible key={group.frequency} defaultOpen>
                  <Card className="border-border shadow-sm">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          {group.label}
                          <Badge variant="outline" className="font-normal">{group.items.length}</Badge>
                        </CardTitle>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {group.items.map((routine) => {
                            const due = getDueStatus(routine.due_date);
                            return (
                              <div
                                key={routine.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Badge className={due.className}>{due.label}</Badge>
                                  <span className="text-foreground truncate">{routine.title}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {routine.estimated_hours && (
                                    <span className="text-xs text-muted-foreground">{routine.estimated_hours}h</span>
                                  )}
                                  <Badge variant="outline">{getStatusLabel(routine.status)}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}

              {ungroupedRoutines.length > 0 && (
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Outras frequências</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ungroupedRoutines.map((routine) => {
                        const due = getDueStatus(routine.due_date);
                        return (
                          <div
                            key={routine.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Badge className={due.className}>{due.label}</Badge>
                              <span className="text-foreground truncate">{routine.title}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {routine.estimated_hours && (
                                <span className="text-xs text-muted-foreground">{routine.estimated_hours}h</span>
                              )}
                              <Badge variant="outline">{getStatusLabel(routine.status)}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </EquipeLayout>
  );
};

export default EquipeRotinas;
