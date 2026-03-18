import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { HorasAcumuladas } from '@/components/equipe/HorasAcumuladas';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Clock, CheckCircle2, AlertCircle, Repeat, User, Pencil, Trash2, ChevronDown, Calendar } from 'lucide-react';

interface Demanda {
  id: string;
  title: string;
  description: string | null;
  is_recurring: boolean;
  frequency: string | null;
  start_date: string | null;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  estimated_hours: number | null;
}

interface DemandItem {
  id: string;
  demand_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  assigned_to: string | null;
  estimated_hours: number | null;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

const EquipeDemandas = () => {
  const { user } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [demandItems, setDemandItems] = useState<Record<string, DemandItem[]>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());
  
  const [newDemanda, setNewDemanda] = useState({
    title: '',
    description: '',
    is_recurring: false,
    frequency: 'daily',
    start_date: '',
    due_date: '',
    assigned_to: '',
    estimated_hours: ''
  });

  // Edit state
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDemanda, setEditDemanda] = useState({
    title: '',
    description: '',
    is_recurring: false,
    frequency: 'daily',
    start_date: '',
    due_date: '',
    assigned_to: '',
    estimated_hours: ''
  });

  // Add subdemand state
  const [addingSubdemandTo, setAddingSubdemandTo] = useState<string | null>(null);
  const [newSubdemand, setNewSubdemand] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
    estimated_hours: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDemanda && isEditMode) {
      setEditDemanda({
        title: selectedDemanda.title,
        description: selectedDemanda.description || '',
        is_recurring: selectedDemanda.is_recurring,
        frequency: selectedDemanda.frequency || 'daily',
        start_date: selectedDemanda.start_date || '',
        due_date: selectedDemanda.due_date || '',
        assigned_to: selectedDemanda.assigned_to || '',
        estimated_hours: selectedDemanda.estimated_hours?.toString() || ''
      });
    }
  }, [selectedDemanda, isEditMode]);

  const fetchData = async () => {
    try {
      // Fetch team members
      const { data: members } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .order('first_name');
      
      setTeamMembers(members || []);

      // Fetch demands (routines table)
      const { data: demandasData } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      setDemandas(demandasData || []);

      // Fetch all demand items
      if (demandasData && demandasData.length > 0) {
        const { data: itemsData } = await supabase
          .from('demand_items')
          .select('*')
          .in('demand_id', demandasData.map(d => d.id))
          .order('due_date', { ascending: true });

        // Group items by demand_id
        const groupedItems: Record<string, DemandItem[]> = {};
        (itemsData || []).forEach(item => {
          if (!groupedItems[item.demand_id]) {
            groupedItems[item.demand_id] = [];
          }
          groupedItems[item.demand_id].push(item);
        });
        setDemandItems(groupedItems);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validation for non-recurring demands
    if (!newDemanda.is_recurring && !newDemanda.due_date) {
      toast({
        title: "Campo obrigatório",
        description: "Demandas não recorrentes precisam de uma data de término.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('routines').insert({
        title: newDemanda.title,
        description: newDemanda.description || null,
        is_recurring: newDemanda.is_recurring,
        frequency: newDemanda.is_recurring ? newDemanda.frequency : null,
        start_date: !newDemanda.is_recurring && newDemanda.start_date ? newDemanda.start_date : null,
        due_date: !newDemanda.is_recurring && newDemanda.due_date ? newDemanda.due_date : null,
        assigned_to: newDemanda.assigned_to || null,
        estimated_hours: newDemanda.estimated_hours ? Number(newDemanda.estimated_hours) : null,
        status: 'pending',
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Demanda criada!",
        description: "A nova demanda foi criada com sucesso.",
      });

      setIsDialogOpen(false);
      setNewDemanda({ 
        title: '', 
        description: '', 
        is_recurring: false, 
        frequency: 'daily', 
        start_date: '', 
        due_date: '', 
        assigned_to: '', 
        estimated_hours: '' 
      });
      fetchData();
    } catch (error) {
      console.error('Error creating demand:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a demanda.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDemanda = async () => {
    if (!selectedDemanda) return;

    try {
      const { error } = await supabase
        .from('routines')
        .update({
          title: editDemanda.title,
          description: editDemanda.description || null,
          is_recurring: editDemanda.is_recurring,
          frequency: editDemanda.is_recurring ? editDemanda.frequency : null,
          start_date: !editDemanda.is_recurring && editDemanda.start_date ? editDemanda.start_date : null,
          due_date: !editDemanda.is_recurring && editDemanda.due_date ? editDemanda.due_date : null,
          assigned_to: editDemanda.assigned_to || null,
          estimated_hours: editDemanda.estimated_hours ? Number(editDemanda.estimated_hours) : null
        })
        .eq('id', selectedDemanda.id);

      if (error) throw error;

      toast({
        title: "Demanda atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      setSelectedDemanda(null);
      setIsEditMode(false);
      fetchData();
    } catch (error) {
      console.error('Error updating demand:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a demanda.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDemanda = async () => {
    if (!selectedDemanda) return;

    try {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', selectedDemanda.id);

      if (error) throw error;

      toast({
        title: "Demanda excluída!",
        description: "A demanda foi removida com sucesso.",
      });

      setSelectedDemanda(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting demand:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a demanda.",
        variant: "destructive"
      });
    }
  };

  const handleAddSubdemand = async (demandId: string, parentDemand: Demanda) => {
    if (!newSubdemand.title || !newSubdemand.due_date) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e data de entrega são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Validate due date is within parent period
    if (!parentDemand.is_recurring && parentDemand.due_date) {
      if (newSubdemand.due_date > parentDemand.due_date) {
        toast({
          title: "Data inválida",
          description: "A data de entrega deve ser anterior ao prazo da demanda mãe.",
          variant: "destructive"
        });
        return;
      }
      if (parentDemand.start_date && newSubdemand.due_date < parentDemand.start_date) {
        toast({
          title: "Data inválida",
          description: "A data de entrega deve ser posterior ao início da demanda mãe.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { error } = await supabase.from('demand_items').insert({
        demand_id: demandId,
        title: newSubdemand.title,
        description: newSubdemand.description || null,
        due_date: newSubdemand.due_date,
        assigned_to: newSubdemand.assigned_to || null,
        estimated_hours: newSubdemand.estimated_hours ? Number(newSubdemand.estimated_hours) : null,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Subdemanda adicionada!",
        description: "A subdemanda foi criada com sucesso.",
      });

      setAddingSubdemandTo(null);
      setNewSubdemand({ title: '', description: '', due_date: '', assigned_to: '', estimated_hours: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding subdemand:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a subdemanda.",
        variant: "destructive"
      });
    }
  };

  const toggleSubdemandStatus = async (item: DemandItem) => {
    try {
      const newStatus = item.status === 'pending' ? 'done' : 'pending';
      await supabase
        .from('demand_items')
        .update({ status: newStatus })
        .eq('id', item.id);
      
      fetchData();
    } catch (error) {
      console.error('Error updating subdemand status:', error);
    }
  };

  const deleteSubdemand = async (itemId: string) => {
    try {
      await supabase.from('demand_items').delete().eq('id', itemId);
      toast({ title: "Subdemanda excluída" });
      fetchData();
    } catch (error) {
      console.error('Error deleting subdemand:', error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
      await supabase
        .from('routines')
        .update({ status: newStatus })
        .eq('id', id);
      
      setDemandas(demandas.map(d => 
        d.id === id ? { ...d, status: newStatus } : d
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

  const getFrequencyBadge = (frequency: string | null) => {
    if (!frequency) return null;
    const config: Record<string, { label: string; className: string }> = {
      daily: { label: 'Diária', className: 'bg-blue-100 text-blue-700' },
      weekly: { label: 'Semanal', className: 'bg-purple-100 text-purple-700' },
      monthly: { label: 'Mensal', className: 'bg-orange-100 text-orange-700' }
    };
    const { label, className } = config[frequency] || { label: frequency, className: 'bg-gray-100' };
    return <Badge className={className}>{label}</Badge>;
  };

  const formatDateRange = (startDate: string | null, dueDate: string | null) => {
    if (!dueDate) return null;
    const start = startDate ? format(new Date(startDate), 'dd/MM', { locale: ptBR }) : '';
    const end = format(new Date(dueDate), 'dd/MM', { locale: ptBR });
    return start ? `${start} - ${end}` : `até ${end}`;
  };

  const toggleExpanded = (demandId: string) => {
    const newExpanded = new Set(expandedDemands);
    if (newExpanded.has(demandId)) {
      newExpanded.delete(demandId);
    } else {
      newExpanded.add(demandId);
    }
    setExpandedDemands(newExpanded);
  };

  return (
    <EquipeLayout
      title="Demandas"
      subtitle="Demandas operacionais e de projeto da equipe"
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Demanda
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Criar Nova Demanda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDemanda} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700">Título *</Label>
                <Input
                  id="title"
                  value={newDemanda.title}
                  onChange={(e) => setNewDemanda({ ...newDemanda, title: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Relatório Trimestral"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  value={newDemanda.description}
                  onChange={(e) => setNewDemanda({ ...newDemanda, description: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Descreva a demanda..."
                />
              </div>

              {/* Recurring Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-gray-500" />
                  <Label className="text-gray-700 font-normal">Demanda Recorrente</Label>
                </div>
                <Switch 
                  checked={newDemanda.is_recurring}
                  onCheckedChange={(checked) => setNewDemanda({...newDemanda, is_recurring: checked})}
                />
              </div>

              {/* Conditional Fields */}
              {newDemanda.is_recurring ? (
                <div className="space-y-2">
                  <Label className="text-gray-700">Frequência *</Label>
                  <Select
                    value={newDemanda.frequency}
                    onValueChange={(value) => setNewDemanda({ ...newDemanda, frequency: value })}
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
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Data Início</Label>
                    <Input
                      type="date"
                      value={newDemanda.start_date}
                      onChange={(e) => setNewDemanda({ ...newDemanda, start_date: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Data Fim *</Label>
                    <Input
                      type="date"
                      value={newDemanda.due_date}
                      onChange={(e) => setNewDemanda({ ...newDemanda, due_date: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                      required={!newDemanda.is_recurring}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Responsável</Label>
                  <Select
                    value={newDemanda.assigned_to}
                    onValueChange={(value) => setNewDemanda({ ...newDemanda, assigned_to: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Selecione" />
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
                <div className="space-y-2">
                  <Label htmlFor="estimated_hours" className="text-gray-700">Horas Estimadas</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    value={newDemanda.estimated_hours}
                    onChange={(e) => setNewDemanda({ ...newDemanda, estimated_hours: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Ex: 8"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar Demanda'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* Hours Panel */}
        <HorasAcumuladas 
          showRoutines={true}
          title="Horas por Pessoa (Semanal)"
        />

        {/* Demands List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : demandas.length > 0 ? (
            demandas.map((demanda) => {
              const items = demandItems[demanda.id] || [];
              const doneItems = items.filter(i => i.status === 'done').length;
              const isExpanded = expandedDemands.has(demanda.id);

              return (
                <Card key={demanda.id} className="bg-white border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`mt-1 ${demanda.status === 'done' ? 'text-green-600' : 'text-gray-400'}`}
                          onClick={() => toggleStatus(demanda.id, demanda.status)}
                        >
                          {demanda.status === 'done' ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : (
                            <AlertCircle className="h-6 w-6" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <h3 className={`font-medium ${demanda.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {demanda.title}
                          </h3>
                          {demanda.description && (
                            <p className="text-sm text-gray-500 mt-1">{demanda.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {demanda.assigned_to && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                {getMemberName(demanda.assigned_to)}
                              </div>
                            )}
                            {demanda.estimated_hours && (
                              <Badge variant="outline" className="border-gray-300 text-gray-600 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {demanda.estimated_hours}h
                              </Badge>
                            )}
                            {demanda.is_recurring ? (
                              <>
                                {getFrequencyBadge(demanda.frequency)}
                                <Repeat className="h-4 w-4 text-gray-400" />
                              </>
                            ) : (
                              demanda.due_date && (
                                <Badge variant="outline" className="border-teal-300 bg-teal-50 text-teal-700 text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDateRange(demanda.start_date, demanda.due_date)}
                                </Badge>
                              )
                            )}
                            {items.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {doneItems}/{items.length} subdemandas
                              </Badge>
                            )}
                          </div>

                          {/* Subdemands Section */}
                          {(!demanda.is_recurring || items.length > 0) && (
                            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(demanda.id)} className="mt-3">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700">
                                  <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  Subdemandas ({items.length})
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2 space-y-2 pl-2 border-l-2 border-gray-200">
                                {items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 py-1">
                                    <Checkbox 
                                      checked={item.status === 'done'}
                                      onCheckedChange={() => toggleSubdemandStatus(item)}
                                      className="h-4 w-4"
                                    />
                                    <span className={`flex-1 text-sm ${item.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                      {item.title}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      até {format(new Date(item.due_date), 'dd/MM')}
                                    </Badge>
                                    {item.assigned_to && (
                                      <span className="text-xs text-gray-500">{getMemberName(item.assigned_to)}</span>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                                      onClick={() => deleteSubdemand(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                
                                {/* Add Subdemand Form */}
                                {addingSubdemandTo === demanda.id ? (
                                  <div className="p-3 bg-gray-50 rounded-lg space-y-3 mt-2">
                                    <Input
                                      placeholder="Título da subdemanda"
                                      value={newSubdemand.title}
                                      onChange={(e) => setNewSubdemand({ ...newSubdemand, title: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        type="date"
                                        value={newSubdemand.due_date}
                                        onChange={(e) => setNewSubdemand({ ...newSubdemand, due_date: e.target.value })}
                                        className="h-8 text-sm"
                                        min={demanda.start_date || undefined}
                                        max={demanda.due_date || undefined}
                                      />
                                      <Select
                                        value={newSubdemand.assigned_to}
                                        onValueChange={(value) => setNewSubdemand({ ...newSubdemand, assigned_to: value })}
                                      >
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue placeholder="Responsável" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                          {teamMembers.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                              {member.first_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleAddSubdemand(demanda.id, demanda)}
                                        className="h-7 text-xs"
                                      >
                                        Adicionar
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => {
                                          setAddingSubdemandTo(null);
                                          setNewSubdemand({ title: '', description: '', due_date: '', assigned_to: '', estimated_hours: '' });
                                        }}
                                        className="h-7 text-xs"
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs text-gray-500 hover:text-primary"
                                    onClick={() => setAddingSubdemandTo(demanda.id)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Adicionar Subdemanda
                                  </Button>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                        onClick={() => { setSelectedDemanda(demanda); setIsEditMode(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-white border-gray-200">
              <CardContent className="py-16 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma demanda criada</h3>
                <p className="text-gray-500 mb-4">Crie demandas para organizar o trabalho da equipe</p>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Demanda
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Demand Dialog */}
      <Dialog open={!!selectedDemanda && isEditMode} onOpenChange={() => { setSelectedDemanda(null); setIsEditMode(false); }}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          {selectedDemanda && (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-900">Editar Demanda</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Título *</Label>
                  <Input
                    value={editDemanda.title}
                    onChange={(e) => setEditDemanda({ ...editDemanda, title: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Descrição</Label>
                  <Textarea
                    value={editDemanda.description}
                    onChange={(e) => setEditDemanda({ ...editDemanda, description: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                {/* Recurring Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-gray-500" />
                    <Label className="text-gray-700 font-normal">Demanda Recorrente</Label>
                  </div>
                  <Switch 
                    checked={editDemanda.is_recurring}
                    onCheckedChange={(checked) => setEditDemanda({...editDemanda, is_recurring: checked})}
                  />
                </div>

                {editDemanda.is_recurring ? (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Frequência</Label>
                    <Select
                      value={editDemanda.frequency}
                      onValueChange={(value) => setEditDemanda({ ...editDemanda, frequency: value })}
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
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700">Data Início</Label>
                      <Input
                        type="date"
                        value={editDemanda.start_date}
                        onChange={(e) => setEditDemanda({ ...editDemanda, start_date: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">Data Fim</Label>
                      <Input
                        type="date"
                        value={editDemanda.due_date}
                        onChange={(e) => setEditDemanda({ ...editDemanda, due_date: e.target.value })}
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Responsável</Label>
                    <Select
                      value={editDemanda.assigned_to}
                      onValueChange={(value) => setEditDemanda({ ...editDemanda, assigned_to: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Selecione" />
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
                  <div className="space-y-2">
                    <Label className="text-gray-700">Horas Estimadas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editDemanda.estimated_hours}
                      onChange={(e) => setEditDemanda({ ...editDemanda, estimated_hours: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleUpdateDemanda} className="flex-1 bg-primary hover:bg-primary/90">
                    Salvar Alterações
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Todas as subdemandas também serão excluídas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDemanda} className="bg-red-600 hover:bg-red-700">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeDemandas;