import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { HorasAcumuladas } from '@/components/equipe/HorasAcumuladas';
import {
  CreateDemandDialog,
  EditDemandDialog,
  type DemandTeamMember,
} from '@/components/equipe/demandas/DemandDialogs';
import { DemandList } from '@/components/equipe/demandas/DemandList';
import { toast } from '@/hooks/use-toast';
import { useEquipeDemandasQuery } from '@/hooks/useDomainEquipeDemandasQueries';
import {
  useEquipeDemandaItemMutations,
  useEquipeDemandaParentMutations,
} from '@/hooks/useDomainEquipeDemandasMutations';
import {
  buildCreateRoutinePayload,
  buildDemandItemPayload,
  buildRoutinePayload,
  EMPTY_DEMANDA_DRAFT,
  EMPTY_SUBDEMAND_DRAFT,
  patchDemandStatus,
  toggledDemandStatus,
  validateSubdemandDate,
  type DemandItemsByDemand,
  type EquipeDemanda,
  type EquipeDemandItem,
} from '@/lib/equipeDemandas';

const EquipeDemandas = () => {
  const { user } = useAuth();
  const [demandas, setDemandas] = useState<EquipeDemanda[]>([]);
  const [demandItems, setDemandItems] = useState<DemandItemsByDemand>({});
  const [teamMembers, setTeamMembers] = useState<DemandTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedDemands, setExpandedDemands] = useState<Set<string>>(new Set());
  const [newDemanda, setNewDemanda] = useState({ ...EMPTY_DEMANDA_DRAFT });
  const [selectedDemanda, setSelectedDemanda] = useState<EquipeDemanda | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDemanda, setEditDemanda] = useState({ ...EMPTY_DEMANDA_DRAFT });
  const [addingSubdemandTo, setAddingSubdemandTo] = useState<string | null>(null);
  const [newSubdemand, setNewSubdemand] = useState({ ...EMPTY_SUBDEMAND_DRAFT });
  const dataQuery = useEquipeDemandasQuery(user?.id, {
    onTeamMembers: setTeamMembers,
    onDemandas: setDemandas,
    onDemandItems: setDemandItems,
    onComplete: () => setLoading(false),
  });
  const {
    createRoutineMutation,
    updateRoutineMutation,
    deleteRoutineMutation,
    updateRoutineStatusMutation,
  } = useEquipeDemandaParentMutations(user?.id);
  const { createItemMutation, updateItemStatusMutation, deleteItemMutation } =
    useEquipeDemandaItemMutations(user?.id);

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
        estimated_hours: selectedDemanda.estimated_hours?.toString() || '',
      });
    }
  }, [selectedDemanda, isEditMode]);

  const fetchData = () => {
    void dataQuery.refetch();
  };

  const handleCreateDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!newDemanda.is_recurring && !newDemanda.due_date) {
      toast({
        title: 'Campo obrigatório',
        description: 'Demandas não recorrentes precisam de uma data de término.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await createRoutineMutation.mutateAsync(buildCreateRoutinePayload(newDemanda, user?.id));
      toast({ title: 'Demanda criada!', description: 'A nova demanda foi criada com sucesso.' });
      setIsDialogOpen(false);
      setNewDemanda({ ...EMPTY_DEMANDA_DRAFT });
      fetchData();
    } catch (error) {
      console.error('Error creating demand:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a demanda.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDemanda = async () => {
    if (!selectedDemanda) return;
    try {
      await updateRoutineMutation.mutateAsync({
        id: selectedDemanda.id,
        payload: buildRoutinePayload(editDemanda),
      });
      toast({
        title: 'Demanda atualizada!',
        description: 'As alterações foram salvas com sucesso.',
      });
      setSelectedDemanda(null);
      setIsEditMode(false);
      fetchData();
    } catch (error) {
      console.error('Error updating demand:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a demanda.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDemanda = async () => {
    if (!selectedDemanda) return;
    try {
      await deleteRoutineMutation.mutateAsync(selectedDemanda.id);
      toast({ title: 'Demanda excluída!', description: 'A demanda foi removida com sucesso.' });
      setSelectedDemanda(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting demand:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a demanda.',
        variant: 'destructive',
      });
    }
  };

  const handleAddSubdemand = async (demandId: string, parentDemand: EquipeDemanda) => {
    if (!newSubdemand.title || !newSubdemand.due_date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Título e data de entrega são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    const dateValidation = validateSubdemandDate(newSubdemand.due_date, parentDemand);
    if (dateValidation) {
      if (dateValidation === 'after-parent-due-date') {
        toast({
          title: 'Data inválida',
          description: 'A data de entrega deve ser anterior ao prazo da demanda mãe.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Data inválida',
          description: 'A data de entrega deve ser posterior ao início da demanda mãe.',
          variant: 'destructive',
        });
      }
      return;
    }
    try {
      await createItemMutation.mutateAsync(buildDemandItemPayload(demandId, newSubdemand));
      toast({
        title: 'Subdemanda adicionada!',
        description: 'A subdemanda foi criada com sucesso.',
      });
      setAddingSubdemandTo(null);
      setNewSubdemand({ ...EMPTY_SUBDEMAND_DRAFT });
      fetchData();
    } catch (error) {
      console.error('Error adding subdemand:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a subdemanda.',
        variant: 'destructive',
      });
    }
  };

  const toggleSubdemandStatus = async (item: EquipeDemandItem) => {
    try {
      await updateItemStatusMutation.mutateAsync({
        id: item.id,
        status: toggledDemandStatus(item.status),
      });
      fetchData();
    } catch (error) {
      console.error('Error updating subdemand status:', error);
    }
  };

  const deleteSubdemand = async (itemId: string) => {
    try {
      await deleteItemMutation.mutateAsync(itemId);
      toast({ title: 'Subdemanda excluída' });
      fetchData();
    } catch (error) {
      console.error('Error deleting subdemand:', error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = toggledDemandStatus(currentStatus);
      await updateRoutineStatusMutation.mutateAsync({ id, status: newStatus });
      setDemandas(patchDemandStatus(demandas, id, newStatus));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleExpanded = (demandId: string) => {
    const newExpanded = new Set(expandedDemands);
    if (newExpanded.has(demandId)) newExpanded.delete(demandId);
    else newExpanded.add(demandId);
    setExpandedDemands(newExpanded);
  };

  return (
    <EquipeLayout
      title="Demandas"
      subtitle="Demandas operacionais e de projeto da equipe"
      headerActions={
        <CreateDemandDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          draft={newDemanda}
          setDraft={setNewDemanda}
          teamMembers={teamMembers}
          submitting={submitting}
          onSubmit={handleCreateDemanda}
        />
      }
    >
      <div className="space-y-6">
        <HorasAcumuladas showRoutines={true} title="Horas por Pessoa (Semanal)" />
        <DemandList
          loading={loading}
          demands={demandas}
          demandItems={demandItems}
          teamMembers={teamMembers}
          expandedDemands={expandedDemands}
          addingSubdemandTo={addingSubdemandTo}
          setAddingSubdemandTo={setAddingSubdemandTo}
          subdemandDraft={newSubdemand}
          setSubdemandDraft={setNewSubdemand}
          onCreateDemand={() => setIsDialogOpen(true)}
          onEditDemand={(demand) => {
            setSelectedDemanda(demand);
            setIsEditMode(true);
          }}
          onToggleExpanded={toggleExpanded}
          onToggleStatus={toggleStatus}
          onAddSubdemand={handleAddSubdemand}
          onToggleSubdemandStatus={toggleSubdemandStatus}
          onDeleteSubdemand={deleteSubdemand}
        />
      </div>

      <EditDemandDialog
        selectedDemand={selectedDemanda}
        editMode={isEditMode}
        draft={editDemanda}
        setDraft={setEditDemanda}
        teamMembers={teamMembers}
        onClose={() => {
          setSelectedDemanda(null);
          setIsEditMode(false);
        }}
        onUpdate={handleUpdateDemanda}
        onDelete={handleDeleteDemanda}
      />
    </EquipeLayout>
  );
};

export default EquipeDemandas;
