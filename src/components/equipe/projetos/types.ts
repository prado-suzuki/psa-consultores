import type { Cluster } from '@/hooks/useClusters';
import type { AreaOption, EquipeOption } from '@/hooks/useEstruturaEquipesAll';
import type {
  EquipeProjeto,
  EquipeProjetoBacklogTask,
  EquipeProjetoExternalClient,
  EquipeProjetoProcesso,
  EquipeProjetoTeamMember,
} from '@/hooks/useDomainEquipeProjetosQueries';
export type { SpreadsheetRow } from '@/lib/equipeProjetos';

export type Project = EquipeProjeto;
export type Process = EquipeProjetoProcesso;
export type BacklogTask = EquipeProjetoBacklogTask;
export type ExternalClient = EquipeProjetoExternalClient;
export type TeamMember = EquipeProjetoTeamMember;
export type ProjectCluster = Cluster;
export type ProjectEquipe = EquipeOption;

export interface GroupedEquipe {
  area: AreaOption;
  equipes: EquipeOption[];
}

export interface ProjectDraft {
  name: string;
  description: string;
  client_name: string;
  external_client_id: string;
  leader_id: string;
  equipe_id: string;
  cluster_id: string;
  product_service: string;
  project_front: string;
  justification_type: string;
  justification_detail: string;
  start_date: string;
  end_date: string;
}

export interface ProjectEditDraft extends ProjectDraft {
  status: string;
}

export interface ProcessDraft {
  name: string;
  description: string;
  equipe_id: string;
  stage: string;
  priority: string;
  frequency: string;
  volume_month: string;
  financial_impact: string;
}

export type SetProjectDialogOpen = (open: boolean) => void;
