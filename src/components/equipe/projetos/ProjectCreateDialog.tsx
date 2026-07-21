import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  createEmptyProjectDraft,
  JUSTIFICATION_TYPES,
  PROJECT_FRONTS,
} from '@/components/equipe/projetos/constants';
import type {
  ExternalClient,
  GroupedEquipe,
  ProjectCluster,
  ProjectDraft,
  TeamMember,
} from '@/components/equipe/projetos/types';
import { SEM_CLUSTER } from '@/lib/clusterFilter';

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterFilter: string;
  clusters: ProjectCluster[];
  externalClients: ExternalClient[];
  teamMembers: TeamMember[];
  groupedEquipes: GroupedEquipe[];
  onCreate: (project: ProjectDraft, onCreated: () => void) => Promise<void>;
}

export const ProjectCreateDialog = ({
  open,
  onOpenChange,
  clusterFilter,
  clusters,
  externalClients,
  teamMembers,
  groupedEquipes,
  onCreate,
}: ProjectCreateDialogProps) => {
  const [project, setProject] = useState<ProjectDraft>(createEmptyProjectDraft);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (nextOpen && clusterFilter && clusterFilter !== SEM_CLUSTER) {
      setProject((current) => ({
        ...current,
        cluster_id: current.cluster_id || clusterFilter,
      }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onCreate(project, () => {
      onOpenChange(false);
      setProject(createEmptyProjectDraft());
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Projeto *</Label>
            <Input
              id="name"
              value={project.name}
              onChange={(event) => setProject({ ...project, name: event.target.value })}
              placeholder="Ex: Sistema de Gestão"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cluster">Cluster *</Label>
            <Select
              value={project.cluster_id}
              onValueChange={(value) => setProject({ ...project, cluster_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cluster" />
              </SelectTrigger>
              <SelectContent>
                {clusters
                  .filter((cluster) => cluster.ativo)
                  .map((cluster) => (
                    <SelectItem key={cluster.id} value={cluster.id}>
                      {cluster.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Obrigatório — define em qual cluster o projeto aparece no MAPA.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="external_client">Cliente PSA</Label>
              <Select
                value={project.external_client_id}
                onValueChange={(value) => setProject({ ...project, external_client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {externalClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leader">Líder Interno</Label>
              <Select
                value={project.leader_id}
                onValueChange={(value) => setProject({ ...project, leader_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o líder" />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="equipe">Equipe responsável</Label>
              <Select
                value={project.equipe_id}
                onValueChange={(value) => setProject({ ...project, equipe_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="product_service">Produto/Serviço</Label>
              <Input
                id="product_service"
                value={project.product_service}
                onChange={(event) =>
                  setProject({ ...project, product_service: event.target.value })
                }
                placeholder="Ex: Auditoria Fiscal, BI"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_front">Frente do Projeto</Label>
            <Select
              value={project.project_front}
              onValueChange={(value) => setProject({ ...project, project_front: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a frente" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_FRONTS.map((front) => (
                  <SelectItem key={front.value} value={front.value}>
                    {front.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Justificativa do Projeto</Label>
            <div className="grid grid-cols-2 gap-2">
              {JUSTIFICATION_TYPES.map((justification) => (
                <div
                  key={justification.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    project.justification_type === justification.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() =>
                    setProject({ ...project, justification_type: justification.value })
                  }
                >
                  <div className="font-medium text-sm">{justification.label}</div>
                  <div className="text-xs text-muted-foreground">{justification.description}</div>
                </div>
              ))}
            </div>
          </div>

          {project.justification_type && (
            <div className="space-y-2">
              <Label htmlFor="justification_detail">Detalhamento da Justificativa</Label>
              <Textarea
                id="justification_detail"
                value={project.justification_detail}
                onChange={(event) =>
                  setProject({ ...project, justification_detail: event.target.value })
                }
                placeholder="Descreva o impacto esperado, métricas, economia estimada..."
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={project.description}
              onChange={(event) => setProject({ ...project, description: event.target.value })}
              placeholder="Descreva o projeto..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Início</Label>
              <Input
                id="start_date"
                type="date"
                value={project.start_date}
                onChange={(event) => setProject({ ...project, start_date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fim</Label>
              <Input
                id="end_date"
                type="date"
                value={project.end_date}
                onChange={(event) => setProject({ ...project, end_date: event.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Criar Projeto
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
