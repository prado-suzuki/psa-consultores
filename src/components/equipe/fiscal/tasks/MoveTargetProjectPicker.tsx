import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';
import { buildProjectHint, clientName, normalizeSearch } from '@/lib/moveTargetLabels';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';

interface MoveTargetProjectPickerProps {
  /** Projetos elegíveis como destino — os mesmos que a tela lista. */
  projects: OrgProject[];
  /** Tarefas carregadas, para mostrar o volume de cada projeto. */
  tasks: OrgTask[];
  /** OS dos projetos, para distinguir projetos de nome igual. */
  osRows: ProjetosTarefasOs[];
  /** Projeto a esconder da lista (o atual, no movimento de uma tarefa só). */
  excludeProjectId?: string | null;
  value: string;
  onChange: (projectId: string) => void;
}

/**
 * Seletor de projeto de destino compartilhado pelos modais de mover tarefa
 * (avulsa e em lote).
 */
export const MoveTargetProjectPicker = ({
  projects,
  tasks,
  osRows,
  excludeProjectId,
  value,
  onChange,
}: MoveTargetProjectPickerProps) => {
  const [search, setSearch] = useState('');
  const labels = useMemo(() => buildProjectHint(tasks, osRows), [tasks, osRows]);

  const options = useMemo(() => {
    const normalizedSearch = normalizeSearch(search.trim());
    return projects
      .filter(project => project.id !== excludeProjectId)
      .filter(project => !normalizedSearch
        || normalizeSearch(labels.searchable(project)).includes(normalizedSearch))
      .sort((a, b) => {
        const byClient = clientName(a).localeCompare(clientName(b), 'pt-BR');
        if (byClient !== 0) return byClient;
        const byName = a.name.localeCompare(b.name, 'pt-BR');
        return byName !== 0 ? byName : labels.osLabel(a).localeCompare(labels.osLabel(b), 'pt-BR');
      });
  }, [projects, excludeProjectId, search, labels]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Projeto de destino</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar por projeto, cliente ou OS"
          className="pl-9"
        />
      </div>
      {/* Rolagem nativa em vez de <ScrollArea>: o viewport do Radix envolve
          o conteúdo num wrapper `display:table`, que cresce com o texto e
          impede o truncate dos nomes de projeto. */}
      <div className="h-52 overflow-y-auto rounded-lg border p-2">
        {options.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nenhum outro projeto disponível.
          </p>
        ) : (
          <RadioGroup value={value} onValueChange={onChange}>
            {options.map(project => (
              <div key={project.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted">
                <RadioGroupItem value={project.id} id={`move-to-${project.id}`} className="mt-1" />
                <Label htmlFor={`move-to-${project.id}`} className="min-w-0 flex-1 cursor-pointer font-normal">
                  <span className="block truncate font-medium">{project.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {clientName(project)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                    {labels.hint(project)}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>
    </div>
  );
};
