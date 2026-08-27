import { AlertTriangle, ArrowLeft, CalendarClock, Clock, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function SprintHeaderFilters({
  controller: c,
}: {
  controller: EquipeSprintDetalhesController;
}) {
  if (!c.sprint) return null;
  return (
    <>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => c.navigate('/equipe/sprints')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={c.filterDate === 'today' ? 'default' : 'outline'}
            onClick={() => c.setFilterDate(c.filterDate === 'today' ? 'all' : 'today')}
            className={
              c.filterDate === 'today' ? '' : 'border-amber-300 text-amber-700 hover:bg-amber-50'
            }
          >
            <Clock className="h-3 w-3 mr-1" />
            Hoje ({c.sprintRisks.dueToday.length})
          </Button>
          <Button
            size="sm"
            variant={c.filterDate === 'tomorrow' ? 'default' : 'outline'}
            onClick={() => c.setFilterDate(c.filterDate === 'tomorrow' ? 'all' : 'tomorrow')}
            className={
              c.filterDate === 'tomorrow'
                ? ''
                : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
            }
          >
            <CalendarClock className="h-3 w-3 mr-1" />
            Amanhã ({c.sprintRisks.dueTomorrow.length})
          </Button>
          <Button
            size="sm"
            variant={c.filterDate === 'overdue' ? 'default' : 'outline'}
            onClick={() => c.setFilterDate(c.filterDate === 'overdue' ? 'all' : 'overdue')}
            className={
              c.filterDate === 'overdue' ? '' : 'border-red-300 text-red-700 hover:bg-red-50'
            }
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Atrasados ({c.sprintRisks.overdue.length})
          </Button>
          <Badge
            className={
              c.sprint.status === 'active'
                ? 'bg-primary/10 text-primary border-primary/20'
                : c.sprint.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
            }
          >
            {c.sprint.status === 'active'
              ? 'Ativa'
              : c.sprint.status === 'completed'
                ? 'Concluída'
                : c.sprint.status === 'planned'
                  ? 'Planejada'
                  : c.sprint.status}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={c.filterResponsible} onValueChange={c.setFilterResponsible}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {c.uniqueResponsibles.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={c.filterStatus} onValueChange={c.setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={c.filterYear} onValueChange={c.changeYear}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Ano</SelectItem>
            {c.availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={c.filterMonth} onValueChange={c.setFilterMonth}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Mês</SelectItem>
            {c.availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {MONTHS[Number(month)]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={c.filterMetricsPerson} onValueChange={c.setFilterMetricsPerson}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Pessoa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Pessoa</SelectItem>
            {c.availableMetricsPeople.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {c.hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={c.clearFilters} className="text-gray-500">
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
        {c.hasActiveFilters && (
          <span className="text-sm text-gray-500 ml-auto">
            {c.filteredDeliverables.length} de {c.deliverables.length} entregáveis
          </span>
        )}
      </div>
    </>
  );
}
