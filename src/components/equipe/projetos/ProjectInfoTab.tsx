import {
  AlertCircle,
  Archive,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { parseDate } from '@/lib/dateUtils';
import { JUSTIFICATION_TYPES, PROJECT_FRONTS } from '@/components/equipe/projetos/constants';
import {
  extractPriority,
  getAreaBadge,
  getPriorityBadge,
  getStatusBadge,
} from '@/components/equipe/projetos/projectPresentation';
import type {
  ExternalClient,
  GroupedEquipe,
  Project,
  ProjectCluster,
  ProjectEditDraft,
  TeamMember,
} from '@/components/equipe/projetos/types';

/**
 * `YYYY-MM-DD` como DD/MM/AAAA. Via `parseDate`, e não `new Date(iso)`, que lê a
 * data como UTC e mostra o dia anterior no fuso de Brasília.
 */
const dataBR = (iso: string) => {
  const data = parseDate(iso);
  return data.toLocaleDateString('pt-BR');
};

interface ProjectInfoTabProps {
  project: Project;
  areaName: string;
  editMode: boolean;
  clusters: ProjectCluster[];
  externalClients: ExternalClient[];
  teamMembers: TeamMember[];
  groupedEquipes: GroupedEquipe[];
  editProject: ProjectEditDraft;
  onEditProjectChange: (project: ProjectEditDraft) => void;
  onEditModeChange: (editMode: boolean) => void;
  onUpdate: (project: ProjectEditDraft) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateStatus: (projectId: string, status: string) => Promise<void>;
  onCloseProject: () => void;
  onNavigateSprints: (projectId: string) => void;
}

export const ProjectInfoTab = ({
  project,
  areaName,
  editMode,
  clusters,
  externalClients,
  teamMembers,
  groupedEquipes,
  editProject,
  onEditProjectChange,
  onEditModeChange,
  onUpdate,
  onDelete,
  onUpdateStatus,
  onCloseProject,
  onNavigateSprints,
}: ProjectInfoTabProps) => {
  if (editMode) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-700">Nome do Projeto *</Label>
          <Input
            value={editProject.name}
            onChange={(event) => onEditProjectChange({ ...editProject, name: event.target.value })}
            className="text-gray-900"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Cluster *</Label>
          <Select
            value={editProject.cluster_id || ''}
            onValueChange={(value) => onEditProjectChange({ ...editProject, cluster_id: value })}
          >
            <SelectTrigger className="text-gray-900">
              <SelectValue placeholder="Selecione o cluster" />
            </SelectTrigger>
            <SelectContent className="border-border">
              {clusters
                .filter((cluster) => cluster.ativo)
                .map((cluster) => (
                  <SelectItem key={cluster.id} value={cluster.id}>
                    {cluster.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {!editProject.cluster_id && (
            <p className="text-xs text-warning">
              Este projeto está sem cluster — ele não aparece no MAPA. Selecione um para corrigir.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Cliente PSA</Label>
            <Select
              value={editProject.external_client_id || ''}
              onValueChange={(value) => {
                const client = externalClients.find((item) => item.id === value);
                onEditProjectChange({
                  ...editProject,
                  external_client_id: value,
                  client_name: client?.nome || editProject.client_name,
                });
              }}
            >
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="border-border">
                {externalClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Líder Interno</Label>
            <Select
              value={editProject.leader_id || ''}
              onValueChange={(value) => onEditProjectChange({ ...editProject, leader_id: value })}
            >
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Selecione o líder" />
              </SelectTrigger>
              <SelectContent className="border-border">
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Equipe responsável</Label>
            <Select
              value={editProject.equipe_id || ''}
              onValueChange={(value) => onEditProjectChange({ ...editProject, equipe_id: value })}
            >
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent className="border-border">
                {groupedEquipes.map((group) => (
                  <div key={group.area.id}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {group.area.name}
                    </div>
                    {group.equipes.map((equipe) => (
                      <SelectItem key={equipe.id} value={equipe.id}>
                        {equipe.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Produto/Serviço</Label>
            <Input
              value={editProject.product_service || ''}
              onChange={(event) =>
                onEditProjectChange({ ...editProject, product_service: event.target.value })
              }
              placeholder="Ex: Auditoria Fiscal, BI"
              className="text-gray-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Frente do Projeto</Label>
          <Select
            value={editProject.project_front || ''}
            onValueChange={(value) => onEditProjectChange({ ...editProject, project_front: value })}
          >
            <SelectTrigger className="text-gray-900">
              <SelectValue placeholder="Selecione a frente" />
            </SelectTrigger>
            <SelectContent className="border-border">
              {PROJECT_FRONTS.map((front) => (
                <SelectItem key={front.value} value={front.value}>
                  {front.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Justificativa do Projeto</Label>
          <div className="grid grid-cols-2 gap-2">
            {JUSTIFICATION_TYPES.map((justification) => (
              <div
                key={justification.value}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  editProject.justification_type === justification.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() =>
                  onEditProjectChange({ ...editProject, justification_type: justification.value })
                }
              >
                <div className="font-medium text-sm">{justification.label}</div>
                <div className="text-xs text-muted-foreground">{justification.description}</div>
              </div>
            ))}
          </div>
        </div>

        {editProject.justification_type && (
          <div className="space-y-2">
            <Label className="text-gray-700">Detalhamento da Justificativa</Label>
            <Textarea
              value={editProject.justification_detail || ''}
              onChange={(event) =>
                onEditProjectChange({ ...editProject, justification_detail: event.target.value })
              }
              placeholder="Descreva o impacto esperado, métricas, economia estimada..."
              rows={3}
              className="text-gray-900"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-gray-700">Descrição</Label>
          <Textarea
            value={editProject.description}
            onChange={(event) =>
              onEditProjectChange({ ...editProject, description: event.target.value })
            }
            className="text-gray-900"
            rows={3}
          />
        </div>

        {/* Período em leitura: ele vem da Ordem de Serviço vinculada, como no
            modal de cadastro de projeto. Enquanto era editável aqui, esta tela
            era o caminho por onde o projeto passava a divergir da OS que o
            originou — duas datas para o mesmo período, e nenhuma vencendo. */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Data Início</Label>
            <Input
              value={editProject.start_date ? dataBR(editProject.start_date) : '—'}
              readOnly
              disabled
              className="cursor-not-allowed bg-muted text-gray-900"
              title="Herdada da Ordem de Serviço vinculada. Para alterar, edite a OS."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Data Fim</Label>
            <Input
              value={editProject.end_date ? dataBR(editProject.end_date) : '—'}
              readOnly
              disabled
              className="cursor-not-allowed bg-muted text-gray-900"
              title="Herdada da Ordem de Serviço vinculada. Para alterar, edite a OS."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700">Status</Label>
          <Select
            value={editProject.status}
            onValueChange={(value) => onEditProjectChange({ ...editProject, status: value })}
          >
            <SelectTrigger className="text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border">
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O projeto "{project.name}" será permanentemente
                  removido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEditModeChange(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => onUpdate(editProject)}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {getStatusBadge(project.status)}
        {getAreaBadge(areaName)}
        {getPriorityBadge(extractPriority(project.description))}
      </div>

      {project.description && (
        <div className="space-y-2">
          <Label className="text-gray-600 text-sm">Informações</Label>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
            {project.description.split('|').map((part, index) => (
              <div key={index} className="py-1">
                {part.trim()}
              </div>
            ))}
          </div>
        </div>
      )}

      {project.client_name && (
        <div className="flex items-center gap-2 text-gray-600">
          <Building2 className="h-4 w-4" />
          <span>Cliente: {project.client_name}</span>
        </div>
      )}

      {(project.start_date || project.end_date) && (
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>
            {project.start_date && `Início: ${dataBR(project.start_date)}`}
            {project.start_date && project.end_date && ' | '}
            {project.end_date && `Fim: ${dataBR(project.end_date)}`}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="border-primary text-primary hover:bg-primary/10"
          onClick={() => onEditModeChange(true)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
        {project.status === 'active' && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-gray-600 hover:bg-gray-50"
              onClick={() => {
                onUpdateStatus(project.id, 'completed');
                onCloseProject();
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Concluir
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-gray-600 hover:bg-gray-50"
              onClick={() => {
                onUpdateStatus(project.id, 'blocked');
                onCloseProject();
              }}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Bloquear
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border text-gray-600 hover:bg-gray-50"
              onClick={() => {
                onUpdateStatus(project.id, 'archived');
                onCloseProject();
              }}
            >
              <Archive className="h-4 w-4 mr-1" />
              Arquivar
            </Button>
          </>
        )}
        {(project.status === 'completed' ||
          project.status === 'blocked' ||
          project.status === 'archived') && (
          <Button
            variant="outline"
            size="sm"
            className="border-border text-gray-600 hover:bg-gray-50"
            onClick={() => {
              onUpdateStatus(project.id, 'active');
              onCloseProject();
            }}
          >
            <Clock className="h-4 w-4 mr-1" />
            Reativar
          </Button>
        )}
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 ml-auto"
          onClick={() => onNavigateSprints(project.id)}
        >
          Ver Sprints
        </Button>
      </div>
    </div>
  );
};
