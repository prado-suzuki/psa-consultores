import { CalendarRange, Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusList } from '@/lib/taskStatusColors';
import { AREA_DASHBOARD_ALL, type UrgencyFilter } from '@/lib/areaDashboardData';
import type { AreaDashboardController } from '@/hooks/useAreaDashboardController';

export function AreaDashboardFilters({ dashboard }: { dashboard: AreaDashboardController }) {
  const { filters, setFilter, clearFilters, applyPreset, activeFiltersCount, options } = dashboard;
  return (
    <Card className="border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Filtros Estratégicos
          {activeFiltersCount > 0 && (
            <Badge className="bg-primary/10 text-primary border-0 text-[10px] ml-1">
              {activeFiltersCount} {activeFiltersCount === 1 ? 'ativo' : 'ativos'}
            </Badge>
          )}
        </CardTitle>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary h-8">
            <X className="h-3.5 w-3.5 mr-1" />Limpar tudo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><CalendarRange className="h-3 w-3" />Vencimento de</Label>
            <Input type="date" value={filters.startDate} onChange={event => setFilter('startDate', event.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Vencimento até</Label>
            <Input type="date" value={filters.endDate} onChange={event => setFilter('endDate', event.target.value)} className="h-9 text-sm" />
          </div>
          <FilterSelect label="Urgência" value={filters.urgency} onChange={value => setFilter('urgency', value as UrgencyFilter)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todas</SelectItem>
            <SelectItem value="overdue">🔴 Atrasadas</SelectItem><SelectItem value="next_7">📅 Próximos 7 dias</SelectItem>
            <SelectItem value="next_30">📆 Próximos 30 dias</SelectItem><SelectItem value="no_due">— Sem prazo definido</SelectItem>
          </FilterSelect>
          <FilterSelect label="Status da Tarefa" value={filters.taskStatus} onChange={value => setFilter('taskStatus', value)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todos</SelectItem>
            {statusList.map(status => <SelectItem key={status.key} value={status.key}>{status.label}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Status do Projeto" value={filters.projectStatus} onChange={value => setFilter('projectStatus', value)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todos</SelectItem><SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="on_hold">Pausado</SelectItem><SelectItem value="completed">Concluído</SelectItem>
          </FilterSelect>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect label="Cliente" value={filters.client} onChange={value => setFilter('client', value)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todos os clientes</SelectItem>
            {options.clients.map(client => <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Projeto" value={filters.project} onChange={value => setFilter('project', value)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todos os projetos</SelectItem>
            {options.projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Responsável" value={filters.member} onChange={value => setFilter('member', value)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todos os responsáveis</SelectItem>
            {options.members.map(member => <SelectItem key={member.id} value={member.id}>
              {`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.id.slice(0, 6)}
            </SelectItem>)}
          </FilterSelect>
          <FilterSelect label="Equipe Fiscal" value={filters.equipe} onChange={value => setFilter('equipe', value)}>
            <SelectItem value={AREA_DASHBOARD_ALL}>Todas as equipes</SelectItem>
            {options.equipes.map(equipe => <SelectItem key={equipe.id} value={equipe.id}>{equipe.name}</SelectItem>)}
          </FilterSelect>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Atalhos:</span>
          <PresetButton onClick={() => applyPreset({ urgency: 'overdue' })} className="border-destructive/20 text-destructive hover:bg-destructive/5">Apenas atrasadas</PresetButton>
          <PresetButton onClick={() => applyPreset({ urgency: 'next_7' })} className="border-warning/20 text-warning hover:bg-warning/5">Próximos 7 dias</PresetButton>
          <PresetButton onClick={() => applyPreset({ taskStatus: 'in_progress' })} className="border-info/20 text-info hover:bg-info/5">Em progresso</PresetButton>
          <PresetButton onClick={() => applyPreset({ projectStatus: 'active', taskStatus: 'todo' })} className="border-border text-foreground hover:bg-muted">Backlog ativo</PresetButton>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label>
    <Select value={value} onValueChange={onChange}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select>
  </div>;
}

function PresetButton({ onClick, className, children }: { onClick: () => void; className: string; children: React.ReactNode }) {
  return <Button size="sm" variant="outline" onClick={onClick} className={`h-7 text-[11px] ${className}`}>{children}</Button>;
}
