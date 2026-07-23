import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import {
  ProcessCreateDialog,
  ProcessEditDialog,
} from '@/components/equipe/projetos/ProcessDialogs';
import { ProjectDetailsDialog } from '@/components/equipe/projetos/ProjectDetailsDialog';
import { ProjectFilters } from '@/components/equipe/projetos/ProjectFilters';
import { ProjectList } from '@/components/equipe/projetos/ProjectList';
import { ProjectsToolbar } from '@/components/equipe/projetos/ProjectsToolbar';
import { PROCESS_STAGES } from '@/components/equipe/projetos/constants';
import type {
  Process,
  ProcessDraft,
  Project,
  ProjectDraft,
  ProjectEditDraft,
  SpreadsheetRow,
} from '@/components/equipe/projetos/types';
import { useAuth } from '@/contexts/AuthContext';
import { useClusters } from '@/hooks/useClusters';
import {
  useEquipeProjetoMutations,
  useEquipeProjetoProcessMutations,
} from '@/hooks/useDomainEquipeProjetosMutations';
import {
  useEquipeProjetoBacklogQuery,
  useEquipeProjetoProcessesQuery,
  useEquipeProjetosExternalClientsQuery,
  useEquipeProjetosQuery,
  useEquipeProjetosTeamMembersQuery,
} from '@/hooks/useDomainEquipeProjetosQueries';
import { useEstruturaEquipesAll } from '@/hooks/useEstruturaEquipesAll';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from '@/hooks/use-toast';
import { matchCluster } from '@/lib/clusterFilter';
import { prepareProjectImportPayloads } from '@/lib/equipeProjetos';

const EquipeProjetos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [statusFilter, setStatusFilter] = usePersistedState<string>(
    'rotina.projetos.status',
    'all',
  );
  const [clusterFilter, setClusterFilter] = usePersistedState<string>('rotina.cluster', '');
  const [activeTab, setActiveTab] = useState('info');
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

  const { data: clusters = [] } = useClusters();
  const projectsQuery = useEquipeProjetosQuery(user?.id);
  const teamMembersQuery = useEquipeProjetosTeamMembersQuery(user?.id);
  const externalClientsQuery = useEquipeProjetosExternalClientsQuery(user?.id);
  const processesQuery = useEquipeProjetoProcessesQuery(user?.id, selectedProject?.id);
  const backlogQuery = useEquipeProjetoBacklogQuery(user?.id, selectedProject?.id);
  const {
    importProjectsMutation,
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    updateProjectStatusMutation,
  } = useEquipeProjetoMutations(user?.id);
  const {
    createProcessMutation,
    updateProcessMutation,
    deleteProcessMutation,
    updateProcessStageMutation,
  } = useEquipeProjetoProcessMutations(user?.id);

  const { data: projects = [], isLoading: loading, refetch: refetchProjects } = projectsQuery;
  const { data: externalClients = [] } = externalClientsQuery;
  const { data: teamMembers = [] } = teamMembersQuery;
  const { data: backlogTasks = [], isFetching: loadingBacklog } = backlogQuery;
  const {
    data: processes = [],
    isFetching: loadingProcesses,
    refetch: refetchProcesses,
  } = processesQuery;

  const { data: estrutura } = useEstruturaEquipesAll();
  const equipesList = estrutura?.equipes ?? [];
  const groupedEquipes = estrutura?.grouped ?? [];

  const filteredProjects = projects.filter((project) => {
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesStatus && matchCluster(clusterFilter, project.cluster_id);
  });

  const handleImportProjects = async (importData: SpreadsheetRow[], onImported: () => void) => {
    try {
      const uniqueProjects = prepareProjectImportPayloads(importData, user?.id);

      if (uniqueProjects.length === 0) {
        toast({
          title: 'Erro',
          description:
            "Nenhum projeto válido encontrado. Verifique se a planilha tem uma coluna 'Projeto' ou 'Nome'.",
          variant: 'destructive',
        });
        return;
      }

      await importProjectsMutation.mutateAsync(uniqueProjects);

      toast({
        title: 'Projetos importados!',
        description: `${uniqueProjects.length} projetos únicos criados com sucesso.`,
      });

      onImported();
      void refetchProjects();
    } catch (error) {
      console.error('Error importing projects:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível importar os projetos.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateProject = async (newProject: ProjectDraft, onCreated: () => void) => {
    if (!newProject.cluster_id) {
      toast({
        title: 'Cluster obrigatório',
        description: 'Selecione o cluster do projeto para que ele apareça no MAPA.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createProjectMutation.mutateAsync({
        name: newProject.name,
        description: newProject.description || null,
        client_name: newProject.client_name || null,
        external_client_id: newProject.external_client_id || null,
        leader_id: newProject.leader_id || null,
        equipe_id: newProject.equipe_id || null,
        cluster_id: newProject.cluster_id,
        product_service: newProject.product_service || null,
        project_front: newProject.project_front || null,
        justification_type: newProject.justification_type || null,
        justification_detail: newProject.justification_detail || null,
        start_date: newProject.start_date || null,
        end_date: newProject.end_date || null,
        status: 'active',
        created_by: user?.id,
      });

      toast({
        title: 'Projeto criado!',
        description: 'O novo projeto foi criado com sucesso.',
      });

      onCreated();
      void refetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o projeto.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProject = async (editProject: ProjectEditDraft) => {
    if (!selectedProject) return;

    if (!editProject.cluster_id) {
      toast({
        title: 'Cluster obrigatório',
        description: 'Selecione o cluster do projeto para que ele apareça no MAPA.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateProjectMutation.mutateAsync({
        projectId: selectedProject.id,
        payload: {
          name: editProject.name,
          description: editProject.description || null,
          client_name: editProject.client_name || null,
          external_client_id: editProject.external_client_id || null,
          leader_id: editProject.leader_id || null,
          equipe_id: editProject.equipe_id || null,
          cluster_id: editProject.cluster_id,
          product_service: editProject.product_service || null,
          project_front: editProject.project_front || null,
          justification_type: editProject.justification_type || null,
          justification_detail: editProject.justification_detail || null,
          start_date: editProject.start_date || null,
          end_date: editProject.end_date || null,
          status: editProject.status,
        },
      });

      toast({
        title: 'Projeto atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });

      setSelectedProject(null);
      setIsEditMode(false);
      void refetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o projeto.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      await deleteProjectMutation.mutateAsync(selectedProject.id);
      toast({
        title: 'Projeto excluído!',
        description: 'O projeto foi removido com sucesso.',
      });
      setSelectedProject(null);
      void refetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o projeto.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateProcess = async (newProcess: ProcessDraft, onCreated: () => void) => {
    if (!selectedProject) {
      toast({
        title: 'Projeto obrigatório',
        description: 'Selecione um projeto antes de criar o processo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createProcessMutation.mutateAsync({
        name: newProcess.name,
        description: newProcess.description || null,
        equipe_id: newProcess.equipe_id || null,
        stage: newProcess.stage,
        priority: newProcess.priority || null,
        frequency: newProcess.frequency || null,
        volume_month: newProcess.volume_month ? Number(newProcess.volume_month) : null,
        financial_impact: newProcess.financial_impact || null,
        project_id: selectedProject.id,
        cluster_id: selectedProject.cluster_id,
        created_by: user?.id,
      });

      toast({
        title: 'Processo criado!',
        description: selectedProject.cluster_id
          ? 'O novo processo foi adicionado ao projeto.'
          : 'Processo criado, mas o projeto não tem cluster — ele não aparecerá no MAPA até o projeto receber um cluster.',
        variant: selectedProject.cluster_id ? undefined : 'destructive',
      });

      onCreated();
      void refetchProcesses();
    } catch (error) {
      console.error('Error creating process:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o processo.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProcess = async (editProcess: ProcessDraft) => {
    if (!selectedProcess) return;

    try {
      await updateProcessMutation.mutateAsync({
        processId: selectedProcess.id,
        payload: {
          name: editProcess.name,
          description: editProcess.description || null,
          equipe_id: editProcess.equipe_id || null,
          stage: editProcess.stage,
          priority: editProcess.priority || null,
          frequency: editProcess.frequency || null,
          volume_month: editProcess.volume_month ? Number(editProcess.volume_month) : null,
          financial_impact: editProcess.financial_impact || null,
        },
      });

      toast({
        title: 'Processo atualizado!',
        description: 'As alterações foram salvas.',
      });
      setSelectedProcess(null);
      void refetchProcesses();
    } catch (error) {
      console.error('Error updating process:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o processo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProcess = async () => {
    if (!selectedProcess) return;

    try {
      await deleteProcessMutation.mutateAsync(selectedProcess.id);
      toast({
        title: 'Processo excluído!',
        description: 'O processo foi removido.',
      });
      setSelectedProcess(null);
      void refetchProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o processo.',
        variant: 'destructive',
      });
    }
  };

  const advanceProcessStage = async (process: Process) => {
    const currentIndex = PROCESS_STAGES.findIndex((stage) => stage.value === process.stage);
    if (currentIndex < PROCESS_STAGES.length - 1) {
      const nextStage = PROCESS_STAGES[currentIndex + 1].value;
      try {
        await updateProcessStageMutation.mutateAsync({
          processId: process.id,
          stage: nextStage,
        });
        void refetchProcesses();
        toast({
          title: 'Estágio avançado!',
          description: `Processo movido para ${PROCESS_STAGES[currentIndex + 1].label}.`,
        });
      } catch (error) {
        console.error('Error advancing process:', error);
      }
    }
  };

  const updateProjectStatus = async (projectId: string, status: string) => {
    try {
      await updateProjectStatusMutation.mutateAsync({ projectId, status });
      void refetchProjects();
      toast({
        title: 'Projeto atualizado!',
        description: `Status alterado para ${status === 'active' ? 'ativo' : status === 'completed' ? 'concluído' : status === 'blocked' ? 'bloqueado' : 'arquivado'}.`,
      });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleSelectProject = (project: Project, editMode: boolean) => {
    setSelectedProject(project);
    setIsEditMode(editMode);
    setActiveTab('info');
  };

  const handleCloseProject = () => {
    setSelectedProject(null);
    setIsEditMode(false);
    setActiveTab('info');
  };

  return (
    <EquipeLayout
      title="Projetos"
      subtitle={`${filteredProjects.length} projetos encontrados`}
      headerActions={
        <ProjectsToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          createDialogOpen={isDialogOpen}
          onCreateDialogOpenChange={setIsDialogOpen}
          clusterFilter={clusterFilter}
          clusters={clusters}
          externalClients={externalClients}
          teamMembers={teamMembers}
          groupedEquipes={groupedEquipes}
          onCreate={handleCreateProject}
          onImport={handleImportProjects}
        />
      }
    >
      <ProjectFilters
        statusFilter={statusFilter}
        clusterFilter={clusterFilter}
        clusters={clusters}
        onStatusFilterChange={setStatusFilter}
        onClusterFilterChange={setClusterFilter}
      />

      <ProjectList
        projects={projects}
        filteredProjects={filteredProjects}
        clusters={clusters}
        loading={loading}
        viewMode={viewMode}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setIsDialogOpen(true)}
      />

      <ProjectDetailsDialog
        project={selectedProject}
        editMode={isEditMode}
        activeTab={activeTab}
        clusters={clusters}
        externalClients={externalClients}
        teamMembers={teamMembers}
        groupedEquipes={groupedEquipes}
        equipes={equipesList}
        processes={processes}
        backlogTasks={backlogTasks}
        loadingProcesses={loadingProcesses}
        loadingBacklog={loadingBacklog}
        onClose={handleCloseProject}
        onClearProject={() => setSelectedProject(null)}
        onEditModeChange={setIsEditMode}
        onActiveTabChange={setActiveTab}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onUpdateProjectStatus={updateProjectStatus}
        onNavigateSprints={(projectId) => {
          setSelectedProject(null);
          navigate(`/equipe/sprints?project=${projectId}`);
        }}
        onCreateProcess={() => setIsProcessDialogOpen(true)}
        onAdvanceProcess={advanceProcessStage}
        onEditProcess={setSelectedProcess}
        onCreateBacklogItem={() => {
          setSelectedProject(null);
          navigate('/equipe/backlog');
        }}
      />

      <ProcessCreateDialog
        open={isProcessDialogOpen}
        project={selectedProject}
        groupedEquipes={groupedEquipes}
        onOpenChange={setIsProcessDialogOpen}
        onCreate={handleCreateProcess}
      />

      <ProcessEditDialog
        process={selectedProcess}
        groupedEquipes={groupedEquipes}
        onClose={() => setSelectedProcess(null)}
        onUpdate={handleUpdateProcess}
        onDelete={handleDeleteProcess}
      />
    </EquipeLayout>
  );
};

export default EquipeProjetos;
