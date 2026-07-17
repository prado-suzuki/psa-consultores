import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AnaliseInteligenteProcess,
  AnaliseInteligenteProject,
  AnaliseInteligenteSprint,
} from '@/lib/analiseInteligente';

interface AnaliseInteligenteFiltersProps {
  allValue: string;
  startDate: string;
  endDate: string;
  sprintFilter: string;
  projectFilter: string;
  processFilter: string;
  categoryFilter: string;
  sprints: AnaliseInteligenteSprint[];
  projects: AnaliseInteligenteProject[];
  processes: AnaliseInteligenteProcess[];
  categoryOptions: string[];
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSprintFilterChange: (value: string) => void;
  onProjectFilterChange: (value: string) => void;
  onProcessFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function AnaliseInteligenteFilters({
  allValue,
  startDate,
  endDate,
  sprintFilter,
  projectFilter,
  processFilter,
  categoryFilter,
  sprints,
  projects,
  processes,
  categoryOptions,
  onStartDateChange,
  onEndDateChange,
  onSprintFilterChange,
  onProjectFilterChange,
  onProcessFilterChange,
  onCategoryFilterChange,
  onClearFilters,
}: AnaliseInteligenteFiltersProps) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Filter className="h-4 w-4 text-teal-600" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Data início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Data fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Sprint</Label>
            <Select value={sprintFilter} onValueChange={onSprintFilterChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>Todas as sprints</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Projeto</Label>
            <Select value={projectFilter} onValueChange={onProjectFilterChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>Todos os projetos</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Processo</Label>
            <Select value={processFilter} onValueChange={onProcessFilterChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>Todos os processos</SelectItem>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Categoria (área)</Label>
            <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>Todas</SelectItem>
                {categoryOptions.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" variant="ghost" onClick={onClearFilters} className="text-slate-500">
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
