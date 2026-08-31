import { useEffect, useState } from 'react';
import { FolderKanban, ListTodo, Workflow } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectBacklogTab } from '@/components/equipe/projetos/ProjectBacklogTab';
import { ProjectInfoTab } from '@/components/equipe/projetos/ProjectInfoTab';
import { ProjectProcessesTab } from '@/components/equipe/projetos/ProjectProcessesTab';
import { createEmptyProjectDraft } from '@/components/equipe/projetos/constants';
import type {
  BacklogTask,
  ExternalClient,
  GroupedEquipe,
  Process,
  Project,
  ProjectCluster,
  ProjectEditDraft,
  ProjectEquipe,
  TeamMember,
} from '@/components/equipe/projetos/types';

interface ProjectDetailsDialogProps {
  project: Project | null;
  editMode: boolean;
  activeTab: string;
  clusters: ProjectCluster[];
  externalClients: ExternalClient[];
  teamMembers: TeamMember[];
  groupedEquipes: GroupedEquipe[];
  equipes: ProjectEquipe[];
  processes: Process[];
  backlogTasks: BacklogTask[];
  loadingProcesses: boolean;
  loadingBacklog: boolean;
  onClose: () => void;
  onClearProject: () => void;
  onEditModeChange: (editMode: boolean) => void;
  onActiveTabChange: (tab: string) => void;
  onUpdateProject: (project: ProjectEditDraft) => Promise<void>;
  onDeleteProject: () => Promise<void>;
  onUpdateProjectStatus: (projectId: string, status: string) => Promise<void>;
  onNavigateSprints: (projectId: string) => void;
  onCreateProcess: () => void;
  onAdvanceProcess: (process: Process) => Promise<void>;
  onEditProcess: (process: Process) => void;
  onCreateBacklogItem: () => void;
}

const createEmptyEditProject = (): ProjectEditDraft => ({
  ...createEmptyProjectDraft(),
  status: '',
});

export const ProjectDetailsDialog = ({
  project,
  editMode,
  activeTab,
  clusters,
  externalClients,
  teamMembers,
  groupedEquipes,
  equipes,
  processes,
  backlogTasks,
  loadingProcesses,
  loadingBacklog,
  onClose,
  onClearProject,
  onEditModeChange,
  onActiveTabChange,
  onUpdateProject,
  onDeleteProject,
  onUpdateProjectStatus,
  onNavigateSprints,
  onCreateProcess,
  onAdvanceProcess,
  onEditProcess,
  onCreateBacklogItem,
}: ProjectDetailsDialogProps) => {
  const [editProject, setEditProject] = useState<ProjectEditDraft>(createEmptyEditProject);

  useEffect(() => {
    if (project && editMode) {
      setEditProject({
        name: project.name,
        description: project.description || '',
        client_name: project.client_name || '',
        external_client_id: project.external_client_id || '',
        leader_id: project.leader_id || '',
        equipe_id: project.equipe_id || '',
        cluster_id: project.cluster_id || '',
        product_service: project.product_service || '',
        project_front: project.project_front || '',
        justification_type: project.justification_type || '',
        justification_detail: project.justification_detail || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        status: project.status,
      });
    }
  }, [project, editMode]);

  return (
    <Dialog open={!!project} onOpenChange={onClose}>
      <DialogContent className="border-border max-w-4xl max-h-[90vh] overflow-y-auto">
        {project && (
          <>
            <DialogHeader>
              <DialogTitle className="text-gray-900 flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                {editMode ? 'Editar Projeto' : project.name}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={onActiveTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="info" className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Informações
                </TabsTrigger>
                <TabsTrigger value="processes" className="flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  Processos ({processes.length})
                </TabsTrigger>
                <TabsTrigger value="backlog" className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4" />
                  Backlog ({backlogTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <ProjectInfoTab
                  project={project}
                  areaName={
                    equipes.find((equipe) => equipe.id === project.equipe_id)?.area_name ??
                    project.area ??
                    ''
                  }
                  editMode={editMode}
                  clusters={clusters}
                  externalClients={externalClients}
                  teamMembers={teamMembers}
                  groupedEquipes={groupedEquipes}
                  editProject={editProject}
                  onEditProjectChange={setEditProject}
                  onEditModeChange={onEditModeChange}
                  onUpdate={onUpdateProject}
                  onDelete={onDeleteProject}
                  onUpdateStatus={onUpdateProjectStatus}
                  onCloseProject={onClearProject}
                  onNavigateSprints={onNavigateSprints}
                />
              </TabsContent>

              <TabsContent value="processes">
                <ProjectProcessesTab
                  processes={processes}
                  loading={loadingProcesses}
                  onCreateProcess={onCreateProcess}
                  onAdvanceProcess={onAdvanceProcess}
                  onEditProcess={onEditProcess}
                />
              </TabsContent>

              <TabsContent value="backlog">
                <ProjectBacklogTab
                  tasks={backlogTasks}
                  loading={loadingBacklog}
                  onCreateItem={onCreateBacklogItem}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
