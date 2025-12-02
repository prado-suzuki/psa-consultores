import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { HorasAcumuladas } from '@/components/equipe/HorasAcumuladas';
import { toast } from '@/hooks/use-toast';
import { Plus, Clock, CheckCircle2, AlertCircle, Repeat, User } from 'lucide-react';

interface Rotina {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  status: string;
  assigned_to: string | null;
  estimated_hours: number | null;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

const EquipeRotina = () => {
  const { user } = useAuth();
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRotina, setNewRotina] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    assigned_to: '',
    estimated_hours: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch team members
      const { data: members } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      
      setTeamMembers(members || []);

      // Fetch routines
      const { data: routinesData } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      setRotinas(routinesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRotina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('routines').insert({
        title: newRotina.title,
        description: newRotina.description || null,
        frequency: newRotina.frequency,
        assigned_to: newRotina.assigned_to || null,
        estimated_hours: newRotina.estimated_hours ? Number(newRotina.estimated_hours) : null,
        status: 'pending',
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Rotina criada!",
        description: "A nova rotina foi criada com sucesso.",
      });

      setIsDialogOpen(false);
      setNewRotina({ title: '', description: '', frequency: 'daily', assigned_to: '', estimated_hours: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating routine:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a rotina.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
      await supabase
        .from('routines')
        .update({ status: newStatus })
        .eq('id', id);
      
      setRotinas(rotinas.map(r => 
        r.id === id ? { ...r, status: newStatus } : r
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return null;
    const member = teamMembers.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}`.trim() : null;
  };

  const getFrequencyBadge = (frequency: string) => {
    const config: Record<string, { label: string; className: string }> = {
      daily: { label: 'Diária', className: 'bg-blue-100 text-blue-700' },
      weekly: { label: 'Semanal', className: 'bg-purple-100 text-purple-700' },
      monthly: { label: 'Mensal', className: 'bg-orange-100 text-orange-700' }
    };
    const { label, className } = config[frequency] || { label: frequency, className: 'bg-gray-100' };
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <EquipeLayout
      title="Rotina"
      subtitle="Demandas operacionais da equipe"
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Rotina
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Criar Nova Rotina</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRotina} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700">Título *</Label>
                <Input
                  id="title"
                  value={newRotina.title}
                  onChange={(e) => setNewRotina({ ...newRotina, title: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Revisão de emails"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  value={newRotina.description}
                  onChange={(e) => setNewRotina({ ...newRotina, description: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Descreva a rotina..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Frequência *</Label>
                  <Select
                    value={newRotina.frequency}
                    onValueChange={(value) => setNewRotina({ ...newRotina, frequency: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
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
                    value={newRotina.estimated_hours}
                    onChange={(e) => setNewRotina({ ...newRotina, estimated_hours: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Ex: 2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Responsável</Label>
                <Select
                  value={newRotina.assigned_to}
                  onValueChange={(value) => setNewRotina({ ...newRotina, assigned_to: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar Rotina'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Rotinas */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : rotinas.length > 0 ? (
            rotinas.map((rotina) => (
              <Card key={rotina.id} className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={rotina.status === 'done' ? 'text-green-600' : 'text-gray-400'}
                        onClick={() => toggleStatus(rotina.id, rotina.status)}
                      >
                        {rotina.status === 'done' ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <AlertCircle className="h-6 w-6" />
                        )}
                      </Button>
                      <div>
                        <h3 className={`font-medium ${rotina.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {rotina.title}
                        </h3>
                        {rotina.description && (
                          <p className="text-sm text-gray-500">{rotina.description}</p>
                        )}
                        {rotina.assigned_to && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <User className="h-3 w-3" />
                            {getMemberName(rotina.assigned_to)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rotina.estimated_hours && (
                        <Badge variant="outline" className="border-gray-300 text-gray-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {rotina.estimated_hours}h
                        </Badge>
                      )}
                      {getFrequencyBadge(rotina.frequency)}
                      <Repeat className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-16 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma rotina criada</h3>
                <p className="text-gray-500 mb-4">Crie rotinas para organizar as demandas operacionais</p>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Rotina
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Painel de Horas */}
        <div className="space-y-4">
          <HorasAcumuladas 
            showRoutines={true}
            title="Horas por Pessoa (Semanal)"
          />
        </div>
      </div>
    </EquipeLayout>
  );
};

export default EquipeRotina;
