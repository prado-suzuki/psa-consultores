import { Clock, ListTodo, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPriorityBadge } from '@/components/equipe/projetos/projectPresentation';
import type { BacklogTask } from '@/components/equipe/projetos/types';

interface ProjectBacklogTabProps {
  tasks: BacklogTask[];
  loading: boolean;
  onCreateItem: () => void;
}

export const ProjectBacklogTab = ({ tasks, loading, onCreateItem }: ProjectBacklogTabProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">Itens do backlog vinculados a este projeto</p>
      <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={onCreateItem}>
        <Plus className="h-4 w-4 mr-1" />
        Novo Item
      </Button>
    </div>

    {loading ? (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    ) : tasks.length > 0 ? (
      <div className="space-y-2">
        {tasks.map((task) => (
          <Card key={task.id} className="bg-muted border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-500 truncate">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {getPriorityBadge(task.priority)}
                  {task.estimated_hours && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {task.estimated_hours}h
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    ) : (
      <div className="text-center py-8">
        <ListTodo className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <h4 className="text-gray-900 font-medium mb-1">Backlog vazio</h4>
        <p className="text-sm text-gray-500">Nenhum item de backlog vinculado a este projeto</p>
      </div>
    )}
  </div>
);
