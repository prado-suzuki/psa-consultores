import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { CreateProcessModal } from '@/components/equipe/CreateProcessModal';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { ImprovementHistoryModal } from '@/components/equipe/ImprovementHistoryModal';
import { ProcessImprovementModal } from '@/components/equipe/ProcessImprovementModal';
import { SOPConfigModal } from '@/components/equipe/SOPConfigModal';
import { SOPViewerModal } from '@/components/equipe/SOPViewerModal';
import { ProcessDetailsDialog } from '@/components/equipe/processos/ProcessDetailsDialog';
import { ProcessFilters } from '@/components/equipe/processos/ProcessFilters';
import { ProcessInfoTab } from '@/components/equipe/processos/ProcessInfoTab';
import { ProcessList } from '@/components/equipe/processos/ProcessList';
import { ProcessProjectsTab } from '@/components/equipe/processos/ProcessProjectsTab';
import { ProcessStagesTab } from '@/components/equipe/processos/ProcessStagesTab';
import { ProcessToolbar } from '@/components/equipe/processos/ProcessToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { useClusters } from '@/hooks/useClusters';
import { useEquipeProcessosMutations } from '@/hooks/useDomainEquipeProcessosMutations';
import {
  useEquipeProcessosCatalogClientsQuery,
  useEquipeProcessosImperativeQueries,
  useEquipeProcessosProjectsQuery,
  useEquipeProcessosQuery,
} from '@/hooks/useDomainEquipeProcessosQueries';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from '@/hooks/use-toast';
import {
  buildProcessUpdatePayload,
  filterEquipeProcesses,
  getAvailableProcessProjects,
  prepareProcessImportPayloads,
  type EquipeProcesso as Process,
  type EquipeProcessoEditForm,
  type EquipeProcessoProjectLink as ProjectProcess,
  type EquipeProcessosSpreadsheetRow,
  type EquipeProcessoStage as ProcessStage,
} from '@/lib/equipeProcessos';

const EquipeProcessos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processesQuery = useEquipeProcessosQuery(user?.id);
  const catalogClientsQuery = useEquipeProcessosCatalogClientsQuery(user?.id);
  const projectsQuery = useEquipeProcessosProjectsQuery(user?.id);
  const processes = processesQuery.data || [];
  const catalogClients = catalogClientsQuery.data || [];
  const allProjects = projectsQuery.data || [];
  const loading = processesQuery.isPending;
  const [searchTerm, setSearchTerm] = usePersistedState<string>('rotina.processos.busca', '');
  const [stageFilter, setStageFilter] = usePersistedState<string>('rotina.processos.stage', 'all');
  const [clusterFilter, setClusterFilter] = usePersistedState<string>('rotina.cluster', '');
  const { data: clusters = [] } = useClusters();
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [processStages, setProcessStages] = useState<ProcessStage[]>([]);
  const [projectProcesses, setProjectProcesses] = useState<ProjectProcess[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EquipeProcessoEditForm>({
    name: '',
    description: '',
    area: '',
    equipe_id: '',
    stage: '',
    priority: '',
    frequency: '',
    volume_month: '',
    financial_impact: '',
  });
  const [equipes, setEquipes] = useState<Array<{ id: string; name: string }>>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<EquipeProcessosSpreadsheetRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [isSOPModalOpen, setIsSOPModalOpen] = useState(false);
  const [isSOPConfigModalOpen, setIsSOPConfigModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isImprovementModalOpen, setIsImprovementModalOpen] = useState(false);
  const [newProjectLink, setNewProjectLink] = useState({
    project_id: '',
    impact_type: 'principal',
  });
  const [isAddingProjectLink, setIsAddingProjectLink] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  const {
    fetchEquipes,
    fetchProcessDetails: queryProcessDetails,
    fetchProcessSnapshot,
    patchProcessInCache,
    removeProcessFromCache,
  } = useEquipeProcessosImperativeQueries(user?.id);
  const {
    importProcessesMutation,
    updateProcessMutation,
    deleteProcessMutation,
    addProjectLinkMutation,
    removeProjectLinkMutation,
  } = useEquipeProcessosMutations(user?.id);

  const fetchProcesses = async () => {
    await processesQuery.refetch();
  };

  useEffect(() => {
    if (!processesQuery.error) return;
    toast({
      title: 'Erro',
      description: 'Não foi possível carregar os processos.',
      variant: 'destructive',
    });
  }, [processesQuery.error]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const workbook = XLSX.read(readerEvent.target?.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<EquipeProcessosSpreadsheetRow>(sheet);
        setImportData(data);
        setIsImportDialogOpen(true);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ler o arquivo.',
        variant: 'destructive',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportProcesses = async () => {
    if (importData.length === 0) return;
    setImporting(true);
    try {
      const processesToInsert = prepareProcessImportPayloads(importData, user?.id);
      if (processesToInsert.length === 0) {
        toast({
          title: 'Erro',
          description:
            "Nenhum processo válido encontrado. Verifique se a planilha tem uma coluna 'Processo' ou 'Nome'.",
          variant: 'destructive',
        });
        return;
      }
      await importProcessesMutation.mutateAsync(processesToInsert);
      toast({
        title: 'Processos importados!',
        description: `${processesToInsert.length} processos criados com sucesso.`,
      });
      setIsImportDialogOpen(false);
      setImportData([]);
      fetchProcesses();
    } catch (error) {
      console.error('Error importing processes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível importar os processos.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const fetchProcessDetails = async (processId: string) => {
    setLoadingDetails(true);
    try {
      const details = await queryProcessDetails(processId);
      setProcessStages(details.stages);
      setProjectProcesses(details.projectProcesses);
      setTaskCount(details.taskCount);
    } catch (error) {
      console.error('Error fetching process details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do processo.',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewProcess = (process: Process) => {
    setSelectedProcess(process);
    setIsEditing(false);
    fetchProcessDetails(process.id);
  };

  const startEditing = () => {
    if (!selectedProcess) return;
    setEditForm({
      name: selectedProcess.name || '',
      description: selectedProcess.description || '',
      area: selectedProcess.area || '',
      equipe_id: selectedProcess.equipe_id || '',
      stage: selectedProcess.stage || '',
      priority: selectedProcess.priority || '',
      frequency: selectedProcess.frequency || '',
      volume_month: selectedProcess.volume_month?.toString() || '',
      financial_impact: selectedProcess.financial_impact || '',
    });
    if (equipes.length === 0) {
      void fetchEquipes().then((data) => {
        if (data) setEquipes(data);
      });
    }
    setIsEditing(true);
  };

  const saveProcess = async () => {
    if (!selectedProcess) return;
    try {
      setSaving(true);
      const updates = buildProcessUpdatePayload(editForm);
      await updateProcessMutation.mutateAsync({ processId: selectedProcess.id, payload: updates });
      patchProcessInCache(selectedProcess.id, updates);
      setSelectedProcess((previous) => (previous ? { ...previous, ...updates } : null));
      setIsEditing(false);
      toast({
        title: 'Processo atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error: unknown) {
      console.error('Error saving process:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteProcess = async () => {
    if (!selectedProcess) return;
    try {
      setSaving(true);
      await deleteProcessMutation.mutateAsync(selectedProcess.id);
      removeProcessFromCache(selectedProcess.id);
      setSelectedProcess(null);
      toast({ title: 'Processo excluído', description: 'O processo foi removido com sucesso.' });
    } catch (error: unknown) {
      console.error('Error deleting process:', error);
      toast({
        title: 'Erro ao excluir',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addProjectToProcess = async () => {
    if (!selectedProcess || !newProjectLink.project_id) return;
    setIsAddingProjectLink(true);
    try {
      await addProjectLinkMutation.mutateAsync({
        processId: selectedProcess.id,
        projectId: newProjectLink.project_id,
        impactType: newProjectLink.impact_type,
      });
      toast({
        title: 'Projeto vinculado',
        description: 'O projeto foi vinculado ao processo com sucesso.',
      });
      setNewProjectLink({ project_id: '', impact_type: 'principal' });
      fetchProcessDetails(selectedProcess.id);
      fetchProcesses();
    } catch (error: unknown) {
      console.error('Error adding project to process:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível vincular o projeto.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingProjectLink(false);
    }
  };

  const removeProjectFromProcess = async (linkId: string) => {
    if (!selectedProcess) return;
    try {
      await removeProjectLinkMutation.mutateAsync(linkId);
      toast({ title: 'Vínculo removido', description: 'O projeto foi desvinculado do processo.' });
      fetchProcessDetails(selectedProcess.id);
      fetchProcesses();
    } catch (error: unknown) {
      console.error('Error removing project from process:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o vínculo.',
        variant: 'destructive',
      });
    }
  };

  const filteredProcesses = filterEquipeProcesses(processes, {
    searchTerm,
    stage: stageFilter,
    cluster: clusterFilter,
  });

  return (
    <EquipeLayout
      title="Processos"
      subtitle="Visualize e gerencie os processos mapeados"
      headerActions={
        <ProcessToolbar
          fileInputRef={fileInputRef}
          importData={importData}
          importing={importing}
          isImportDialogOpen={isImportDialogOpen}
          onFileSelect={handleFileSelect}
          onImport={handleImportProcesses}
          onImportDialogOpenChange={setIsImportDialogOpen}
          onCancelImport={() => {
            setIsImportDialogOpen(false);
            setImportData([]);
          }}
          onCreate={() => setIsCreateModalOpen(true)}
        />
      }
    >
      <ProcessFilters
        searchTerm={searchTerm}
        stageFilter={stageFilter}
        clusterFilter={clusterFilter}
        clusters={clusters}
        onSearchTermChange={setSearchTerm}
        onStageFilterChange={setStageFilter}
        onClusterFilterChange={setClusterFilter}
      />
      <ProcessList
        processes={filteredProcesses}
        catalogClients={catalogClients}
        loading={loading}
        onViewProcess={handleViewProcess}
      />
      <ProcessDetailsDialog
        process={selectedProcess}
        isEditing={isEditing}
        stageCount={processStages.length}
        projectCount={projectProcesses.length}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProcess(null);
            setIsEditing(false);
            setTaskCount(0);
          }
        }}
        onStartEditing={startEditing}
        onDelete={deleteProcess}
        infoTab={
          selectedProcess ? (
            <ProcessInfoTab
              process={selectedProcess}
              taskCount={taskCount}
              isEditing={isEditing}
              saving={saving}
              editForm={editForm}
              equipes={equipes}
              onEditFieldChange={(field, value) =>
                setEditForm((previous) => ({ ...previous, [field]: value }))
              }
              onCancelEditing={() => setIsEditing(false)}
              onSave={saveProcess}
              onGenerateScenario={() =>
                navigate(
                  `/equipe/mapeamento?tab=cenarios&processId=${selectedProcess.id}&action=new-scenario`,
                )
              }
              onViewScenarios={() =>
                navigate(`/equipe/mapeamento?tab=cenarios&processId=${selectedProcess.id}`)
              }
            />
          ) : null
        }
        stagesTab={
          selectedProcess ? (
            <ProcessStagesTab
              process={selectedProcess}
              stages={processStages}
              loading={loadingDetails}
              isAddingStage={isAddingStage}
              onAddingStageChange={setIsAddingStage}
              onRefresh={() => fetchProcessDetails(selectedProcess.id)}
              onOpenSopConfig={() => setIsSOPConfigModalOpen(true)}
              onOpenSop={() => setIsSOPModalOpen(true)}
              onOpenImprovement={() => setIsImprovementModalOpen(true)}
              onOpenHistory={() => setIsHistoryModalOpen(true)}
            />
          ) : null
        }
        projectsTab={
          selectedProcess ? (
            <ProcessProjectsTab
              projectProcesses={projectProcesses}
              availableProjects={getAvailableProcessProjects(allProjects, projectProcesses)}
              loading={loadingDetails}
              newProjectLink={newProjectLink}
              isAddingProjectLink={isAddingProjectLink}
              onNewProjectLinkChange={setNewProjectLink}
              onAddProject={addProjectToProcess}
              onRemoveProject={removeProjectFromProcess}
            />
          ) : null
        }
      />
      <CreateProcessModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchProcesses}
      />
      <SOPViewerModal
        open={isSOPModalOpen}
        onClose={() => setIsSOPModalOpen(false)}
        processName={selectedProcess?.name || ''}
        formattedContent={selectedProcess?.formatted_content || null}
        sopLink={selectedProcess?.sop_link || null}
        sopDocumentPath={selectedProcess?.sop_document_path || null}
        beforeLink={selectedProcess?.sop_before_link || null}
        beforeDocumentPath={selectedProcess?.sop_before_document_path || null}
        beforeContent={selectedProcess?.sop_before_content || null}
      />
      <SOPConfigModal
        open={isSOPConfigModalOpen}
        onClose={() => setIsSOPConfigModalOpen(false)}
        processId={selectedProcess?.id || ''}
        processName={selectedProcess?.name || ''}
        currentLink={selectedProcess?.sop_link || null}
        currentDocumentPath={selectedProcess?.sop_document_path || null}
        currentFormattedContent={selectedProcess?.formatted_content || null}
        currentBeforeLink={selectedProcess?.sop_before_link || null}
        currentBeforeDocumentPath={selectedProcess?.sop_before_document_path || null}
        currentBeforeContent={selectedProcess?.sop_before_content || null}
        onUpdated={() => {
          fetchProcesses();
          if (selectedProcess) {
            void fetchProcessSnapshot(selectedProcess.id).then((data) => {
              if (data)
                setSelectedProcess((previous) => (previous ? { ...previous, ...data } : null));
            });
          }
        }}
      />
      <ImprovementHistoryModal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        processId={selectedProcess?.id || ''}
        processName={selectedProcess?.name || ''}
      />
      <ProcessImprovementModal
        open={isImprovementModalOpen}
        onClose={() => setIsImprovementModalOpen(false)}
        processId={selectedProcess?.id || ''}
        processName={selectedProcess?.name || ''}
        baselineData={{
          time_spent_hours: selectedProcess?.time_spent_hours,
          cost_monthly: selectedProcess?.cost_monthly,
          volume_executions: selectedProcess?.volume_executions,
          people_involved: selectedProcess?.people_involved,
          evaluation_period_days: selectedProcess?.evaluation_period_days,
        }}
        onSaved={() => {
          setIsImprovementModalOpen(false);
          if (selectedProcess) fetchProcessDetails(selectedProcess.id);
        }}
      />
    </EquipeLayout>
  );
};

export default EquipeProcessos;
