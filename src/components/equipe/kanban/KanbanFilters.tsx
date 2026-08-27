import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  EquipeKanbanProcess,
  EquipeKanbanProfile,
  EquipeKanbanProject,
  EquipeKanbanSprint,
} from '@/lib/equipeKanban';

interface KanbanFiltersProps {
  sprints: EquipeKanbanSprint[];
  profiles: EquipeKanbanProfile[];
  projects: EquipeKanbanProject[];
  processes: EquipeKanbanProcess[];
  filterSprint: string;
  filterResponsible: string;
  filterProject: string;
  filterProcess: string;
  filterStartDate: Date | undefined;
  filterEndDate: Date | undefined;
  hasActiveFilters: boolean;
  mainTaskCount: number;
  totalTaskCount: number;
  hiddenCount: number;
  nestedOpenCount: number;
  onSprintChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onProcessChange: (value: string) => void;
  onStartDateChange: (value: Date | undefined) => void;
  onEndDateChange: (value: Date | undefined) => void;
  onClear: () => void;
}

export function KanbanFilters(props: KanbanFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filtros</span>
        {props.hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onClear}
            className="ml-auto text-gray-500 hover:text-gray-700 h-7"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={props.filterSprint} onValueChange={props.onSprintChange}>
          <SelectTrigger className="w-40 text-gray-900 h-9">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent className="border-gray-200">
            <SelectItem value="all">Todas Sprints</SelectItem>
            {props.sprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={props.filterResponsible} onValueChange={props.onResponsibleChange}>
          <SelectTrigger className="w-44 text-gray-900 h-9">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent className="border-gray-200">
            <SelectItem value="all">Todos Responsáveis</SelectItem>
            {props.profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.first_name} {profile.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={props.filterProject} onValueChange={props.onProjectChange}>
          <SelectTrigger className="w-44 text-gray-900 h-9">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent className="border-gray-200">
            <SelectItem value="all">Todos Projetos</SelectItem>
            {props.projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={props.filterProcess} onValueChange={props.onProcessChange}>
          <SelectTrigger className="w-44 text-gray-900 h-9">
            <SelectValue placeholder="Processo" />
          </SelectTrigger>
          <SelectContent className="border-gray-200">
            <SelectItem value="all">Todos Processos</SelectItem>
            {props.processes.map((process) => (
              <SelectItem key={process.id} value={process.id}>
                {process.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 px-3 border-gray-300 bg-white',
                props.filterStartDate && 'text-gray-900',
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
              {props.filterStartDate
                ? format(props.filterStartDate, 'dd/MM/yyyy', { locale: ptBR })
                : 'Data Início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar selected={props.filterStartDate} onSelect={props.onStartDateChange} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 px-3 border-gray-300 bg-white',
                props.filterEndDate && 'text-gray-900',
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
              {props.filterEndDate
                ? format(props.filterEndDate, 'dd/MM/yyyy', { locale: ptBR })
                : 'Data Fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar selected={props.filterEndDate} onSelect={props.onEndDateChange} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        {props.mainTaskCount} tarefas principais ({props.totalTaskCount} total incluindo subtarefas)
        {props.hiddenCount > 0 && (
          <span className="ml-2 font-medium text-amber-600">
            · {props.hiddenCount} subtarefa(s) aninhada(s) em tarefa-mãe fora da visão — não exibida(s) como card
          </span>
        )}
        {props.nestedOpenCount > 0 && (
          <span className="ml-2 font-medium text-amber-600">
            · {props.nestedOpenCount} tarefa(s) aberta(s) estão dentro de tarefas-mãe em progresso ou
            concluídas — aparecem aninhadas na coluna da mãe, não em "A Fazer"
          </span>
        )}
      </div>
    </div>
  );
}
