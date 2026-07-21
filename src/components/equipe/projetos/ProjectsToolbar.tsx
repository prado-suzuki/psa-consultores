import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectCreateDialog } from '@/components/equipe/projetos/ProjectCreateDialog';
import { ProjectImportDialog } from '@/components/equipe/projetos/ProjectImportDialog';
import type {
  ExternalClient,
  GroupedEquipe,
  ProjectCluster,
  ProjectDraft,
  SpreadsheetRow,
  TeamMember,
} from '@/components/equipe/projetos/types';

interface ProjectsToolbarProps {
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  createDialogOpen: boolean;
  onCreateDialogOpenChange: (open: boolean) => void;
  clusterFilter: string;
  clusters: ProjectCluster[];
  externalClients: ExternalClient[];
  teamMembers: TeamMember[];
  groupedEquipes: GroupedEquipe[];
  onCreate: (project: ProjectDraft, onCreated: () => void) => Promise<void>;
  onImport: (rows: SpreadsheetRow[], onImported: () => void) => Promise<void>;
}

export const ProjectsToolbar = ({
  viewMode,
  onViewModeChange,
  createDialogOpen,
  onCreateDialogOpenChange,
  clusterFilter,
  clusters,
  externalClients,
  teamMembers,
  groupedEquipes,
  onCreate,
  onImport,
}: ProjectsToolbarProps) => (
  <div className="flex items-center gap-2">
    <ProjectImportDialog onImport={onImport} />

    <div className="flex items-center border border-border rounded-md">
      <Button
        variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        className="rounded-r-none"
        onClick={() => onViewModeChange('cards')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        className="rounded-l-none"
        onClick={() => onViewModeChange('table')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>

    <ProjectCreateDialog
      open={createDialogOpen}
      onOpenChange={onCreateDialogOpenChange}
      clusterFilter={clusterFilter}
      clusters={clusters}
      externalClients={externalClients}
      teamMembers={teamMembers}
      groupedEquipes={groupedEquipes}
      onCreate={onCreate}
    />
  </div>
);
