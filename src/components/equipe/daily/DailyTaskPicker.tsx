import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { groupDailyTasksByParent } from '@/lib/equipeDaily';
import type { DailySprintTask } from '@/hooks/useDailySprintTasks';

interface DailyTaskPickerProps {
  tasks: DailySprintTask[];
  onPick: (task: DailySprintTask) => void;
}

/**
 * Insere uma tarefa no texto da daily sem redigitar. Lista compacta com busca,
 * agrupada por tarefa-mãe (mesmo mental model do Kanban). Concluídas ficam
 * riscadas e por último. Abre só quando a pessoa quer inserir — nada de paredão.
 */
export function DailyTaskPicker({ tasks, onPick }: DailyTaskPickerProps) {
  const [open, setOpen] = useState(false);
  const groups = groupDailyTasksByParent(tasks);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 text-muted-foreground">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Inserir tarefa
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar tarefa..." />
          <CommandList>
            <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
            {groups.map((group, index) => (
              <CommandGroup key={group.header ?? '__avulsas__'} heading={group.header ?? (index === 0 ? undefined : 'Avulsas')}>
                {group.tasks.map((task) => {
                  const done = task.status === 'completed';
                  return (
                    <CommandItem
                      key={task.id}
                      value={`${task.task_code ?? ''} ${task.title}`}
                      onSelect={() => {
                        onPick(task);
                        setOpen(false);
                      }}
                      className={cn(done && 'text-muted-foreground/70 line-through')}
                    >
                      {task.task_code && <span className="text-muted-foreground/70 mr-1">{task.task_code}</span>}
                      {task.title}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
