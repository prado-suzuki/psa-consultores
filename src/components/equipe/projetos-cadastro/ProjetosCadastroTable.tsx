import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronDown, ChevronRight, Crown, Pencil, Trash2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OrgProject } from '@/hooks/useOrgProjects';
import { parseDate } from '@/lib/dateUtils';
import type { ProjectSortColumn } from '@/lib/projetosCadastro';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge className="bg-success/10 text-success">Ativo</Badge>;
  if (status === 'completed') return <Badge className="bg-info/10 text-info">Concluído</Badge>;
  if (status === 'on_hold') return <Badge className="bg-warning/10 text-warning">Pausado</Badge>;
  if (status === 'cancelled') return <Badge className="bg-destructive/10 text-destructive">Cancelado</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function SortIcon({ column }: { column: ProjectSortColumn }) {
  const { sortColumn, sortDirection } = useProjetosCadastro();
  if (sortColumn !== column) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
  return sortDirection === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />;
}

function ProjectsTableHeader() {
  const { handleSort } = useProjetosCadastro();
  const sortable = (label: string, column: ProjectSortColumn, width: string) => (
    <TableHead style={{ width }} className="cursor-pointer select-none" onClick={() => handleSort(column)}>
      <div className="flex items-center">{label}<SortIcon column={column} /></div>
    </TableHead>
  );
  return (
    <TableHeader><TableRow>
      {sortable('Projeto', 'name', '18%')}{sortable('Produto', 'produto', '14%')}{sortable('Serviço', 'servico', '12%')}
      {sortable('Cliente', 'cliente', '11%')}{sortable('Equipe', 'equipe', '8%')}{sortable('Pessoas', 'pessoas', '9%')}
      {sortable('Status', 'status', '7%')}
      <TableHead style={{ width: '7%' }} className="whitespace-nowrap">Início</TableHead>
      <TableHead style={{ width: '7%' }} className="whitespace-nowrap">Término</TableHead>
      <TableHead style={{ width: '6%' }} className="whitespace-nowrap text-right">Hrs Contr.</TableHead>
      <TableHead style={{ width: '6%' }} className="text-right">Ações</TableHead>
    </TableRow></TableHeader>
  );
}

function ProjectRow({ project }: { project: OrgProject }) {
  const { listingOsProdutosByOs, handleOpenModal, setDeleteProjectId } = useProjetosCadastro();
  const executorName = project.responsible ? `${project.responsible.first_name} ${project.responsible.last_name}` : null;
  const leaderName = project.leader ? `${project.leader.first_name} ${project.leader.last_name}` : null;
  const products = project.ordem_servico_id ? (listingOsProdutosByOs[project.ordem_servico_id] || []) : [];
  const totalHours = products.reduce((sum, product) => sum + (product.horas_contratadas ?? 0), 0);
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal(project)}>
      <TableCell className="whitespace-normal break-words"><span className="font-medium">{project.name}</span></TableCell>
      <TableCell className="whitespace-normal break-words"><span className="text-sm">{project.servico_contratado || '-'}</span></TableCell>
      <TableCell className="whitespace-normal break-words"><span className="text-sm">{project.servico_nome || '-'}</span></TableCell>
      <TableCell className="truncate max-w-0" title={project.external_client?.nome || '-'}>
        {project.external_client ? <div className="flex items-center gap-1.5 truncate"><Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="text-sm truncate">{project.external_client.nome}</span></div> : <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap"><span className="text-sm">{project.equipe_ref?.name || '-'}</span></TableCell>
      <TableCell title={[executorName ? `${executorName} (executor)` : null, leaderName ? `${leaderName} (líder)` : null].filter(Boolean).join(' / ')}>
        <div className="space-y-0.5">
          {executorName && project.responsible && <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3 shrink-0 text-muted-foreground" /><span className="truncate">{`${project.responsible.first_name} ${project.responsible.last_name.charAt(0)}.`}</span></div>}
          {leaderName && leaderName !== executorName && project.leader && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Crown className="h-3 w-3 shrink-0" /><span className="truncate">{`${project.leader.first_name} ${project.leader.last_name.charAt(0)}.`}</span></div>}
          {!executorName && !leaderName && <span className="text-muted-foreground">-</span>}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap"><StatusBadge status={project.status} /></TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{project.start_date ? format(parseDate(project.start_date), 'dd/MM/yy') : '-'}</TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{project.end_date ? format(parseDate(project.end_date), 'dd/MM/yy') : '-'}</TableCell>
      <TableCell className="text-sm text-right text-muted-foreground whitespace-nowrap">{totalHours > 0 ? `${totalHours}h` : '-'}</TableCell>
      <TableCell className="text-right" onClick={event => event.stopPropagation()}><div className="flex justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(project)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteProjectId(project.id)}><Trash2 className="h-4 w-4" /></Button>
      </div></TableCell>
    </TableRow>
  );
}

function EmptyRow() {
  const { isLoading, hasActiveFilters } = useProjetosCadastro();
  return <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
    {isLoading ? 'Carregando projetos...' : hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto cadastrado.'}
  </TableCell></TableRow>;
}

function ProjectTable({ projects, className }: { projects: OrgProject[]; className?: string }) {
  const { isLoading } = useProjetosCadastro();
  return <Card className={className}><CardContent className="p-0 overflow-x-auto"><Table className="table-fixed min-w-[1000px]">
    <ProjectsTableHeader /><TableBody>{isLoading || projects.length === 0 ? <EmptyRow /> : projects.map(project => <ProjectRow key={project.id} project={project} />)}</TableBody>
  </Table></CardContent></Card>;
}

export function ProjetosCadastroTable() {
  const { groupedProjects, filteredProjects, isLoading, hasActiveFilters, collapsedGroups, toggleGroup } = useProjetosCadastro();
  if (!groupedProjects) return <ProjectTable projects={filteredProjects} />;
  if (isLoading || groupedProjects.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">
    {isLoading ? 'Carregando projetos...' : hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto cadastrado.'}
  </CardContent></Card>;
  return <div className="space-y-4">{groupedProjects.map(group => {
    const collapsed = collapsedGroups.has(group.label);
    const completed = group.projects.filter(project => project.status === 'completed').length;
    const percentage = group.projects.length ? Math.round((completed / group.projects.length) * 100) : 0;
    return <div key={group.label}>
      <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none hover:bg-muted/80 transition-colors" onClick={() => toggleGroup(group.label)}>
        {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="font-semibold text-sm">{group.label}</span><Badge variant="secondary" className="text-xs">{group.projects.length} {group.projects.length === 1 ? 'projeto' : 'projetos'}</Badge>
        <div className="flex items-center gap-2 ml-auto"><span className="text-xs text-muted-foreground">{percentage}%</span><Progress value={percentage} className="h-1.5 w-24" /></div>
      </div>
      {!collapsed && <ProjectTable projects={group.projects} className="mt-1 border-t-0 rounded-t-none" />}
    </div>;
  })}</div>;
}
