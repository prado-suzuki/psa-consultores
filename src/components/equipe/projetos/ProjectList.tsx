import { Building2, Calendar, Eye, FolderKanban, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  extractPhase,
  extractPriority,
  getPriorityBadge,
  getStatusBadge,
} from '@/components/equipe/projetos/projectPresentation';
import type { Project, ProjectCluster } from '@/components/equipe/projetos/types';

interface ProjectListProps {
  projects: Project[];
  filteredProjects: Project[];
  clusters: ProjectCluster[];
  loading: boolean;
  viewMode: 'cards' | 'table';
  onSelectProject: (project: Project, editMode: boolean) => void;
  onCreateProject: () => void;
}

export const ProjectList = ({
  projects,
  filteredProjects,
  clusters,
  loading,
  viewMode,
  onSelectProject,
  onCreateProject,
}: ProjectListProps) => {
  const getClusterName = (project: Project) =>
    clusters.find((cluster) => cluster.id === project.cluster_id)?.nome || '—';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <Card className="bg-white border-gray-200">
        <CardContent className="py-16 text-center">
          <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {projects.length === 0 ? 'Nenhum projeto criado' : 'Nenhum projeto encontrado'}
          </h3>
          <p className="text-gray-500 mb-4">
            {projects.length === 0
              ? 'Crie seu primeiro projeto para começar a organizar o trabalho'
              : 'Tente ajustar os filtros para ver mais resultados'}
          </p>
          {projects.length === 0 && (
            <Button className="bg-primary hover:bg-primary/90" onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Projeto
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {viewMode === 'table' && (
        <Card className="bg-white border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200">
                <TableHead className="text-gray-600">Nome</TableHead>
                <TableHead className="text-gray-600">Status</TableHead>
                <TableHead className="text-gray-600">Prioridade</TableHead>
                <TableHead className="text-gray-600">Fase</TableHead>
                <TableHead className="text-gray-600">Cluster</TableHead>
                <TableHead className="text-gray-600 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow
                  key={project.id}
                  className="border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectProject(project, false)}
                >
                  <TableCell className="font-medium text-gray-900">{project.name}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell>{getPriorityBadge(extractPriority(project.description))}</TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {extractPhase(project.description)}
                  </TableCell>
                  <TableCell className="text-gray-600">{getClusterName(project)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectProject(project, true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectProject(project, false);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {viewMode === 'cards' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectProject(project, false)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    <CardTitle className="text-gray-900 text-lg line-clamp-1">
                      {project.name}
                    </CardTitle>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(extractPriority(project.description))}
                </div>

                {project.client_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Building2 className="h-4 w-4" />
                    <span>{project.client_name}</span>
                  </div>
                )}

                {(project.start_date || project.end_date) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {project.start_date &&
                        new Date(project.start_date).toLocaleDateString('pt-BR')}
                      {project.start_date && project.end_date && ' - '}
                      {project.end_date && new Date(project.end_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectProject(project, true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};
