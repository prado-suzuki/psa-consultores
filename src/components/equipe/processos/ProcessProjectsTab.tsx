import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import type { EquipeProcessoProject, EquipeProcessoProjectLink } from '@/lib/equipeProcessos';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';

export interface NewProjectLink {
  project_id: string;
  impact_type: string;
}

interface ProcessProjectsTabProps {
  projectProcesses: EquipeProcessoProjectLink[];
  availableProjects: EquipeProcessoProject[];
  loading: boolean;
  newProjectLink: NewProjectLink;
  isAddingProjectLink: boolean;
  onNewProjectLinkChange: (link: NewProjectLink) => void;
  onAddProject: () => void;
  onRemoveProject: (linkId: string) => void;
}

export function ProcessProjectsTab(props: ProcessProjectsTabProps) {
  return (
    <TabsContent value="projects" className="mt-0">
      <div className="flex justify-end mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Projeto
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Vincular Projeto</h4>
              <div className="space-y-2">
                <Label className="text-xs">Projeto</Label>
                <Select
                  value={props.newProjectLink.project_id}
                  onValueChange={(value) =>
                    props.onNewProjectLinkChange({ ...props.newProjectLink, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tipo de Impacto</Label>
                <Select
                  value={props.newProjectLink.impact_type}
                  onValueChange={(value) =>
                    props.onNewProjectLinkChange({ ...props.newProjectLink, impact_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="secundario">Secundário</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={props.onAddProject}
                disabled={!props.newProjectLink.project_id || props.isAddingProjectLink}
                className="w-full"
                size="sm"
              >
                {props.isAddingProjectLink ? 'Vinculando...' : 'Vincular'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {props.loading ? (
        <div className="text-center py-8 text-gray-500">Carregando projetos...</div>
      ) : props.projectProcesses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum projeto vinculado. Clique em "Adicionar Projeto" para vincular.
        </div>
      ) : (
        <div className="space-y-3">
          {props.projectProcesses.map((link) => (
            <Card key={link.id} className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{link.projects?.name || 'Projeto não encontrado'}</p>
                    {link.impact_type && (
                      <Badge
                        variant={link.impact_type === 'principal' ? 'default' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {link.impact_type === 'principal'
                          ? 'Principal'
                          : link.impact_type === 'secundario'
                            ? 'Secundário'
                            : 'Suporte'}
                      </Badge>
                    )}
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover o vínculo com o projeto "
                        {link.projects?.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => props.onRemoveProject(link.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
