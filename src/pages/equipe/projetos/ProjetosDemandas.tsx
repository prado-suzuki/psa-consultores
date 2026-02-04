import { useState, useMemo } from 'react';
import { ProjetosLayout } from '@/components/equipe/projetos/ProjetosLayout';
import { WorkPackageFilters } from '@/components/projetos/WorkPackageFilters';
import { WorkPackageList } from '@/components/projetos/WorkPackageList';
import { WorkPackageDetail } from '@/components/projetos/WorkPackageDetail';
import { WorkPackageForm } from '@/components/projetos/WorkPackageForm';
import { 
  useWorkPackages, 
  useWorkPackage,
  useWorkPackageActivities,
  useCreateWorkPackage,
  useUpdateWorkPackage,
  useAddWorkPackageComment
} from '@/hooks/useWorkPackages';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkPackage, WorkPackageStatus, WorkPackageArea } from '@/types/workPackage';

type FilterState = {
  status?: WorkPackageStatus[];
  area?: WorkPackageArea[];
  assigned_to?: string;
  created_by?: string;
};

const ProjetosDemandas = () => {
  const { user } = useAuth();
  const [activeFilterId, setActiveFilterId] = useState('todos_abertos');
  const [filters, setFilters] = useState<FilterState>({ 
    status: ['novo', 'pendente_agendamento', 'agendado', 'em_progresso', 'em_revisao'] 
  });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WorkPackage | null>(null);

  // Queries
  const { data: workPackages = [], isLoading } = useWorkPackages(filters);
  const { data: selectedPackage, isLoading: isLoadingSelected } = useWorkPackage(selectedId);
  const { data: activities = [], isLoading: isLoadingActivities } = useWorkPackageActivities(selectedId);

  // Mutations
  const createMutation = useCreateWorkPackage();
  const updateMutation = useUpdateWorkPackage();
  const addCommentMutation = useAddWorkPackageComment();

  // Navigation helpers
  const currentIndex = useMemo(() => {
    if (!selectedId) return -1;
    return workPackages.findIndex((wp) => wp.id === selectedId);
  }, [workPackages, selectedId]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < workPackages.length - 1;

  const handleFilterChange = (filterId: string, filter?: FilterState) => {
    setActiveFilterId(filterId);
    setFilters(filter || {});
    setSelectedId(undefined);
  };

  const handleSelect = (wp: WorkPackage) => {
    setSelectedId(wp.id);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < workPackages.length) {
      setSelectedId(workPackages[newIndex].id);
    }
  };

  const handleStatusChange = (status: WorkPackageStatus) => {
    if (selectedId && selectedPackage) {
      updateMutation.mutate({
        id: selectedId,
        data: { status },
        oldData: selectedPackage,
      });
    }
  };

  const handleAddComment = (comment: string) => {
    if (selectedId) {
      addCommentMutation.mutate({ workPackageId: selectedId, comment });
    }
  };

  const handleCreateNew = () => {
    setEditingPackage(null);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: Partial<WorkPackage>) => {
    if (editingPackage) {
      updateMutation.mutate(
        { id: editingPackage.id, data, oldData: editingPackage },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  return (
    <ProjetosLayout 
      title="Demandas" 
      subtitle="Pacotes de trabalho e gerenciamento de tarefas"
    >
      <div className="flex h-[calc(100vh-180px)] -m-6 overflow-hidden">
        {/* Filters Sidebar */}
        <WorkPackageFilters
          activeFilter={activeFilterId}
          onFilterChange={handleFilterChange}
          currentUserId={user?.id}
        />

        {/* Main List */}
        <div className="flex-1 bg-white border-r border-slate-200">
          <WorkPackageList
            workPackages={workPackages}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
          />
        </div>

        {/* Detail Panel */}
        {selectedId && (
          <WorkPackageDetail
            workPackage={selectedPackage || null}
            activities={activities}
            isLoading={isLoadingSelected}
            isLoadingActivities={isLoadingActivities}
            onClose={() => setSelectedId(undefined)}
            onNavigate={handleNavigate}
            onStatusChange={handleStatusChange}
            onAddComment={handleAddComment}
            isAddingComment={addCommentMutation.isPending}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        )}
      </div>

      {/* Create/Edit Form */}
      <WorkPackageForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingPackage}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </ProjetosLayout>
  );
};

export default ProjetosDemandas;
