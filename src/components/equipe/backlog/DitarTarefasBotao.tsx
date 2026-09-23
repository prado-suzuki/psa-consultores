import { useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GerarDemandasDialog } from '@/components/sprint/GerarDemandasDialog';

interface DitarTarefasBotaoProps {
  projects: { id: string; name: string }[];
  processes: { id: string; name: string; project_id?: string | null }[];
  projectProcesses: { process_id: string; project_id: string }[];
}

/** "Ditar tarefas" do backlog: a IA organiza o que foi falado e a lista volta para revisão. */
export function DitarTarefasBotao({ projects, processes, projectProcesses }: DitarTarefasBotaoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Mic className="h-4 w-4 mr-2" /> Ditar tarefas
      </Button>
      {/* A lista do backlog se atualiza pela invalidação em useCriarDemandasBacklog. */}
      <GerarDemandasDialog
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        processes={processes}
        projectProcesses={projectProcesses}
        onSaved={() => undefined}
        modo="ditado"
      />
    </>
  );
}
