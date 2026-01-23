import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Workflow, CheckCircle2, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  estimated_hours: number;
  project?: { name: string; code?: string };
  process?: { name: string; code?: string };
}

export function GroupedTasks({ tasks }: { tasks: Task[] }) {
  const grouped = new Map<string, { projectName: string; processName: string; tasks: Task[] }>();

  tasks.forEach(task => {
    const key = `${task.project?.name || 'Sem Projeto'}-${task.process?.name || 'Sem Processo'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        projectName: task.project?.name || 'Sem Projeto',
        processName: task.process?.name || 'Sem Processo',
        tasks: []
      });
    }
    grouped.get(key)!.tasks.push(task);
  });

  return (
    <div className="space-y-4">
      {Array.from(grouped.values()).map((group, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span>{group.projectName}</span>
              <span className="text-muted-foreground">-</span>
              <Workflow className="h-4 w-4 text-muted-foreground" />
              <span>{group.processName}</span>
              <Badge variant="secondary" className="ml-auto">{group.tasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {group.tasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 py-1 text-sm">
                {task.status === 'concluido' 
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <Clock className="h-4 w-4 text-yellow-600" />
                }
                <span className="flex-1">{task.title}: {task.description}</span>
                <span className="text-muted-foreground">{task.estimated_hours}h</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
